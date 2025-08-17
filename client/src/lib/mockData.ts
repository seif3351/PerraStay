import { type Property, type User, type Booking, type Review, type DeliveryOrder } from "@shared/schema";

// Mock users for development
export const mockUsers: User[] = [
  {
    id: "host1",
    username: "sarah_host",
    email: "sarah@example.com",
    password: "hashed_password",
    firstName: "Sarah",
    lastName: "Johnson",
    isHost: true,
    createdAt: new Date("2024-01-15")
  },
  {
    id: "host2", 
    username: "mike_host",
    email: "mike@example.com",
    password: "hashed_password",
    firstName: "Mike",
    lastName: "Chen",
    isHost: true,
    createdAt: new Date("2024-02-01")
  },
  {
    id: "guest1",
    username: "john_guest",
    email: "john@example.com",
    password: "hashed_password",
    firstName: "John",
    lastName: "Doe",
    isHost: false,
    createdAt: new Date("2024-03-10")
  }
];

// Mock properties with real images and detailed amenities
export const mockProperties: Property[] = [
  {
    id: "prop1",
    hostId: "host1",
    title: "Modern Downtown Loft",
    description: "A stunning modern loft in the heart of downtown with floor-to-ceiling windows, premium finishes, and breathtaking city views. This space features contemporary design elements, high-end appliances, and thoughtful amenities perfect for extended stays. The open-concept layout maximizes natural light while providing distinct living, working, and sleeping areas.",
    location: "San Francisco, CA",
    monthlyPrice: "2450.00",
    depositAmount: "1200.00",
    bedrooms: 1,
    bathrooms: 1,
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
    ],
    amenities: [
      "High-Speed Internet",
      "AC", 
      "Work Space",
      "City View",
      "Premium Finishes",
      "Floor-to-Ceiling Windows",
      "In-Unit Laundry",
      "Dishwasher",
      "Balcony"
    ],
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
    description: "Charming pre-war apartment in the heart of Brooklyn with original hardwood floors, exposed brick walls, and modern updates throughout. The space combines historic character with contemporary amenities, featuring a fully renovated kitchen, comfortable living areas, and excellent natural light from large south-facing windows.",
    location: "Brooklyn, NY",
    monthlyPrice: "1850.00",
    depositAmount: "900.00",
    bedrooms: 1,
    bathrooms: 1,
    images: [
      "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
    ],
    amenities: [
      "Ultra-Fast Internet",
      "Coffee Machine",
      "Full Kitchen", 
      "Cozy Atmosphere",
      "Exposed Brick",
      "Hardwood Floors",
      "South-Facing Windows",
      "Updated Bathroom"
    ],
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
    description: "A professionally designed studio space perfect for creative professionals and remote workers. This thoughtfully curated environment features ergonomic furniture, professional lighting, dual monitors, and a dedicated workspace area. The space includes high-speed fiber internet, backup power solutions, and all the tools needed for productive extended stays.",
    location: "Austin, TX", 
    monthlyPrice: "1650.00",
    depositAmount: "800.00",
    bedrooms: 0,
    bathrooms: 1,
    images: [
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1541558869434-2840d308329a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1498300363139-1de8885f8804?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
    ],
    amenities: [
      "Fiber Internet",
      "Monitor Included", 
      "Backup Power",
      "Professional Setup",
      "Ergonomic Furniture",
      "Dual Monitors",
      "Professional Lighting",
      "Standing Desk"
    ],
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
  },
  {
    id: "prop4",
    hostId: "host2",
    title: "Luxury Penthouse Suite",
    description: "An exceptional penthouse suite with panoramic city views, premium amenities, and sophisticated design. This expansive space features a gourmet kitchen, spacious living areas, private terrace, and top-of-the-line furnishings. Perfect for executives and professionals seeking luxury accommodations for extended business stays.",
    location: "Miami, FL",
    monthlyPrice: "3200.00", 
    depositAmount: "1600.00",
    bedrooms: 2,
    bathrooms: 2,
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
    ],
    amenities: [
      "Gigabit Internet",
      "Ocean Views",
      "Private Terrace",
      "Gourmet Kitchen",
      "Luxury Furnishings",
      "Concierge Service",
      "Gym Access",
      "Pool Access",
      "Valet Parking"
    ],
    internetSpeed: 500,
    hasStableElectricity: true,
    hasKitchen: true,
    hasWorkspace: true,
    hasAC: true,
    hasCoffeeMachine: true,
    rating: "4.95",
    reviewCount: 78,
    isVerified: true,
    createdAt: new Date("2024-03-15")
  },
  {
    id: "prop5",
    hostId: "host1", 
    title: "Garden Cottage Retreat",
    description: "A charming garden cottage offering a peaceful retreat from city life while maintaining easy access to downtown amenities. This cozy space features a private garden, outdoor seating area, and thoughtfully designed interiors that blend comfort with functionality. Ideal for those seeking tranquility during extended stays.",
    location: "Portland, OR",
    monthlyPrice: "1400.00",
    depositAmount: "700.00",
    bedrooms: 1,
    bathrooms: 1,
    images: [
      "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1416331108676-a22ccb276e35?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
    ],
    amenities: [
      "High-Speed Internet",
      "Private Garden",
      "Outdoor Seating",
      "Peaceful Environment",
      "Natural Light",
      "Eco-Friendly",
      "Pet-Friendly",
      "Bicycle Included"
    ],
    internetSpeed: 75,
    hasStableElectricity: true,
    hasKitchen: true,
    hasWorkspace: true,
    hasAC: false,
    hasCoffeeMachine: true,
    rating: "4.75",
    reviewCount: 156,
    isVerified: true,
    createdAt: new Date("2024-04-01")
  }
];

