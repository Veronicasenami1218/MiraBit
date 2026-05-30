/**
 * src/app.js – Express Application Factory
 *
 * Wires together all middleware, routes, and error handlers.
 * Intentionally kept free of server.listen() so it is fully testable.
 */

'use strict';

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const hpp        = require('hpp');
const compression = require('compression');
const morgan     = require('morgan');
const swaggerUi  = require('swagger-ui-express');

const config         = require('./config');
const routes         = require('./routes');
const swaggerSpec    = require('./docs/swagger');
const errorHandler   = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const requestLogger  = require('./middleware/requestLogger');
const logger         = require('./utils/logger');

const app = express();

// ── Trust proxy (required when running behind Nginx / load balancer) ─────────
app.set('trust proxy', 1);

// ── Security Headers (Helmet) ─────────────────────────────────────────────────
// Allow Swagger UI's inline styles & scripts on the /docs page only.
app.use(
  helmet({
    contentSecurityPolicy: false, // Swagger UI ships inline assets; relax CSP
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = config.allowedOrigins;

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin) return cb(null, true);
    // In development allow any localhost origin (different dev ports)
    try {
      const parsed = new URL(origin);
      if (config.nodeEnv !== 'production' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
        return cb(null, true);
      }
    } catch (e) {
      // ignore parse errors and fall through to whitelist check
    }
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Nostr-Event'],
  credentials: true,
}));

// ── HTTP Parameter Pollution Protection ──────────────────────────────────────
app.use(hpp());

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ── Body Parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── HTTP Access Logging (morgan → winston) ────────────────────────────────────
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// ── Custom Request Logger (structured) ───────────────────────────────────────
app.use(requestLogger);

// ── Global Rate Limiter ───────────────────────────────────────────────────────
app.use(`/api/${config.apiVersion}`, apiLimiter);

// ── Swagger / OpenAPI Documentation ──────────────────────────────────────────
// Interactive UI at /api/v1/docs, raw spec at /api/v1/docs.json
const docsBase = `/api/${config.apiVersion}/docs`;
app.get(`${docsBase}.json`, (req, res) => res.json(swaggerSpec));
app.use(docsBase, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'MiraBit API Docs',
  customCss: '.topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
  },
}));
// Convenience redirect: /docs → /api/v1/docs
app.get('/docs', (req, res) => res.redirect(docsBase));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use(`/api/${config.apiVersion}`, routes);

// ── Root Ping ─────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    service: 'MiraBit Backend',
    status:  'online',
    version: config.apiVersion,
    docs:    docsBase,
    health:  `/api/${config.apiVersion}/health`,
  });
});

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ── Global Error Handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

module.exports = app;
