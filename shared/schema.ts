import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  isHost: boolean("is_host").default(false),
  emailVerified: boolean("email_verified").default(false),
  verificationToken: text("verification_token"),
  verificationTokenExpiry: timestamp("verification_token_expiry"),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpiry: timestamp("reset_password_token_expiry"),
  lastPasswordChange: timestamp("last_password_change"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lastFailedLogin: timestamp("last_failed_login"),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hostId: varchar("host_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull(),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }).notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  images: text("images").array().default([]),
  amenities: text("amenities").array().default([]),
  internetSpeed: integer("internet_speed"), // Mbps
  hasStableElectricity: boolean("has_stable_electricity").default(true),
  hasKitchen: boolean("has_kitchen").default(true),
  hasWorkspace: boolean("has_workspace").default(false),
  hasAC: boolean("has_ac").default(false),
  hasCoffeeMachine: boolean("has_coffee_machine").default(false),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  reviewCount: integer("review_count").default(0),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guestId: varchar("guest_id").references(() => users.id).notNull(),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  checkInDate: timestamp("check_in_date").notNull(),
  checkOutDate: timestamp("check_out_date").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"), // pending, confirmed, active, completed, cancelled
  depositRefunded: boolean("deposit_refunded").default(false),
  checkInPhotosUploaded: boolean("check_in_photos_uploaded").default(false),
  checkOutPhotosUploaded: boolean("check_out_photos_uploaded").default(false),
  checkOutConfirmedByHost: boolean("check_out_confirmed_by_host").default(false),
  checkOutConfirmedAt: timestamp("check_out_confirmed_at"),
  reviewedByGuest: boolean("reviewed_by_guest").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").references(() => bookings.id).notNull(),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  guestId: varchar("guest_id").references(() => users.id).notNull(),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deliveryOrders = pgTable("delivery_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guestId: varchar("guest_id").references(() => users.id).notNull(),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  orderType: text("order_type").notNull(), // food, groceries, essentials
  items: text("items").array().default([]),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00"),
  status: text("status").default("pending"), // pending, confirmed, preparing, delivered
  deliveryAddress: text("delivery_address").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Property access information (WiFi, codes, emergency contacts, etc.)
export const propertyAccessInfo = pgTable("property_access_info", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").references(() => properties.id).notNull().unique(),
  doorCode: text("door_code"),
  gateCode: text("gate_code"),
  wifiName: text("wifi_name"),
  wifiPassword: text("wifi_password"),
  keyPickupLocation: text("key_pickup_location"),
  emergencyContact: text("emergency_contact"),
  emergencyContactPhone: text("emergency_contact_phone"),
  houseRules: text("house_rules"),
  checkInInstructions: text("check_in_instructions"),
  googleMapsLinks: text("google_maps_links").array().default([]), // nearby places
  welcomeBoxUrl: text("welcome_box_url"), // Google Drive folder link
  welcomeBoxDescription: text("welcome_box_description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Booking-specific messages between guest and host
export const bookingMessages = pgTable("booking_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").references(() => bookings.id).notNull(),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Photos uploaded by guests at check-in and check-out
export const bookingPhotos = pgTable("booking_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").references(() => bookings.id).notNull(),
  photoUrl: text("photo_url").notNull(),
  photoType: text("photo_type").notNull(), // 'check_in' or 'check_out'
  description: text("description"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertPropertySchema = createInsertSchema(properties)
  .omit({
    id: true,
    createdAt: true,
    rating: true,
    reviewCount: true,
  })
  .extend({
    images: z.array(z.string().url("Invalid image URL")).max(10, "Maximum 10 images allowed"),
    amenities: z.array(z.string()).default([])
  });

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  depositRefunded: true,
  checkInPhotosUploaded: true,
  checkOutPhotosUploaded: true,
  checkOutConfirmedByHost: true,
  checkOutConfirmedAt: true,
  reviewedByGuest: true,
}).extend({
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export const insertDeliveryOrderSchema = createInsertSchema(deliveryOrders).omit({
  id: true,
  createdAt: true,
});

export const insertPropertyAccessInfoSchema = createInsertSchema(propertyAccessInfo).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBookingMessageSchema = createInsertSchema(bookingMessages).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

export const insertBookingPhotoSchema = createInsertSchema(bookingPhotos).omit({
  id: true,
  uploadedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type DeliveryOrder = typeof deliveryOrders.$inferSelect;
export type InsertDeliveryOrder = z.infer<typeof insertDeliveryOrderSchema>;
export type PropertyAccessInfo = typeof propertyAccessInfo.$inferSelect;
export type InsertPropertyAccessInfo = z.infer<typeof insertPropertyAccessInfoSchema>;
export type BookingMessage = typeof bookingMessages.$inferSelect;
export type InsertBookingMessage = z.infer<typeof insertBookingMessageSchema>;
export type BookingPhoto = typeof bookingPhotos.$inferSelect;
export type InsertBookingPhoto = z.infer<typeof insertBookingPhotoSchema>;
