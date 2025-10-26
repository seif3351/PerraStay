import { 
  users, properties, bookings, reviews, deliveryOrders, propertyAccessInfo, bookingPhotos,
  type User, type InsertUser,
  type Property, type InsertProperty,
  type Booking, type InsertBooking,
  type Review, type InsertReview,
  type DeliveryOrder, type InsertDeliveryOrder,
  type PropertyAccessInfo, type InsertPropertyAccessInfo,
  type BookingPhoto, type InsertBookingPhoto
} from "@shared/schema";
import { and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import path from 'path';
import fs from 'fs/promises';

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  verifyEmail(token: string): Promise<User | undefined>;
  resetPassword(token: string, newPassword: string): Promise<User | undefined>;
  
  // Property operations
  getProperty(id: string): Promise<Property | undefined>;
  getProperties(filters?: {
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    amenities?: string[];
  }): Promise<Property[]>;
  getPropertiesByHost(hostId: string): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, updates: Partial<InsertProperty>): Promise<Property | undefined>;
  cleanupOrphanedImages(): Promise<void>;
  
  // Booking operations
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingsByGuest(guestId: string): Promise<Booking[]>;
  getBookingsByProperty(propertyId: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: string, status: string): Promise<Booking | undefined>;
  
  // Review operations
  getReviewsByProperty(propertyId: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  
  // Delivery operations
  getDeliveryOrder(id: string): Promise<DeliveryOrder | undefined>;
  getDeliveryOrdersByGuest(guestId: string): Promise<DeliveryOrder[]>;
  createDeliveryOrder(order: InsertDeliveryOrder): Promise<DeliveryOrder>;
  updateDeliveryOrderStatus(id: string, status: string): Promise<DeliveryOrder | undefined>;
  
  // Property Access Info operations
  getPropertyAccessInfo(propertyId: string): Promise<PropertyAccessInfo | undefined>;
  createPropertyAccessInfo(accessInfo: InsertPropertyAccessInfo): Promise<PropertyAccessInfo>;
  updatePropertyAccessInfo(propertyId: string, updates: Partial<InsertPropertyAccessInfo>): Promise<PropertyAccessInfo | undefined>;
  
  // Booking Photos operations
  getBookingPhotos(bookingId: string): Promise<BookingPhoto[]>;
  getBookingPhotosByType(bookingId: string, photoType: string): Promise<BookingPhoto[]>;
  createBookingPhoto(photo: InsertBookingPhoto): Promise<BookingPhoto>;
  deleteBookingPhoto(id: string): Promise<void>;
}

