import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPropertySchema, insertBookingSchema, insertReviewSchema, insertDeliveryOrderSchema, insertUserSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";

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

// Extend Request type to include user info
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    isHost: boolean;
  };
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
      
      // Create user data
      const userData = {
        email: validatedInput.email,
        password: hashedPassword,
        firstName: validatedInput.firstName,
        lastName: validatedInput.lastName,
        username: validatedInput.email,
        isHost: validatedInput.isHost,
      };
      
      const validatedUserData = insertUserSchema.parse(userData);
      const user = await storage.createUser(validatedUserData);
      
      // Don't return password in response
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
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

  app.post("/api/signin", async (req, res) => {
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
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(validatedInput.password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          code: "INVALID_CREDENTIALS", 
          message: "Invalid email or password" 
        });
      }
      
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
      const filters = {
        location: req.query.location as string,
        minPrice: req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined,
        amenities: req.query.amenities ? (req.query.amenities as string).split(',') : undefined
      };
      
      const properties = await storage.getProperties(filters);
      res.json(properties);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch properties" });
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

  app.post("/api/properties", authenticateToken, requireHost, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
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

  app.get("/api/properties/:id/reviews", async (req, res) => {
    try {
      const reviews = await storage.getReviewsByProperty(req.params.id);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Bookings routes
  app.post("/api/bookings", authenticateToken, requireGuest, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
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
        const bookingsWithProperty = propertyBookings.map(booking => ({
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
