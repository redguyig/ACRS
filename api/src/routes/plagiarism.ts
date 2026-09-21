import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const runPlagiarismSchema = z.object({
  assignment_id: z.string().min(1),
});

router.post('/run', authenticate, requireRole('faculty'), validate(runPlagiarismSchema), async (req: AuthRequest, res: Response) => {
  const { assignment_id } = req.body;

  const assignment = await prisma.assignment.findUnique({ where: { id: assignment_id } });
  if (!assignment) {
    throw new AppError('Assignment not found', 404);
  }


  const existingJob = await prisma.jobQueue.findFirst({
    where: { type: 'plagiarism', payload: { contains: `"assignmentId":"${assignment_id}"` }, status: { in: ['pending', 'running'] } },
  });

  if (existingJob) {
    return res.status(202).json({ jobId: existingJob.id, status: existingJob.status, message: 'Check already in progress' });
  }

  const job = await prisma.jobQueue.create({
    data: {
      type: 'plagiarism',
      payload: JSON.stringify({ assignmentId: assignment_id }),
      status: 'pending',
    },
  });

  // Process asynchronously
  processPlagiarismJob(job.id).catch(console.error);

  res.status(202).json({ jobId: job.id, status: 'queued', message: 'Plagiarism check queued' });
});

router.get('/status/:assignmentId', authenticate, requireRole('faculty'), async (req: AuthRequest, res: Response) => {
  const job = await prisma.jobQueue.findFirst({
    where: { type: 'plagiarism', payload: { contains: `"assignmentId":"${req.params.assignmentId}"` } },
    orderBy: { createdAt: 'desc' },
  });

  if (!job) {
    return res.json({ status: 'not_started' });
  }

  res.json({
    jobId: job.id,
    status: job.status,
    result: job.result ? JSON.parse(job.result) : null,
    error: job.error,
  });
});

router.get('/:assignmentId', authenticate, requireRole('faculty'), async (req: AuthRequest, res: Response) => {
  const results = await prisma.plagiarism.findMany({
    where: { assignmentId: req.params.assignmentId },
    include: {
      studentA: { select: { id: true, name: true, email: true } },
      studentB: { select: { id: true, name: true, email: true } },
    },
    orderBy: { similarityPct: 'desc' },
  });

  const assignment = await prisma.assignment.findUnique({ where: { id: req.params.assignmentId } });
  const isAnonymous = assignment?.anonymous;

  res.json({
    data: results.map(r => ({
      ...r,
      studentA: isAnonymous ? { id: r.studentAId, name: 'Anonymous', email: 'hidden@anonymous' } : r.studentA,
      studentB: isAnonymous ? { id: r.studentBId, name: 'Anonymous', email: 'hidden@anonymous' } : r.studentB,
    })),
  });
});

router.patch('/:id/status', authenticate, requireRole('faculty'), async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  if (!['reviewed', 'escalated'].includes(status)) {
    throw new AppError('Invalid status', 400);
  }

  const updated = await prisma.plagiarism.update({
    where: { id: req.params.id },
    data: { status },
  });

  res.json(updated);
});

async function processPlagiarismJob(jobId: string) {
  const job = await prisma.jobQueue.findUnique({ where: { id: jobId } });
  if (!job) return;

  await prisma.jobQueue.update({ where: { id: jobId }, data: { status: 'running', startedAt: new Date() } });

  try {
    const { assignmentId } = JSON.parse(job.payload) as { assignmentId: string };
    const submissions = await prisma.submission.findMany({
      where: { assignmentId },
      include: { student: true },
    });

    if (submissions.length < 2) {
      await prisma.jobQueue.update({
        where: { id: jobId },
        data: { status: 'completed', result: JSON.stringify({ message: 'Not enough submissions', pairs: [] }), completedAt: new Date() },
      });
      return;
    }

    // Simulate Moss check - in production, call the moss-worker microservice
    const pairs = [];
    for (let i = 0; i < submissions.length; i++) {
      for (let j = i + 1; j < submissions.length; j++) {
        const similarity = calculateSimilarity(submissions[i].codeContent, submissions[j].codeContent);
        if (similarity >= 30) { // Only store pairs above 30%
          pairs.push({
            assignmentId,
            studentAId: submissions[i].studentId,
            studentBId: submissions[j].studentId,
            similarityPct: similarity,
            status: 'flagged' as const,
            mossReportUrl: null,
          });
        }
      }
    }

    if (pairs.length > 0) {
      await prisma.plagiarism.createMany({ data: pairs });
    }

    await prisma.jobQueue.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        result: JSON.stringify({ pairsFound: pairs.length, threshold: 70 }),
        completedAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.jobQueue.update({
      where: { id: jobId },
      data: { status: 'failed', error: error instanceof Error ? error.message : 'Unknown error', completedAt: new Date() },
    });
  }
}

function calculateSimilarity(codeA: string, codeB: string): number {
  // Simple similarity for demo - in production, use Moss
  const normalize = (code: string) => code.replace(/\s+/g, ' ').toLowerCase().trim();
  const a = normalize(codeA);
  const b = normalize(codeB);
  
  if (a === b) return 100;
  if (a.length === 0 || b.length === 0) return 0;
  
  // Simple Jaccard similarity on n-grams
  const n = 3;
  const getNGrams = (str: string) => {
    const grams = new Set<string>();
    for (let i = 0; i <= str.length - n; i++) {
      grams.add(str.slice(i, i + n));
    }
    return grams;
  };
  
  const gramsA = getNGrams(a);
  const gramsB = getNGrams(b);
  const intersection = new Set([...gramsA].filter(x => gramsB.has(x)));
  const union = new Set([...gramsA, ...gramsB]);
  
  return Math.round((intersection.size / union.size) * 100);
}

export default router;