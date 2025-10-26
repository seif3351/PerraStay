import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { 
  insertPropertySchema, 
  insertBookingSchema, 
  insertReviewSchema, 
  insertDeliveryOrderSchema, 
  insertUserSchema,
  users,
  type User,
  type Booking
} from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { randomUUID } from "crypto";
import { emailService } from "./services/email";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  authRateLimiter, 
  passwordSchema, 
  checkAccountLock,
  trackFailedLogin,
  resetFailedAttempts 
} from "./middleware/auth";

// Authentication validation schemas
const signUpSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address").transform(email => email.toLowerCase().trim()),
  password: z.string().min(6, "Password must be at least 6 characters"),
  isHost: z.boolean().default(false),
});

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address").transform(email => email.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
});

// Secure JWT secret management
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}
const jwtSecret = JWT_SECRET || "perra-dev-secret-not-for-production";

// Configure multer for image uploads
// Configure multer error handling
function handleMulterError(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 10 files.' });
    }
    return res.status(400).json({ error: 'Invalid file upload: ' + err.message });
  }
  if (err) {
    return res.status(500).json({ error: 'File upload failed: ' + err.message });
  }
  next();
}

// Configure multer storage and upload
const uploadStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    try {
      await fs.promises.access(uploadDir, fs.constants.W_OK).catch(async () => {
        await fs.promises.mkdir(uploadDir, { recursive: true, mode: 0o755 });
      });
      cb(null, uploadDir);
    } catch (err) {
      cb(err as Error, '');
    }
  },
  filename: (req: AuthenticatedRequest, file, cb) => {
    try {
      const userId = req.user?.userId || 'anonymous';
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 10);
      const ext = path.extname(file.originalname).toLowerCase();
      
      // Create a filename that's guaranteed to be safe and unique
      const filename = `${userId}-${timestamp}-${random}${ext}`;
      cb(null, filename);
    } catch (err) {
      cb(err as Error, '');
    }
  }
});

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
  
  const isValidMime = allowedMimes.includes(file.mimetype);
  const isValidExt = allowedExts.includes(path.extname(file.originalname).toLowerCase());
  
  if (!isValidMime || !isValidExt) {
    cb(null, false);
    return;
  }
  
  cb(null, true);
};

// Create multer upload instance with all configurations
const upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10,
    fieldSize: 10 * 1024 * 1024,
    parts: 20
  },
  fileFilter: fileFilter
});

// Extend Request type to include user info
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    isHost: boolean;
  };
  potentialUser?: User; // Used for tracking failed login attempts
}

// Authentication middleware to verify JWT tokens
const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies['auth-token'];
    
    if (!token) {
      return res.status(401).json({ 
        code: "UNAUTHORIZED", 
        message: "Authentication required" 
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, jwtSecret) as { 
      userId: string; 
      email: string; 
      isHost: boolean; 
    };

    // Verify user still exists
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        code: "UNAUTHORIZED", 
        message: "User not found" 
      });
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      isHost: decoded.isHost
    };

    next();
  } catch (error) {
    return res.status(401).json({ 
      code: "UNAUTHORIZED", 
      message: "Invalid or expired token" 
    });
  }
};

// Authorization middleware for hosts only
const requireHost = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isHost) {
    return res.status(403).json({ 
      code: "FORBIDDEN", 
      message: "Host privileges required" 
    });
  }
  next();
};

