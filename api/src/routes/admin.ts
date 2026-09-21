import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['student', 'faculty', 'admin']),
  courseId: z.string().min(1).optional(),
});

const updateUserSchema = createUserSchema.partial().omit({ password: true });

const createCourseSchema = z.object({
  name: z.string().min(1),
  department: z.string().min(1),
  batchYear: z.number().int().min(2000).max(2100),
});

router.get('/users', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, courseId: true, createdAt: true, course: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: users });
});

router.post('/users', authenticate, requireRole('admin'), validate(createUserSchema), async (req: AuthRequest, res: Response) => {
  const { name, email, password, role, courseId } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('Email already in use', 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role, courseId },
    select: { id: true, name: true, email: true, role: true, courseId: true, createdAt: true },
  });

  res.status(201).json(user);
});

router.patch('/users/:id', authenticate, requireRole('admin'), validate(updateUserSchema), async (req: AuthRequest, res: Response) => {
  const { name, email, role, courseId } = req.body;

  if (email) {
    const existing = await prisma.user.findFirst({ where: { email, NOT: { id: req.params.id } } });
    if (existing) throw new AppError('Email already in use', 409);
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { name, email, role, courseId },
    select: { id: true, name: true, email: true, role: true, courseId: true },
  });

  res.json(user);
});

router.delete('/users/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  if (req.params.id === req.user!.userId) {
    throw new AppError('Cannot delete yourself', 400);
  }
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ message: 'User deleted' });
});

router.get('/courses', authenticate, requireRole('admin'), async (_req: AuthRequest, res: Response) => {
  const courses = await prisma.course.findMany({
    include: { _count: { select: { users: true, assignments: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: courses });
});

router.post('/courses', authenticate, requireRole('admin'), validate(createCourseSchema), async (req: AuthRequest, res: Response) => {
  const course = await prisma.course.create({ data: req.body });
  res.status(201).json(course);
});

export default router;