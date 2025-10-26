import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { storage } from '../storage';
import { type Response, type NextFunction } from 'express';
import type { AuthenticatedRequest } from '../routes';

// Password complexity requirements
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// Rate limiting for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { 
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many attempts. Please try again later." 
  }
});

// Account locking middleware
export const checkAccountLock = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    if (!email) {
      return next();
    }

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return next();
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const waitMinutes = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / (60 * 1000));
      return res.status(429).json({
        code: "ACCOUNT_LOCKED",
        message: `Account is temporarily locked. Please try again in ${waitMinutes} minutes.`
      });
    }

    // Attach user to request for failed attempt tracking
    req.potentialUser = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Track failed login attempts
export const trackFailedLogin = async (req: AuthenticatedRequest) => {
  const user = req.potentialUser;
  if (!user) return;

  const failedAttempts = (user.failedLoginAttempts || 0) + 1;
  const updates: any = {
    failedLoginAttempts: failedAttempts,
    lastFailedLogin: new Date()
  };

  // Lock account after 5 failed attempts
  if (failedAttempts >= 5) {
    updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  }

  await storage.updateUser(user.id, updates);
};

// Reset failed login attempts on successful login
export const resetFailedAttempts = async (userId: string) => {
  await storage.updateUser(userId, {
    failedLoginAttempts: 0,
    lockedUntil: null
  });
};