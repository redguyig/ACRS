import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import multer from 'multer';
import AdmZip from 'adm-zip';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 }, // 100 KB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.txt', '.cpp', '.py', '.js', '.java', '.zip', '.c', '.h', '.hpp'];
    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('File type not allowed'));
  },
});

const submitSchema = z.object({
  assignmentId: z.string().uuid(),
  code: z.string().min(1),
  language: z.string().min(1),
});

const rubricScoreSchema = z.object({
  rubricScores: z.array(z.object({
    criterion: z.string(),
    maxScore: z.number().int().positive(),
    awardedScore: z.number().int().min(0),
  })).min(1),
});

const publishSchema = z.object({
  rubricScores: z.array(z.object({
    criterion: z.string(),
    maxScore: z.number().int().positive(),
    awardedScore: z.number().int().min(0),
  })).min(1),
  generalComment: z.string().optional(),
});

async function extractCodeFromFile(file: Express.Multer.File): Promise<string> {
  const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
  
  if (ext === '.zip') {
    const zip = new AdmZip(file.buffer);
    const entries = zip.getEntries();
    const codeFiles = entries.filter(e => 
      ['.cpp', '.py', '.js', '.java', '.c', '.h', '.hpp', '.txt'].some(ext => 
        e.entryName.toLowerCase().endsWith(ext)
      ) && !e.isDirectory
    );
    
    if (codeFiles.length === 0) {
      throw new AppError('No valid code file found in zip', 400);
    }
    
    return codeFiles[0].getData().toString('utf-8');
  }
  
  return file.buffer.toString('utf-8');
}

router.post('/', authenticate, requireRole('student'), upload.single('file'), async (req: AuthRequest, res: Response) => {
  let code = req.body.code;
  const assignmentId = req.body.assignmentId;
  const language = req.body.language;

  if (!assignmentId || !language) {
    throw new AppError('assignmentId and language are required', 400);
  }

  if (req.file) {
    code = await extractCodeFromFile(req.file);
  }

  if (!code || code.trim().length === 0) {
    throw new AppError('Code cannot be empty', 400);
  }

  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) {
    throw new AppError('Assignment not found', 404);
  }

  if (new Date() > assignment.deadline) {
    throw new AppError('Submission deadline has passed', 400);
  }

  if (assignment.courseId !== req.user!.courseId) {
    throw new AppError('Not enrolled in this course', 403);
  }

  const existingSubmission = await prisma.submission.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId: req.user!.userId } },
  });

  const submission = await prisma.submission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: req.user!.userId } },
    create: {
      assignmentId,
      studentId: req.user!.userId,
      codeContent: code,
      language,
      status: 'submitted',
    },
    update: {
      codeContent: code,
      language,
      status: 'submitted',
      submittedAt: new Date(),
    },
  });

  if (existingSubmission) {
    await prisma.comment.deleteMany({ where: { submissionId: submission.id } });
    await prisma.rubricScore.deleteMany({ where: { submissionId: submission.id } });
  }

  await prisma.rubricScore.createMany({
    data: JSON.parse(assignment.rubricJson).map((r: any) => ({
      submissionId: submission.id,
      criterion: r.criterion,
      maxScore: r.maxScore,
      awardedScore: null,
    })),
  });

  res.status(201).json({ ...submission, rubric: JSON.parse(assignment.rubricJson) });
});

router.get('/:id', authenticate, requireRole('faculty', 'admin'), async (req: AuthRequest, res: Response) => {
  const submission = await prisma.submission.findUnique({
    where: { id: req.params.id },
    include: {
      assignment: { include: { course: true } },
      student: { select: { id: true, name: true, email: true } },
      comments: { include: { faculty: { select: { id: true, name: true } } }, orderBy: { lineNumber: 'asc' } },
      rubricScores: true,
      feedback: true,
    },
  });

  if (!submission) {
    throw new AppError('Submission not found', 404);
  }

  res.json({ ...submission, assignment: { ...submission.assignment, rubric: JSON.parse(submission.assignment.rubricJson) } });
});

router.patch('/:id/rubric', authenticate, requireRole('faculty'), validate(rubricScoreSchema), async (req: AuthRequest, res: Response) => {
  const { rubricScores } = req.body;

  await prisma.$transaction(
    rubricScores.map(rs => 
      prisma.rubricScore.upsert({
        where: { id: `${req.params.id}-${rs.criterion}` },
        create: {
          id: `${req.params.id}-${rs.criterion}`,
          submissionId: req.params.id,
          criterion: rs.criterion,
          maxScore: rs.maxScore,
          awardedScore: rs.awardedScore,
        },
        update: { awardedScore: rs.awardedScore },
      })
    )
  );

  const updated = await prisma.rubricScore.findMany({ where: { submissionId: req.params.id } });
  res.json({ rubricScores: updated });
});

router.patch('/:id/publish', authenticate, requireRole('faculty'), validate(publishSchema), async (req: AuthRequest, res: Response) => {
  const { rubricScores, generalComment } = req.body;

  const submission = await prisma.submission.findUnique({
    where: { id: req.params.id },
    include: { assignment: true, rubricScores: true },
  });

  if (!submission) {
    throw new AppError('Submission not found', 404);
  }

  if (submission.status === 'reviewed') {
    throw new AppError('Already published', 400);
  }

  const totalGrade = rubricScores.reduce((sum: number, rs: any) => sum + rs.awardedScore, 0);

  await prisma.$transaction(async (tx) => {
    await tx.rubricScore.deleteMany({ where: { submissionId: req.params.id } });
    await tx.rubricScore.createMany({
      data: rubricScores.map((rs: any) => ({
        submissionId: req.params.id,
        criterion: rs.criterion,
        maxScore: rs.maxScore,
        awardedScore: rs.awardedScore,
      })),
    });

    await tx.feedback.create({
      data: {
        submissionId: req.params.id,
        generalComment,
        totalGrade,
      },
    });

    await tx.submission.update({
      where: { id: req.params.id },
      data: { status: 'reviewed' },
    });
  });

  res.json({ message: 'Feedback published successfully', totalGrade });
});

export default router;