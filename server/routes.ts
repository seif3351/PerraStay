import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPropertySchema, insertBookingSchema, insertReviewSchema, insertDeliveryOrderSchema, insertUserSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
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
      res.status(400).json({ message: "Invalid booking data" });
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

  // User registration route
  app.post("/api/users", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      // username can be email for simplicity
      const userData = {
        email,
        password,
        firstName,
        lastName,
        username: email,
      };
      const validatedData = insertUserSchema.parse(userData);
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
