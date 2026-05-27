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

const config         = require('./config');
const routes         = require('./routes');
const errorHandler   = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const requestLogger  = require('./middleware/requestLogger');
const logger         = require('./utils/logger');

const app = express();

// ── Trust proxy (required when running behind Nginx / load balancer) ─────────
app.set('trust proxy', 1);

// ── Security Headers (Helmet) ─────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = config.allowedOrigins;

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin) return cb(null, true);
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

// ── API Routes ────────────────────────────────────────────────────────────────
app.use(`/api/${config.apiVersion}`, routes);

// ── Root Ping ─────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    service: 'MiraBit Backend',
    status:  'online',
    version: config.apiVersion,
    docs:    `/api/${config.apiVersion}/health`,
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