export class DbStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const user: User = {
      ...insertUser,
      id,
      username: insertUser.email,
      isHost: insertUser.isHost ?? false,
      emailVerified: false,
      verificationToken: insertUser.verificationToken ?? null,
      verificationTokenExpiry: insertUser.verificationTokenExpiry ?? null,
      resetPasswordToken: null,
      resetPasswordExpiry: null,
      lastPasswordChange: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastFailedLogin: null,
      createdAt: now,
    };
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async verifyEmail(token: string): Promise<User | undefined> {
    try {
      // First, find the user with this token
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.verificationToken, token));

      if (!user) {
        console.log('No user found with token:', token);
        return undefined;
      }

      // Check if token is expired
      const now = new Date();
      const expiry = user.verificationTokenExpiry;
      
      console.log('Token expiry check:', {
        now: now.toISOString(),
        expiry: expiry?.toISOString(),
        isExpired: expiry ? expiry <= now : true
      });

      if (!expiry || expiry <= now) {
        console.log('Token is expired or has no expiry');
        return undefined;
      }

      // Token is valid, update the user
      const [updated] = await db
        .update(users)
        .set({
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null
        })
        .where(eq(users.id, user.id))
        .returning();
      
      console.log('User verified successfully:', updated.id);
      return updated || undefined;
    } catch (error) {
      console.error('Error in verifyEmail:', error);
      return undefined;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<User | undefined> {
    const now = new Date();
    const [user] = await db
      .select()
      .from(users)
      .where(sql`${users.resetPasswordToken} = ${token} AND ${users.resetPasswordExpiry} > ${now}`);

    if (!user) {
      return undefined;
    }

    const [updated] = await db
      .update(users)
      .set({
        password: newPassword,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
        lastPasswordChange: now,
        failedLoginAttempts: 0,
        lockedUntil: null
      })
      .where(eq(users.id, user.id))
      .returning();
    return updated || undefined;
  }

  // Property operations
  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, id));
    return property || undefined;
  }

  async getProperties(filters?: {
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    amenities?: string[];
  }): Promise<Property[]> {
    try {
      const conditions = [];
      if (filters) {
        if (filters.location) {
          conditions.push(sql`lower(${properties.location}) like ${`%${filters.location.toLowerCase()}%`}`);
        }
        if (filters.minPrice !== undefined) {
          conditions.push(sql`${properties.monthlyPrice}::decimal >= ${filters.minPrice}`);
        }
        if (filters.maxPrice !== undefined) {
          conditions.push(sql`${properties.monthlyPrice}::decimal <= ${filters.maxPrice}`);
        }
        if (filters.amenities && filters.amenities.length > 0) {
          conditions.push(sql`${properties.amenities} @> ${filters.amenities}::text[]`);
        }
      }

      let query = db.select().from(properties);
      if (conditions.length > 0) {
        const combinedCondition = conditions.reduce((acc, curr) => 
          acc ? sql`${acc} AND ${curr}` : curr
        );
        return await query.where(combinedCondition);
      }

      return await query;
    } catch (error) {
      console.error('Error in getProperties:', error);
      return [];
    }
  }

  async getPropertiesByHost(hostId: string): Promise<Property[]> {
    return await db
      .select()
      .from(properties)
      .where(eq(properties.hostId, hostId));
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    // Clean up and validate image URLs array
    if (!insertProperty.images || insertProperty.images.length === 0) {
      throw new Error('At least one image is required for the property.');
    }

    const cleanedImages = insertProperty.images
      .filter(url => url && url.trim().length > 0)
      .map(url => url.trim())
      .slice(0, 10); // Enforce max 10 images

    if (cleanedImages.length === 0) {
      throw new Error('At least one valid image URL is required.');
    }

    // Validate all images are from our server
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const validImages = cleanedImages.every(url => {
      try {
        const urlObj = new URL(url);
        return urlObj.origin === baseUrl && urlObj.pathname.startsWith('/uploads/');
      } catch {
        return false;
      }
    });

    if (!validImages) {
      throw new Error('Invalid image URLs detected. All images must be uploaded through our server.');
    }

    // Verify the files exist in the uploads directory
    try {
      await Promise.all(cleanedImages.map(async url => {
        const urlObj = new URL(url);
        // Extract just the filename from the URL path
        const filename = path.basename(urlObj.pathname);
        // Use the same uploads directory that multer uses
        const filePath = path.join(__dirname, 'uploads', filename);
        await fs.access(filePath);
      }));
    } catch (error) {
      console.error('Image file verification error:', error);
      throw new Error('One or more uploaded images are missing from the server.');
    }

    const [property] = await db
      .insert(properties)
      .values({
        ...insertProperty,
        id: randomUUID(),
        rating: "0.00",
        reviewCount: 0,
        images: cleanedImages,
        amenities: insertProperty.amenities ?? [],
        hasStableElectricity: insertProperty.hasStableElectricity ?? true,
        hasKitchen: insertProperty.hasKitchen ?? true,
        hasWorkspace: insertProperty.hasWorkspace ?? false,
        hasAC: insertProperty.hasAC ?? false,
        hasCoffeeMachine: insertProperty.hasCoffeeMachine ?? false,
        createdAt: new Date()
      })
      .returning();
    return property;
  }

  async updateProperty(id: string, updates: Partial<InsertProperty>): Promise<Property | undefined> {
    // If updating images, validate them
    if (updates.images) {
      const cleanedImages = updates.images
        .filter(url => url && url.trim().length > 0)
        .map(url => url.trim())
        .slice(0, 10);

      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      const validImages = cleanedImages.every(url => {
        try {
          const urlObj = new URL(url);
          return urlObj.origin === baseUrl && urlObj.pathname.startsWith('/uploads/');
        } catch {
          return false;
        }
      });

      if (!validImages) {
        throw new Error('Invalid image URLs detected. All images must be uploaded through our server.');
      }

      updates.images = cleanedImages;
    }

    const [updated] = await db
      .update(properties)
      .set(updates)
      .where(eq(properties.id, id))
      .returning();
    return updated || undefined;
  }

  async cleanupOrphanedImages(): Promise<void> {
    try {
      // Get all property images from database
      const allProperties = await db.select({ images: properties.images }).from(properties);
      const usedImages = new Set(allProperties.flatMap(p => p.images || []));

      // Get all files in uploads directory
      const uploadsDir = path.join(__dirname, 'uploads');
      
      // Create uploads directory if it doesn't exist
      try {
        await fs.access(uploadsDir);
      } catch {
        await fs.mkdir(uploadsDir, { recursive: true });
        return; // No files to clean up in a new directory
      }

      const files = await fs.readdir(uploadsDir);

      // Get server URL configuration
      const baseUrl = `http://localhost:${process.env.PORT || 3000}`;

      // Check each file
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        const fileUrl = `/uploads/${file}`;
        const fullUrl = `${baseUrl}${fileUrl}`;

        // If the file isn't referenced in any property, delete it
        if (!usedImages.has(fullUrl)) {
          try {
            // Check if file exists before trying to delete
            await fs.access(filePath);
            await fs.unlink(filePath);
            console.log(`Deleted orphaned image: ${file}`);
          } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== 'ENOENT') { // Only log error if it's not a "file not found" error
              console.error(`Failed to delete orphaned image ${file}:`, err);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up orphaned images:', error);
    }
  }

  // Booking operations
  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async getBookingsByGuest(guestId: string): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.guestId, guestId));
  }

  async getBookingsByProperty(propertyId: string): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.propertyId, propertyId));
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const [booking] = await db
      .insert(bookings)
      .values({
        ...insertBooking,
        id: randomUUID(),
        status: insertBooking.status ?? "pending",
        depositRefunded: false,
        createdAt: new Date()
      })
      .returning();
    return booking;
  }

  async updateBookingStatus(id: string, status: string): Promise<Booking | undefined> {
    const [updated] = await db
      .update(bookings)
      .set({ status })
      .where(eq(bookings.id, id))
      .returning();
    return updated || undefined;
  }

  // Review operations
  async getReviewsByProperty(propertyId: string): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.propertyId, propertyId));
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const [review] = await db
      .insert(reviews)
      .values({
        ...insertReview,
        id: randomUUID(),
        createdAt: new Date()
      })
      .returning();

    // Update property rating
    const propertyReviews = await this.getReviewsByProperty(insertReview.propertyId);
    const avgRating = propertyReviews.length > 0 
      ? propertyReviews.reduce((sum, r) => sum + r.rating, 0) / propertyReviews.length 
      : 0;
    await db
      .update(properties)
      .set({
        rating: avgRating.toFixed(2),
        reviewCount: propertyReviews.length
      })
      .where(eq(properties.id, insertReview.propertyId));

    return review;
  }

  // Delivery operations
  async getDeliveryOrder(id: string): Promise<DeliveryOrder | undefined> {
    const [order] = await db.select().from(deliveryOrders).where(eq(deliveryOrders.id, id));
    return order || undefined;
  }

  async getDeliveryOrdersByGuest(guestId: string): Promise<DeliveryOrder[]> {
    return await db.select().from(deliveryOrders).where(eq(deliveryOrders.guestId, guestId));
  }

  async createDeliveryOrder(insertOrder: InsertDeliveryOrder): Promise<DeliveryOrder> {
    const [order] = await db
      .insert(deliveryOrders)
      .values({
        ...insertOrder,
        id: randomUUID(),
        status: insertOrder.status ?? "pending",
        items: insertOrder.items ?? [],
        discountAmount: insertOrder.discountAmount ?? "0.00",
        createdAt: new Date()
      })
      .returning();
    return order;
  }

  async updateDeliveryOrderStatus(id: string, status: string): Promise<DeliveryOrder | undefined> {
    const [updated] = await db
      .update(deliveryOrders)
      .set({ status })
      .where(eq(deliveryOrders.id, id))
      .returning();
    return updated || undefined;
  }

  // Property Access Info operations
  async getPropertyAccessInfo(propertyId: string): Promise<PropertyAccessInfo | undefined> {
    const [accessInfo] = await db
      .select()
      .from(propertyAccessInfo)
      .where(eq(propertyAccessInfo.propertyId, propertyId));
    return accessInfo || undefined;
  }

  async createPropertyAccessInfo(insertAccessInfo: InsertPropertyAccessInfo): Promise<PropertyAccessInfo> {
    const [accessInfo] = await db
      .insert(propertyAccessInfo)
      .values({
        ...insertAccessInfo,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return accessInfo;
  }

  async updatePropertyAccessInfo(propertyId: string, updates: Partial<InsertPropertyAccessInfo>): Promise<PropertyAccessInfo | undefined> {
    const [updated] = await db
      .update(propertyAccessInfo)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(propertyAccessInfo.propertyId, propertyId))
      .returning();
    return updated || undefined;
  }

  // Booking Photos operations
  async getBookingPhotos(bookingId: string): Promise<BookingPhoto[]> {
    return await db
      .select()
      .from(bookingPhotos)
      .where(eq(bookingPhotos.bookingId, bookingId));
  }

  async getBookingPhotosByType(bookingId: string, photoType: string): Promise<BookingPhoto[]> {
    return await db
      .select()
      .from(bookingPhotos)
      .where(and(
        eq(bookingPhotos.bookingId, bookingId),
        eq(bookingPhotos.photoType, photoType)
      ));
  }

  async createBookingPhoto(insertPhoto: InsertBookingPhoto): Promise<BookingPhoto> {
    const [photo] = await db
      .insert(bookingPhotos)
      .values({
        ...insertPhoto,
        id: randomUUID(),
        uploadedAt: new Date()
      })
      .returning();
    return photo;
  }

  async deleteBookingPhoto(id: string): Promise<void> {
    await db.delete(bookingPhotos).where(eq(bookingPhotos.id, id));
  }
}

// Export singleton instance
const storage = new DbStorage();
export { storage };