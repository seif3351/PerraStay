import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import helmet from "helmet";
import session from "express-session";
import csurf from "csurf";
import { randomBytes } from "crypto";
import { initDb } from "./db";
import path from "path";

const app = express();

// Security middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https:", "http:"]
    },
  },
}));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());

// Validate session secret is set
if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET environment variable must be set in production');
  }
  console.warn('Warning: SESSION_SECRET not set. Using a random secret for development');
}

const SESSION_SECRET = process.env.SESSION_SECRET || randomBytes(32).toString('hex');

// Session management
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'session', // Don't use default 'connect.sid'
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Requires HTTPS in production
    httpOnly: true, // Prevents client-side access to the cookie
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict' // CSRF protection
  }
}));

// CSRF protection - apply after session middleware
const csrfProtection = csurf({
  cookie: {
    key: '_csrf',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    httpOnly: true
  }
});

// Add CSRF protection to all routes except GET requests and public endpoints
app.use((req, res, next) => {
  // Skip CSRF for GET requests as they should be idempotent
  if (req.method === 'GET') {
    return next();
  }

  // Skip CSRF for public endpoints and multipart form data uploads
  const publicPaths = ['/api/signin', '/api/users', '/api/resend-verification', '/api/upload-image'];
  if (publicPaths.includes(req.path) || req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }

  // Apply CSRF protection to all other routes
  csrfProtection(req, res, next);
});

// Expose CSRF token to the frontend
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Don't log sensitive authentication responses
      if (capturedJsonResponse && !path.includes("/signin") && !path.includes("/signup")) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Initialize database connection first
    await initDb();
    log('Database initialized successfully');

    // Setup routes after database is ready
    const server = await registerRoutes(app);

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error: ${status} - ${message}`);
      res.status(status).json({ error: message });
    });

    // Setup Vite or static serving
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen({
      port,
      host: "127.0.0.1"
    }, () => {
      log(`Server started successfully on port ${port}`);
    });
  } catch (error) {
    log(`Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
})().catch(error => {
  log(`Unhandled error during server startup: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
});
