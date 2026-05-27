/**
 * src/config/database.js – MongoDB Atlas Connection
 *
 * Establishes and manages a single Mongoose connection to MongoDB Atlas.
 * Connection is opened once at startup (see server.js) and closed on
 * SIGINT / SIGTERM for a clean shutdown.
 *
 * Usage:
 *   const { connectDatabase, disconnectDatabase } = require('./config/database');
 *   await connectDatabase();
 */

'use strict';

const mongoose = require('mongoose');
const config   = require('./index');
const logger   = require('../utils/logger');

// Mongoose 7+ defaults are already strict, but be explicit for clarity.
mongoose.set('strictQuery', true);

let isConnected = false;

/**
 * Connect to MongoDB Atlas (or any Mongo URI in config.database.uri).
 * Safe to call multiple times – will short-circuit if already connected.
 *
 * @returns {Promise<typeof mongoose>}
 */
const connectDatabase = async () => {
  if (isConnected) {
    logger.debug('MongoDB: already connected – reusing existing connection');
    return mongoose;
  }

  const uri = config.database.uri;

  if (!uri) {
    const msg = 'MongoDB: MONGODB_URI is not set. Aborting database connect.';
    logger.error(msg);
    throw new Error(msg);
  }

  const options = {
    dbName:                 config.database.name,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS:        45_000,
    maxPoolSize:            config.database.maxPoolSize,
    minPoolSize:            config.database.minPoolSize,
    retryWrites:            true,
    appName:                'mirabit-backend',
  };

  logger.info(`MongoDB: connecting to Atlas (db: ${options.dbName})…`);

  try {
    await mongoose.connect(uri, options);
    isConnected = true;
    logger.info(`✅ MongoDB connected – host: ${mongoose.connection.host}, db: ${mongoose.connection.name}`);
  } catch (err) {
    logger.error('❌ MongoDB initial connection failed:', err.message);
    throw err;
  }

  // ── Connection lifecycle listeners ────────────────────────────────────────
  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB: disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    logger.info('MongoDB: reconnected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error:', err.message);
  });

  return mongoose;
};

/**
 * Gracefully close the Mongoose connection. Called on shutdown.
 * @returns {Promise<void>}
 */
const disconnectDatabase = async () => {
  if (!isConnected) return;
  try {
    await mongoose.connection.close(false);
    isConnected = false;
    logger.info('MongoDB connection closed cleanly.');
  } catch (err) {
    logger.error('Error closing MongoDB connection:', err.message);
  }
};

/**
 * Check live connection health (used by /health endpoint).
 * @returns {{ connected: boolean, state: string, host: string|null, db: string|null }}
 */
const getDatabaseStatus = () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return {
    connected: mongoose.connection.readyState === 1,
    state:     states[mongoose.connection.readyState] || 'unknown',
    host:      mongoose.connection.host || null,
    db:        mongoose.connection.name || null,
  };
};

module.exports = { connectDatabase, disconnectDatabase, getDatabaseStatus, mongoose };
