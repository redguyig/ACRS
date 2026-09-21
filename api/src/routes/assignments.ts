import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const createAssignmentSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  language: z.enum(['cpp', 'python', 'javascript', 'java']),
  deadline: z.string().datetime(),
  rubric: z.array(z.object({
    criterion: z.string(),
    maxScore: z.number().int().positive(),
  })).min(1),
  anonymous: z.boolean().default(false),
  courseId: z.string().min(1),
});

const updateAssignmentSchema = createAssignmentSchema.partial();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { courseId, role, userId } = req.user!;

  const where: any = { courseId };
  if (role === 'student') {
    where.deadline = { gte: new Date() };
  }

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      submissions: role === 'student' ? { where: { studentId: userId } } : true,
      _count: { select: { submissions: true } },
    },
    orderBy: { deadline: 'asc' },
  });

  const assignmentsWithStatus = assignments.map(a => {
    let status: 'pending' | 'submitted' | 'reviewed' = 'pending';
    const submission = a.submissions[0];
    if (submission) {
      status = submission.status;
    }
    const isOverdue = new Date(a.deadline) < new Date() && status !== 'reviewed';
    return {
      ...a,
      rubric: JSON.parse(a.rubricJson),
      status,
      isOverdue,
      submissionCount: a._count.submissions,
    };
  });

  res.json({ data: assignmentsWithStatus });
});

router.post('/', authenticate, requireRole('faculty'), validate(createAssignmentSchema), async (req: AuthRequest, res: Response) => {
  const { title, description, language, deadline, rubric, anonymous, courseId } = req.body;

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    throw new AppError('Course not found', 404);
  }

  const assignment = await prisma.assignment.create({
    data: {
      title,
      description,
      language,
      deadline: new Date(deadline),
      rubricJson: JSON.stringify(rubric),
      anonymous,
      createdBy: req.user!.userId,
      courseId,
    },
  });

  res.status(201).json({ ...assignment, rubric: JSON.parse(assignment.rubricJson) });
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const assignment = await prisma.assignment.findUnique({
    where: { id: req.params.id },
    include: {
      course: true,
      submissions: req.user!.role === 'student' ? { where: { studentId: req.user!.userId } } : { include: { student: { select: { id: true, name: true, email: true } } } },
    },
  });

  if (!assignment) {
    throw new AppError('Assignment not found', 404);
  }

  if (req.user!.role === 'student' && assignment.courseId !== req.user!.courseId) {
    throw new AppError('Access denied', 403);
  }

  let status: 'pending' | 'submitted' | 'reviewed' = 'pending';
  const submission = assignment.submissions[0];
  if (submission) {
    status = submission.status;
  }

  res.json({
    ...assignment,
    rubric: JSON.parse(assignment.rubricJson),
    status,
    isOverdue: new Date(assignment.deadline) < new Date() && status !== 'reviewed',
  });
});

router.patch('/:id', authenticate, requireRole('faculty'), validate(updateAssignmentSchema), async (req: AuthRequest, res: Response) => {
  const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id } });
  if (!assignment) {
    throw new AppError('Assignment not found', 404);
  }

  if (new Date(assignment.deadline) < new Date()) {
    throw new AppError('Cannot modify assignment after deadline', 400);
  }

  const { deadline, rubric, ...rest } = req.body;
  const updated = await prisma.assignment.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(deadline && { deadline: new Date(deadline) }),
      ...(rubric && { rubricJson: JSON.stringify(rubric) }),
    },
  });

  res.json({ ...updated, rubric: JSON.parse(updated.rubricJson) });
});

router.get('/:id/submissions', authenticate, requireRole('faculty', 'admin'), async (req: AuthRequest, res: Response) => {
  const submissions = await prisma.submission.findMany({
    where: { assignmentId: req.params.id },
    include: {
      student: { select: { id: true, name: true, email: true } },
      comments: true,
      rubricScores: true,
      feedback: true,
    },
    orderBy: { submittedAt: 'asc' },
  });

  const assignment = await prisma.assignment.findUnique({ where: { id: req.params.id } });
  const isAnonymous = assignment?.anonymous;

  res.json({
    data: submissions.map(s => ({
      ...s,
      student: isAnonymous ? { id: s.studentId, name: 'Anonymous', email: 'hidden@anonymous' } : s.student,
    })),
  });
});

export default router;