/**
 * src/routes/health.routes.js
 *
 * GET /api/v1/health          – liveness probe
 * GET /api/v1/health/detailed – readiness probe (checks internal services)
 */

'use strict';

const { Router } = require('express');
const { ping, detailed } = require('../controllers/health.controller');

const router = Router();

router.get('/',        ping);
router.get('/detailed', detailed);

module.exports = router;
