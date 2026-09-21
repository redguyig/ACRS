import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { signToken, setTokenCookie, clearTokenCookie, JwtPayload } from '../lib/jwt';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', validate(loginSchema), async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid credentials', 401);
  }

  const payload: JwtPayload = {
    userId: user.id,
    role: user.role,
    courseId: user.courseId,
  };

  const token = signToken(payload);
  setTokenCookie(res, token);

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      courseId: user.courseId,
    },
  });
});

router.post('/logout', (_req: AuthRequest, res: Response) => {
  clearTokenCookie(res);
  res.json({ message: 'Logged out successfully' });
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      courseId: true,
      course: { select: { id: true, name: true } },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({ user });
});

export default router;