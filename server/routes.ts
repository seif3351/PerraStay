import type { Express } from "express";
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

  app.post("/api/properties", async (req, res) => {
    try {
      console.log("Received data:", JSON.stringify(req.body, null, 2));
      const validatedData = insertPropertySchema.parse(req.body);
      console.log("Validated data:", JSON.stringify(validatedData, null, 2));
      const property = await storage.createProperty(validatedData);
      console.log("Created property:", JSON.stringify(property, null, 2));
      res.status(201).json(property);
    } catch (error) {
      console.error("Property creation error:", error);
      console.error("Error details:", error instanceof Error ? error.message : String(error));
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
  app.post("/api/bookings", async (req, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      const booking = await storage.createBooking(validatedData);
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

  app.get("/api/bookings/guest/:guestId", async (req, res) => {
    try {
      const bookings = await storage.getBookingsByGuest(req.params.guestId);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.patch("/api/bookings/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const booking = await storage.updateBookingStatus(req.params.id, status);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // Reviews routes
  app.post("/api/reviews", async (req, res) => {
    try {
      const validatedData = insertReviewSchema.parse(req.body);
      const review = await storage.createReview(validatedData);
      res.status(201).json(review);
    } catch (error) {
      res.status(400).json({ message: "Invalid review data" });
    }
  });

  // Delivery routes
  app.post("/api/delivery-orders", async (req, res) => {
    try {
      const validatedData = insertDeliveryOrderSchema.parse(req.body);
      const order = await storage.createDeliveryOrder(validatedData);
      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ message: "Invalid delivery order data" });
    }
  });

  app.get("/api/delivery-orders/guest/:guestId", async (req, res) => {
    try {
      const orders = await storage.getDeliveryOrdersByGuest(req.params.guestId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch delivery orders" });
    }
  });

  app.patch("/api/delivery-orders/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const order = await storage.updateDeliveryOrderStatus(req.params.id, status);
      if (!order) {
        return res.status(404).json({ message: "Delivery order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to update delivery order" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
