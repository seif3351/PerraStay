import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, index } from "drizzle-orm/pg-core";
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
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  verificationTokenIdx: index("users_verification_token_idx").on(table.verificationToken),
  resetPasswordTokenIdx: index("users_reset_password_token_idx").on(table.resetPasswordToken),
}));

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
}, (table) => ({
  hostIdIdx: index("properties_host_id_idx").on(table.hostId),
  locationIdx: index("properties_location_idx").on(table.location),
  priceIdx: index("properties_monthly_price_idx").on(table.monthlyPrice),
  createdAtIdx: index("properties_created_at_idx").on(table.createdAt),
}));

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
  
  // Cancellation fields
  cancellationReason: text("cancellation_reason"),
  cancelledBy: varchar("cancelled_by").references(() => users.id),
  cancelledAt: timestamp("cancelled_at"),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  
  // Checkout confirmation fields
  checkoutNotes: text("checkout_notes"),
  propertyCondition: text("property_condition"), // excellent, good, fair, poor, damaged
  damagesReported: boolean("damages_reported").default(false),
  damageDescription: text("damage_description"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  guestIdIdx: index("bookings_guest_id_idx").on(table.guestId),
  propertyIdIdx: index("bookings_property_id_idx").on(table.propertyId),
  statusIdx: index("bookings_status_idx").on(table.status),
  checkInDateIdx: index("bookings_check_in_date_idx").on(table.checkInDate),
  checkOutDateIdx: index("bookings_check_out_date_idx").on(table.checkOutDate),
  createdAtIdx: index("bookings_created_at_idx").on(table.createdAt),
}));

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").references(() => bookings.id).notNull(),
  propertyId: varchar("property_id").references(() => properties.id).notNull(),
  guestId: varchar("guest_id").references(() => users.id).notNull(),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  bookingIdIdx: index("reviews_booking_id_idx").on(table.bookingId),
  propertyIdIdx: index("reviews_property_id_idx").on(table.propertyId),
  guestIdIdx: index("reviews_guest_id_idx").on(table.guestId),
  createdAtIdx: index("reviews_created_at_idx").on(table.createdAt),
}));

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
}, (table) => ({
  guestIdIdx: index("delivery_orders_guest_id_idx").on(table.guestId),
  propertyIdIdx: index("delivery_orders_property_id_idx").on(table.propertyId),
  statusIdx: index("delivery_orders_status_idx").on(table.status),
  createdAtIdx: index("delivery_orders_created_at_idx").on(table.createdAt),
}));

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
}, (table) => ({
  propertyIdIdx: index("property_access_info_property_id_idx").on(table.propertyId),
}));

// Booking-specific messages between guest and host
export const bookingMessages = pgTable("booking_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").references(() => bookings.id).notNull(),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  bookingIdIdx: index("booking_messages_booking_id_idx").on(table.bookingId),
  senderIdIdx: index("booking_messages_sender_id_idx").on(table.senderId),
  isReadIdx: index("booking_messages_is_read_idx").on(table.isRead),
  createdAtIdx: index("booking_messages_created_at_idx").on(table.createdAt),
}));

// Photos uploaded by guests at check-in and check-out
export const bookingPhotos = pgTable("booking_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").references(() => bookings.id).notNull(),
  photoUrl: text("photo_url").notNull(),
  photoType: text("photo_type").notNull(), // 'check_in' or 'check_out'
  description: text("description"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
}, (table) => ({
  bookingIdIdx: index("booking_photos_booking_id_idx").on(table.bookingId),
  photoTypeIdx: index("booking_photos_photo_type_idx").on(table.photoType),
  uploadedAtIdx: index("booking_photos_uploaded_at_idx").on(table.uploadedAt),
}));

// Messages between guest and host for a booking
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").references(() => bookings.id).notNull(),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  bookingIdIdx: index("messages_booking_id_idx").on(table.bookingId),
  senderIdIdx: index("messages_sender_id_idx").on(table.senderId),
  isReadIdx: index("messages_is_read_idx").on(table.isRead),
  createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
}));

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
export type Message = typeof messages.$inferSelect;
export type InsertMessage = Omit<Message, 'id' | 'createdAt' | 'isRead'>;
