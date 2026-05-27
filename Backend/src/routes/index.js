/**
 * src/routes/index.js – API Route Aggregator
 *
 * Mounts all feature routers under their respective path prefixes.
 * This file is imported by src/app.js.
 */

'use strict';

const { Router } = require('express');

const healthRoutes     = require('./health.routes');
const walletRoutes     = require('./wallet.routes');
const lightningRoutes  = require('./lightning.routes');
const nostrRoutes      = require('./nostr.routes');
const conversionRoutes = require('./conversion.routes');

const router = Router();

router.use('/health',     healthRoutes);
router.use('/wallet',     walletRoutes);
router.use('/lightning',  lightningRoutes);
router.use('/nostr',      nostrRoutes);
router.use('/conversion', conversionRoutes);

module.exports = router;
