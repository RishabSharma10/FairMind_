import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { User } from '@shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

export function generateToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): { id: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string };
  } catch {
    return null;
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  (req as any).userId = payload.id;
  next();
}

// Rate limiting for resolutions (in-memory)
const resolutionCounts = new Map<string, { count: number; resetDate: Date }>();

export function checkResolutionLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const userLimit = resolutionCounts.get(userId);

  if (!userLimit || userLimit.resetDate < today) {
    resolutionCounts.set(userId, { count: 0, resetDate: today });
    return { allowed: true, remaining: 3 };
  }

  if (userLimit.count >= 3) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: 3 - userLimit.count };
}

export function incrementResolutionCount(userId: string): void {
  const userLimit = resolutionCounts.get(userId);
  if (userLimit) {
    userLimit.count += 1;
  } else {
    const today = new Date();
    resolutionCounts.set(userId, { count: 1, resetDate: today });
  }
}
