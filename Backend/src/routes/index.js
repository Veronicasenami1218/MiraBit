/**
 * src/routes/index.js – API Route Aggregator
 *
 * Mounts all feature routers under their respective path prefixes.
 * This file is imported by src/app.js.
 *
 * Mounted under `/api/v1` (see app.js):
 *   /health      – liveness + readiness
 *   /wallet      – wallet CRUD, balance, transactions, deposit, convert, save, reward
 *   /lightning   – LN invoice, pay, status, lnurl
 *   /payments    – offline payment queue (enqueue, list, cancel, flush)
 *   /nostr       – relays, profiles, signed events, NWC
 *   /conversion  – exchange rates, currency conversion
 *   /savings     – savings goals CRUD
 *   /learn       – lessons + progress + reward
 *   /user        – preferences + account reset
 */

'use strict';

const { Router } = require('express');

const healthRoutes     = require('./health.routes');
const walletRoutes     = require('./wallet.routes');
const lightningRoutes  = require('./lightning.routes');
const paymentsRoutes   = require('./queue.routes');
const nostrRoutes      = require('./nostr.routes');
const conversionRoutes = require('./conversion.routes');
const savingsRoutes    = require('./savings.routes');
const learnRoutes      = require('./learn.routes');
const userRoutes       = require('./user.routes');

const router = Router();

router.use('/health',     healthRoutes);
router.use('/wallet',     walletRoutes);
router.use('/lightning',  lightningRoutes);
router.use('/payments',   paymentsRoutes);
router.use('/nostr',      nostrRoutes);
router.use('/conversion', conversionRoutes);
router.use('/savings',    savingsRoutes);
router.use('/learn',      learnRoutes);
router.use('/user',       userRoutes);

module.exports = router;
