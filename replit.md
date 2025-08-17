# Perra - Medium-Term Rental Platform

## Overview

Perra is a modern medium-term rental platform specializing in 1+ month stays for digital nomads and remote workers. The platform focuses on properties with premium amenities like high-speed internet, reliable electricity, and dedicated workspaces. The name derives from ancient Egyptian words "per" (home) and "ra" (sun), representing a home away from home with bright possibilities.

The application features property listings with detailed amenities, booking management, user dashboards for both hosts and guests, and integrated delivery services for food and essentials. The platform emphasizes verified properties and comprehensive filtering to help users find the perfect extended stay.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom design tokens for the Perra brand
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful API endpoints following resource-based patterns
- **Storage Layer**: Abstracted storage interface with in-memory implementation for development
- **Route Organization**: Centralized route registration with modular endpoint handlers
- **Middleware**: Custom logging middleware for API request tracking

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema generation
- **Development Storage**: In-memory storage implementation for rapid development
- **Connection**: Neon serverless PostgreSQL for production deployments

### Database Schema Design
- **Users**: Support for both hosts and guests with role-based functionality
- **Properties**: Comprehensive property data including amenities, pricing, and verification status
- **Bookings**: Full booking lifecycle management with status tracking and deposit handling
- **Reviews**: Property review system for guest feedback
- **Delivery Orders**: Integrated delivery service for food and essentials

### Authentication and Authorization
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple
- **Role-Based Access**: Host and guest roles with appropriate permissions
- **Security**: Secure session handling with HTTP-only cookies

### Development Environment
- **Hot Reloading**: Vite development server with HMR support
- **Error Handling**: Runtime error overlay for development debugging
- **Build Process**: Separate client and server build pipelines
- **Development Tools**: Replit integration with live preview capabilities

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database queries and schema management
- **PostgreSQL**: Primary database for all application data

### UI and Design System
- **Radix UI**: Accessible headless UI components for complex interactions
- **shadcn/ui**: Pre-built component library with consistent design patterns
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Icon library for consistent iconography

### Development and Build Tools
- **Vite**: Fast build tool and development server with React plugin
- **TypeScript**: Static type checking across the entire application
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind CSS integration

### Image and Asset Management
- **Unsplash**: External image hosting for property photos and placeholders
- **Google Fonts**: Custom font loading for Inter, Poppins, and other typefaces
- **Static Assets**: Local asset management through Vite's asset pipeline

### Form and Validation
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: Runtime type validation and schema definition
- **Hookform Resolvers**: Integration between React Hook Form and Zod validation

### State Management and API
- **TanStack React Query**: Server state management with caching and synchronization
- **Fetch API**: Native browser API for HTTP requests with custom wrappers
- **Query Invalidation**: Automatic data refetching on mutations