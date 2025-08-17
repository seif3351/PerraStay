import { 
  type User, type InsertUser,
  type Property, type InsertProperty,
  type Booking, type InsertBooking,
  type Review, type InsertReview,
  type DeliveryOrder, type InsertDeliveryOrder
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
  getDeliveryOrdersByGuest(guestId: string): Promise<DeliveryOrder[]>;
  createDeliveryOrder(order: InsertDeliveryOrder): Promise<DeliveryOrder>;
  updateDeliveryOrderStatus(id: string, status: string): Promise<DeliveryOrder | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private properties: Map<string, Property> = new Map();
  private bookings: Map<string, Booking> = new Map();
  private reviews: Map<string, Review> = new Map();
  private deliveryOrders: Map<string, DeliveryOrder> = new Map();

  constructor() {
    this.seedData();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date(),
      isHost: insertUser.isHost ?? false
    };
    this.users.set(id, user);
    return user;
  }

  // Property operations
  async getProperty(id: string): Promise<Property | undefined> {
    return this.properties.get(id);
  }

  async getProperties(filters?: {
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    amenities?: string[];
  }): Promise<Property[]> {
    let properties = Array.from(this.properties.values());
    
    if (filters) {
      if (filters.location) {
        properties = properties.filter(p => 
          p.location.toLowerCase().includes(filters.location!.toLowerCase())
        );
      }
      if (filters.minPrice !== undefined) {
        properties = properties.filter(p => 
          parseFloat(p.monthlyPrice) >= filters.minPrice!
        );
      }
      if (filters.maxPrice !== undefined) {
        properties = properties.filter(p => 
          parseFloat(p.monthlyPrice) <= filters.maxPrice!
        );
      }
      if (filters.amenities && filters.amenities.length > 0) {
        properties = properties.filter(p => 
          filters.amenities!.every(amenity => p.amenities?.includes(amenity))
        );
      }
    }
    
    return properties;
  }

  async getPropertiesByHost(hostId: string): Promise<Property[]> {
    return Array.from(this.properties.values()).filter(p => p.hostId === hostId);
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const id = randomUUID();
    const property: Property = {
      ...insertProperty,
      id,
      rating: "0.00",
      reviewCount: 0,
      createdAt: new Date(),
      images: insertProperty.images ?? [],
      amenities: insertProperty.amenities ?? [],
      hasStableElectricity: insertProperty.hasStableElectricity ?? true,
      hasKitchen: insertProperty.hasKitchen ?? true,
      hasWorkspace: insertProperty.hasWorkspace ?? false,
      hasAC: insertProperty.hasAC ?? false,
      hasCoffeeMachine: insertProperty.hasCoffeeMachine ?? false,
      isVerified: insertProperty.isVerified ?? false,
      internetSpeed: insertProperty.internetSpeed ?? null
    };
    this.properties.set(id, property);
    return property;
  }

  async updateProperty(id: string, updates: Partial<InsertProperty>): Promise<Property | undefined> {
    const property = this.properties.get(id);
    if (!property) return undefined;
    
    const updated = { ...property, ...updates };
    this.properties.set(id, updated);
    return updated;
  }

  // Booking operations
  async getBooking(id: string): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookingsByGuest(guestId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(b => b.guestId === guestId);
  }

  async getBookingsByProperty(propertyId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(b => b.propertyId === propertyId);
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    const booking: Booking = {
      ...insertBooking,
      id,
      depositRefunded: false,
      createdAt: new Date(),
      status: insertBooking.status ?? "pending"
    };
    this.bookings.set(id, booking);
    return booking;
  }

  async updateBookingStatus(id: string, status: string): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    
    const updated = { ...booking, status };
    this.bookings.set(id, updated);
    return updated;
  }

  // Review operations
  async getReviewsByProperty(propertyId: string): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(r => r.propertyId === propertyId);
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const id = randomUUID();
    const review: Review = { 
      ...insertReview, 
      id, 
      createdAt: new Date(),
      comment: insertReview.comment ?? null
    };
    this.reviews.set(id, review);
    
    // Update property rating
    const reviews = await this.getReviewsByProperty(insertReview.propertyId);
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    const property = this.properties.get(insertReview.propertyId);
    if (property) {
      const updated = {
        ...property,
        rating: avgRating.toFixed(2),
        reviewCount: reviews.length
      };
      this.properties.set(insertReview.propertyId, updated);
    }
    
    return review;
  }

  // Delivery operations
  async getDeliveryOrdersByGuest(guestId: string): Promise<DeliveryOrder[]> {
    return Array.from(this.deliveryOrders.values()).filter(o => o.guestId === guestId);
  }

  async createDeliveryOrder(insertOrder: InsertDeliveryOrder): Promise<DeliveryOrder> {
    const id = randomUUID();
    const order: DeliveryOrder = { 
      ...insertOrder, 
      id, 
      createdAt: new Date(),
      status: insertOrder.status ?? "pending",
      items: insertOrder.items ?? [],
      discountAmount: insertOrder.discountAmount ?? "0.00"
    };
    this.deliveryOrders.set(id, order);
    return order;
  }

  async updateDeliveryOrderStatus(id: string, status: string): Promise<DeliveryOrder | undefined> {
    const order = this.deliveryOrders.get(id);
    if (!order) return undefined;
    
    const updated = { ...order, status };
    this.deliveryOrders.set(id, updated);
    return updated;
  }

  private seedData() {
    // Create sample users
    const host1: User = {
      id: "host1",
      username: "sarah_host",
      email: "sarah@example.com",
      password: "hashed_password",
      firstName: "Sarah",
      lastName: "Johnson",
      isHost: true,
      createdAt: new Date("2024-01-15")
    };
    
    const host2: User = {
      id: "host2", 
      username: "mike_host",
      email: "mike@example.com",
      password: "hashed_password",
      firstName: "Mike",
      lastName: "Chen",
      isHost: true,
      createdAt: new Date("2024-02-01")
    };

    this.users.set(host1.id, host1);
    this.users.set(host2.id, host2);

    // Create sample properties
    const properties: Property[] = [
      {
        id: "prop1",
        hostId: "host1",
        title: "Modern Downtown Loft",
        description: "A stunning modern loft in the heart of downtown with city views, premium finishes, and all the amenities you need for extended stays.",
        location: "San Francisco, CA",
        monthlyPrice: "2450.00",
        depositAmount: "1200.00",
        bedrooms: 1,
        bathrooms: 1,
        images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3"],
        amenities: ["High-Speed Internet", "AC", "Work Space", "City View", "Premium Finishes"],
        internetSpeed: 100,
        hasStableElectricity: true,
        hasKitchen: true,
        hasWorkspace: true,
        hasAC: true,
        hasCoffeeMachine: true,
        rating: "4.90",
        reviewCount: 127,
        isVerified: true,
        createdAt: new Date("2024-01-20")
      },
      {
        id: "prop2",
        hostId: "host1",
        title: "Cozy Brooklyn Apartment", 
        description: "Charming apartment in Brooklyn with modern kitchen, cozy atmosphere, and excellent neighborhood amenities.",
        location: "Brooklyn, NY",
        monthlyPrice: "1850.00",
        depositAmount: "900.00",
        bedrooms: 1,
        bathrooms: 1,
        images: ["https://images.unsplash.com/photo-1556912173-3bb406ef7e77?ixlib=rb-4.0.3"],
        amenities: ["Ultra-Fast Internet", "Coffee Machine", "Full Kitchen", "Cozy Atmosphere"],
        internetSpeed: 150,
        hasStableElectricity: true,
        hasKitchen: true,
        hasWorkspace: false,
        hasAC: false,
        hasCoffeeMachine: true,
        rating: "4.80",
        reviewCount: 89,
        isVerified: true,
        createdAt: new Date("2024-02-10")
      },
      {
        id: "prop3",
        hostId: "host2",
        title: "Designer Studio",
        description: "A professionally designed studio perfect for remote work with fiber internet, ergonomic workspace, and modern amenities.",
        location: "Austin, TX", 
        monthlyPrice: "1650.00",
        depositAmount: "800.00",
        bedrooms: 0,
        bathrooms: 1,
        images: ["https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3"],
        amenities: ["Fiber Internet", "Monitor Included", "Backup Power", "Professional Setup"],
        internetSpeed: 200,
        hasStableElectricity: true,
        hasKitchen: true,
        hasWorkspace: true,
        hasAC: true,
        hasCoffeeMachine: false,
        rating: "5.00",
        reviewCount: 203,
        isVerified: true,
        createdAt: new Date("2024-03-01")
      }
    ];

    properties.forEach(property => {
      this.properties.set(property.id, property);
    });
  }
}

export const storage = new MemStorage();