// Authorization middleware for guests only
const requireGuest = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.isHost) {
    return res.status(403).json({ 
      code: "FORBIDDEN", 
      message: "Guest privileges required" 
    });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  // Serve uploaded files
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Image upload endpoint
  app.post('/api/upload-image', authenticateToken, (req: AuthenticatedRequest, res) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ 
          message: err.message || 'Failed to upload image',
          error: err
        });
      }

      try {
        if (!req.file) {
          console.error('No file in request');
          return res.status(400).json({ message: 'No image file provided' });
        }

        console.log('File upload successful:', {
          originalName: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype
        });

        // Create URL for the uploaded file
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ url: fileUrl });
      } catch (error) {
        console.error('Upload processing error:', error);
        res.status(500).json({ message: 'Failed to process uploaded image' });
      }
    });
  });
  // Authentication routes
  app.post("/api/users", async (req, res) => {
    try {
      // Validate input data
      const validatedInput = signUpSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedInput.email);
      if (existingUser) {
        return res.status(400).json({ 
          code: "USER_EXISTS", 
          message: "An account with this email already exists" 
        });
      }
      
      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(validatedInput.password, saltRounds);
      
      // Generate verification token
      const verificationToken = randomUUID();
      const verificationExpiry = new Date();
      verificationExpiry.setHours(verificationExpiry.getHours() + 24); // 24 hour expiry

      // Create user data
      const userData = {
        email: validatedInput.email,
        password: hashedPassword,
        firstName: validatedInput.firstName,
        lastName: validatedInput.lastName,
        username: validatedInput.email,
        isHost: validatedInput.isHost,
        emailVerified: false,
        verificationToken,
        verificationTokenExpiry: verificationExpiry
      };
      
      const validatedUserData = insertUserSchema.parse(userData);
      const user = await storage.createUser(validatedUserData);

      // Send verification email
      await emailService.sendVerificationEmail(user, verificationToken);
      
      // Don't return password in response
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({
        ...userWithoutPassword,
        message: "Please check your email to verify your account"
      });
    } catch (error) {
      console.error("User creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          code: "VALIDATION_ERROR", 
          message: "Invalid input data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        code: "INTERNAL_ERROR", 
        message: "Failed to create user" 
      });
    }
  });

  // Upgrade user to host
  app.post("/api/users/upgrade-to-host", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          code: "UNAUTHORIZED",
          message: "Authentication required"
        });
      }

      // Check if user is already a host
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({
          code: "USER_NOT_FOUND",
          message: "User not found"
        });
      }

      if (user.isHost) {
        return res.status(400).json({
          code: "ALREADY_HOST",
          message: "User is already a host"
        });
      }

      // Update user to host
      await storage.updateUser(req.user.userId, {
        isHost: true
      });

      // Get updated user data
      const updatedUser = await storage.getUser(req.user.userId);
      if (!updatedUser) {
        throw new Error("Failed to fetch updated user");
      }

      // Generate new JWT with updated host status
      const token = jwt.sign(
        { 
          userId: updatedUser.id, 
          email: updatedUser.email,
          isHost: true
        },
        jwtSecret,
        { expiresIn: '7d' }
      );

      // Set new token in cookie
      res.cookie('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Return updated user without password
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({
        success: true,
        message: "Successfully upgraded to host",
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Upgrade to host error:", error);
      res.status(500).json({
        code: "INTERNAL_ERROR",
        message: "Failed to upgrade user to host"
      });
    }
  });

  // Resend verification email
  app.post("/api/resend-verification", authRateLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);

      if (!user || user.emailVerified) {
        // Don't reveal if user exists or is already verified
        return res.json({ message: "If an unverified account exists, a verification email will be sent" });
      }

      const verificationToken = randomUUID();
      const verificationExpiry = new Date();
      verificationExpiry.setHours(verificationExpiry.getHours() + 24);

      await storage.updateUser(user.id, {
        verificationToken,
        verificationTokenExpiry: verificationExpiry
      });

      await emailService.sendVerificationEmail(user, verificationToken);
      
      res.json({ message: "If an unverified account exists, a verification email will be sent" });
    } catch (error) {
      res.status(500).json({
        code: "INTERNAL_ERROR",
        message: "Failed to resend verification email"
      });
    }
  });

  // Email verification
  // Endpoint to resend verification email
  app.post("/api/resend-verification", async (req: AuthenticatedRequest, res) => {
    try {
      // Check CSRF token from request header
      const csrfToken = req.headers['x-csrf-token'];
      if (!csrfToken || typeof csrfToken !== 'string') {
        return res.status(403).json({
          code: "INVALID_CSRF",
          message: "Invalid CSRF token"
        });
      }

      const { email } = req.body;
      if (!email) {
        return res.status(400).json({
          code: "INVALID_REQUEST",
          message: "Email is required"
        });
      }

      // Find the user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({
          code: "USER_NOT_FOUND",
          message: "User not found"
        });
      }

      if (user.emailVerified) {
        return res.status(400).json({
          code: "ALREADY_VERIFIED",
          message: "Email is already verified"
        });
      }

      // Generate new verification token
      const verificationToken = randomUUID();
      const verificationExpiry = new Date();
      verificationExpiry.setHours(verificationExpiry.getHours() + 24);

      // Update user with new token
      const updatedUser = await storage.updateUser(user.id, {
        verificationToken,
        verificationTokenExpiry: verificationExpiry
      });

      if (!updatedUser) {
        throw new Error("Failed to update user with new verification token");
      }

      // Send new verification email
      await emailService.sendVerificationEmail(updatedUser, verificationToken);

      res.json({ message: "Verification email sent successfully" });
    } catch (error) {
      console.error("Error resending verification:", error);
      res.status(500).json({
        code: "SERVER_ERROR",
        message: "Failed to resend verification email"
      });
    }
  });

  app.get("/api/verify-email/:token", async (req, res) => {
    try {
      const { token } = req.params;
      console.log('Attempting to verify email with token:', token);

      // First check if a user exists with this token
      const [checkUser] = await db
        .select()
        .from(users)
        .where(eq(users.verificationToken, token));

      if (!checkUser) {
        console.log('No user found with token:', token);
        return res.status(400).json({
          code: "INVALID_TOKEN",
          message: "Invalid verification token"
        });
      }

      console.log('Found user:', {
        id: checkUser.id,
        email: checkUser.email,
        verificationExpiry: checkUser.verificationTokenExpiry
      });

      const user = await storage.verifyEmail(token);
      
      if (!user) {
        return res.status(400).json({
          code: "EXPIRED_TOKEN",
          message: "Verification token has expired"
        });
      }

      console.log('Email verified successfully for user:', user.email);
      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error('Error verifying email:', error);
      res.status(500).json({
        code: "INTERNAL_ERROR",
        message: "Failed to verify email"
      });
    }
  });

  // Request password reset
  app.post("/api/request-password-reset", authRateLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal if user exists
        return res.json({ message: "If an account exists, a password reset email will be sent" });
      }

      const resetToken = randomUUID();
      const resetExpiry = new Date();
      resetExpiry.setHours(resetExpiry.getHours() + 1); // 1 hour expiry

      await storage.updateUser(user.id, {
        resetPasswordToken: resetToken,
        resetPasswordExpiry: resetExpiry
      });

      await emailService.sendPasswordResetEmail(user, resetToken);
      
      res.json({ message: "If an account exists, a password reset email will be sent" });
    } catch (error) {
      res.status(500).json({
        code: "INTERNAL_ERROR",
        message: "Failed to process password reset request"
      });
    }
  });

  // Reset password
  app.post("/api/reset-password/:token", authRateLimiter, async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      // Validate new password
      const validatedPassword = passwordSchema.parse(password);
      const hashedPassword = await bcrypt.hash(validatedPassword, 12);

      const user = await storage.resetPassword(token, hashedPassword);
      
      if (!user) {
        return res.status(400).json({
          code: "INVALID_TOKEN",
          message: "Invalid or expired reset token"
        });
      }

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          code: "VALIDATION_ERROR",
          message: "Invalid password",
          errors: error.errors
        });
      }
      res.status(500).json({
        code: "INTERNAL_ERROR",
        message: "Failed to reset password"
      });
    }
  });

  app.post("/api/signin", authRateLimiter, checkAccountLock, async (req: AuthenticatedRequest, res) => {
    try {
      // Validate input data
      const validatedInput = signInSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(validatedInput.email);
      if (!user) {
        return res.status(401).json({ 
          code: "INVALID_CREDENTIALS", 
          message: "Invalid email or password" 
        });
      }

      // Check if email is verified
      if (!user.emailVerified) {
        return res.status(403).json({
          code: "EMAIL_NOT_VERIFIED",
          message: "Please verify your email before signing in"
        });
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(validatedInput.password, user.password);
      if (!isPasswordValid) {
        // Track failed login attempt
        await trackFailedLogin(req);
        return res.status(401).json({ 
          code: "INVALID_CREDENTIALS", 
          message: "Invalid email or password" 
        });
      }

      // Reset failed login attempts on successful login
      await resetFailedAttempts(user.id);
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          isHost: user.isHost 
        },
        jwtSecret,
        { expiresIn: '7d' }
      );
      
      // Set secure cookie
      res.cookie('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      // Don't return password or token in response (use httpOnly cookie only)
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Sign in error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          code: "VALIDATION_ERROR", 
          message: "Invalid input data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        code: "INTERNAL_ERROR", 
        message: "Authentication failed" 
      });
    }
  });

  // Get current authenticated user
  app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          code: "UNAUTHORIZED",
          message: "Not authenticated"
        });
      }

      // Fetch full user data
      const user = await storage.getUser(req.user.userId);
      if (!user) {
        return res.status(404).json({
          code: "USER_NOT_FOUND",
          message: "User not found"
        });
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({
        code: "INTERNAL_ERROR",
        message: "Failed to fetch user data"
      });
    }
  });

  // Sign out route
  app.post("/api/signout", (req, res) => {
    res.clearCookie('auth-token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    res.json({ message: "Signed out successfully" });
  });

  // Properties routes
  app.get("/api/properties", async (req, res) => {
    try {
      console.log('Received properties request with query:', req.query);
      const filters = {
        location: req.query.location as string,
        minPrice: req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined,
        amenities: req.query.amenities ? (req.query.amenities as string).split(',') : undefined
      };
      
      console.log('Applying filters:', filters);
      const properties = await storage.getProperties(filters);
      console.log(`Found ${properties.length} properties`);
      res.json(properties);
    } catch (error) {
      console.error('Error fetching properties:', error);
      res.status(500).json({ 
        message: "Failed to fetch properties",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  const validateImage = (imageUrl: string) => {
    const allowedDomains = [
      'amazonaws.com',
      'cloudinary.com',
      'imgur.com',
      // Add other trusted domains
    ];
    
    try {
      const url = new URL(imageUrl);
      if (!allowedDomains.some(domain => url.hostname.includes(domain))) {
        throw new Error('Invalid image domain');
      }
    } catch (error) {
      throw new Error('Invalid image URL');
    }
  };

  // Validate that image URLs belong to our server
  const validateImageUrls = (urls: string[]) => {
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    return urls.every(url => {
      try {
        const urlObj = new URL(url);
        const isLocalUrl = urlObj.origin === baseUrl;
        const isUploadPath = urlObj.pathname.startsWith('/uploads/');
        return isLocalUrl && isUploadPath;
      } catch {
        return false;
      }
    });
  };

  app.post("/api/properties", authenticateToken, requireHost, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      
      // Validate image URLs
      if (validatedData.images && validatedData.images.length > 0) {
        if (!validateImageUrls(validatedData.images)) {
          return res.status(400).json({
            code: "VALIDATION_ERROR",
            message: "Invalid image URLs. All images must be uploaded through our server."
          });
        }
      }
      
      // Use authenticated user's ID as hostId instead of trusting client
      const propertyData = {
        ...validatedData,
        hostId: req.user!.userId
      };
      const property = await storage.createProperty(propertyData);
      res.status(201).json(property);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          code: "VALIDATION_ERROR", 
          message: "Invalid property data", 
          errors: error.errors 
        });
      }
      res.status(400).json({ message: "Invalid property data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  const sanitizeId = (id: string) => {
    // Ensure ID is a valid UUID
    try {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        throw new Error('Invalid ID format');
      }
      return id;
    } catch (error) {
      throw new Error('Invalid ID format');
    }
  };

  app.get("/api/properties/:id/reviews", async (req, res) => {
    try {
      const propertyId = sanitizeId(req.params.id);
      const reviews = await storage.getReviewsByProperty(propertyId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Bookings routes
  app.post("/api/bookings", authenticateToken, requireGuest, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      
      // Check for overlapping bookings
      const existingBookings = await storage.getBookingsByProperty(validatedData.propertyId);
      const checkInDate = new Date(validatedData.checkInDate);
      const checkOutDate = new Date(validatedData.checkOutDate);
      
      const hasOverlap = existingBookings.some((booking: { checkInDate: Date; checkOutDate: Date }) => {
        const bookingStart = new Date(booking.checkInDate);
        const bookingEnd = new Date(booking.checkOutDate);
        return (
          (checkInDate >= bookingStart && checkInDate < bookingEnd) ||
          (checkOutDate > bookingStart && checkOutDate <= bookingEnd) ||
          (checkInDate <= bookingStart && checkOutDate >= bookingEnd)
        );
      });
      
      if (hasOverlap) {
        return res.status(400).json({
          code: "BOOKING_CONFLICT",
          message: "The property is not available for these dates"
        });
      }
      
      // Use authenticated user's ID as guestId instead of trusting client
      const bookingData = {
        ...validatedData,
        guestId: req.user!.userId
      };
      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          code: "VALIDATION_ERROR", 
          message: "Invalid booking data", 
          errors: error.errors 
        });
      }
      res.status(400).json({ message: "Invalid booking data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/bookings/guest", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Only allow users to get their own bookings
      const bookings = await storage.getBookingsByGuest(req.user!.userId);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/host", authenticateToken, requireHost, async (req: AuthenticatedRequest, res) => {
    try {
      // Get all properties owned by the authenticated host
      const hostProperties = await storage.getPropertiesByHost(req.user!.userId);
      
      // Get all bookings for those properties
      const allBookings = [];
      for (const property of hostProperties) {
        const propertyBookings = await storage.getBookingsByProperty(property.id);
        // Add property info to each booking for context
        const bookingsWithProperty = propertyBookings.map((booking: Booking) => ({
          ...booking,
          property: property
        }));
        allBookings.push(...bookingsWithProperty);
      }
      
      res.json(allBookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch host bookings" });
    }
  });

  app.patch("/api/bookings/:id/status", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { status } = req.body;
      
      // First, get the booking to check ownership
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Check authorization based on user role
      if (req.user!.isHost) {
        // Hosts can only update bookings for their own properties
        const property = await storage.getProperty(booking.propertyId);
        if (!property || property.hostId !== req.user!.userId) {
          return res.status(403).json({ 
            code: "FORBIDDEN", 
            message: "You can only update bookings for your own properties" 
          });
        }
      } else {
        // Guests can only cancel their own bookings
        if (booking.guestId !== req.user!.userId) {
          return res.status(403).json({ 
            code: "FORBIDDEN", 
            message: "You can only update your own bookings" 
          });
        }
        // Guests can only cancel (restrict status changes)
        if (status !== "cancelled") {
          return res.status(403).json({ 
            code: "FORBIDDEN", 
            message: "Guests can only cancel bookings" 
          });
        }
      }
      
      const updatedBooking = await storage.updateBookingStatus(req.params.id, status);
      res.json(updatedBooking);
    } catch (error) {
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // Reviews routes
  app.post("/api/reviews", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertReviewSchema.parse(req.body);
      // Use authenticated user's ID as guestId instead of trusting client
      const reviewData = {
        ...validatedData,
        guestId: req.user!.userId
      };
      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      res.status(400).json({ message: "Invalid review data" });
    }
  });

  // Delivery routes
  app.post("/api/delivery-orders", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertDeliveryOrderSchema.parse(req.body);
      // Use authenticated user's ID as guestId instead of trusting client
      const orderData = {
        ...validatedData,
        guestId: req.user!.userId
      };
      const order = await storage.createDeliveryOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ message: "Invalid delivery order data" });
    }
  });

  app.get("/api/delivery-orders/guest", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Only allow users to get their own delivery orders
      const orders = await storage.getDeliveryOrdersByGuest(req.user!.userId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch delivery orders" });
    }
  });

  // Image upload endpoint with retry capability
  app.post("/api/upload-image", 
    authenticateToken,
    (req, res, next) => upload.single('image')(req, res, err => handleMulterError(err, req, res, next)),
    async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          error: "No image file provided or invalid file type",
          details: "Please ensure the file is a valid JPEG, PNG, or WebP image under 5MB"
        });
      }

      // Verify the uploaded file exists and is readable
      try {
        await fs.promises.access(req.file.path, fs.constants.R_OK);
      } catch (err) {
        return res.status(500).json({
          error: "File upload failed",
          details: "The uploaded file could not be processed. Please try again."
        });
      }

      // Generate the URL for the uploaded file
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const baseUrl = process.env.BASE_URL || `${protocol}://${req.get('host')}`;
      const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

      res.status(200).json({
        url: imageUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    } catch (error) {
      console.error('Image upload error:', error);
      res.status(500).json({ 
        message: "Failed to upload image",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/delivery-orders/:id/status", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { status } = req.body;
      
      // First, get the delivery order to check ownership
      const order = await storage.getDeliveryOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Delivery order not found" });
      }
      
      // Only allow users to update their own delivery orders
      if (order.guestId !== req.user!.userId) {
        return res.status(403).json({ 
          code: "FORBIDDEN", 
          message: "You can only update your own delivery orders" 
        });
      }
      
      const updatedOrder = await storage.updateDeliveryOrderStatus(req.params.id, status);
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to update delivery order" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