// Mock bookings for development
export const mockBookings: Booking[] = [
  {
    id: "booking1",
    guestId: "guest1",
    propertyId: "prop1",
    checkInDate: new Date("2024-12-01"),
    checkOutDate: new Date("2025-03-01"),
    totalAmount: "7350.00", // 3 months * $2450
    depositAmount: "1200.00",
    status: "confirmed",
    depositRefunded: false,
    createdAt: new Date("2024-11-15")
  },
  {
    id: "booking2",
    guestId: "guest1", 
    propertyId: "prop2",
    checkInDate: new Date("2024-06-01"),
    checkOutDate: new Date("2024-08-01"),
    totalAmount: "3700.00", // 2 months * $1850
    depositAmount: "900.00",
    status: "completed",
    depositRefunded: true,
    createdAt: new Date("2024-05-15")
  }
];

// Mock reviews for development
export const mockReviews: Review[] = [
  {
    id: "review1",
    bookingId: "booking2",
    propertyId: "prop2",
    guestId: "guest1",
    rating: 5,
    comment: "Absolutely loved this place! The Brooklyn location was perfect and the apartment had so much character. Sarah was an excellent host and everything was exactly as described. Would definitely stay here again!",
    createdAt: new Date("2024-08-05")
  },
  {
    id: "review2",
    bookingId: "booking1",
    propertyId: "prop1", 
    guestId: "guest1",
    rating: 5,
    comment: "The downtown loft exceeded all expectations. The workspace setup was perfect for remote work and the city views were incredible. Highly recommend for business travelers.",
    createdAt: new Date("2024-12-15")
  }
];

// Mock delivery orders for development
export const mockDeliveryOrders: DeliveryOrder[] = [
  {
    id: "order1",
    guestId: "guest1",
    propertyId: "prop1",
    orderType: "groceries",
    items: ["Fresh fruits", "Vegetables", "Dairy products", "Pantry essentials"],
    totalAmount: "89.50",
    discountAmount: "13.43", // 15% discount
    status: "delivered",
    deliveryAddress: "Modern Downtown Loft, San Francisco, CA",
    createdAt: new Date("2024-12-10")
  },
  {
    id: "order2",
    guestId: "guest1",
    propertyId: "prop1", 
    orderType: "food",
    items: ["Thai green curry", "Pad thai", "Spring rolls", "Mango sticky rice"],
    totalAmount: "42.75",
    discountAmount: "10.69", // 25% discount
    status: "delivered", 
    deliveryAddress: "Modern Downtown Loft, San Francisco, CA",
    createdAt: new Date("2024-12-08")
  }
];

// Export all mock data as a single object for easy importing
export const mockData = {
  users: mockUsers,
  properties: mockProperties,
  bookings: mockBookings,
  reviews: mockReviews,
  deliveryOrders: mockDeliveryOrders
};
