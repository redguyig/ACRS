import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const createCommentSchema = z.object({
  submissionId: z.string().uuid(),
  lineNumber: z.number().int().positive(),
  content: z.string().min(1),
});

const updateCommentSchema = z.object({
  content: z.string().min(1),
});

router.post('/', authenticate, requireRole('faculty'), validate(createCommentSchema), async (req: AuthRequest, res: Response) => {
  const { submissionId, lineNumber, content } = req.body;

  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission) {
    throw new AppError('Submission not found', 404);
  }

  const comment = await prisma.comment.create({
    data: {
      submissionId,
      facultyId: req.user!.userId,
      lineNumber,
      content,
    },
    include: { faculty: { select: { id: true, name: true } } },
  });

  res.status(201).json(comment);
});

router.patch('/:id', authenticate, requireRole('faculty'), validate(updateCommentSchema), async (req: AuthRequest, res: Response) => {
  const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  if (comment.facultyId !== req.user!.userId) {
    throw new AppError('Not authorized to edit this comment', 403);
  }

  const updated = await prisma.comment.update({
    where: { id: req.params.id },
    data: { content: req.body.content },
    include: { faculty: { select: { id: true, name: true } } },
  });

  res.json(updated);
});

router.delete('/:id', authenticate, requireRole('faculty'), async (req: AuthRequest, res: Response) => {
  const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  if (comment.facultyId !== req.user!.userId) {
    throw new AppError('Not authorized to delete this comment', 403);
  }

  await prisma.comment.delete({ where: { id: req.params.id } });
  res.json({ message: 'Comment deleted' });
});

export default router;