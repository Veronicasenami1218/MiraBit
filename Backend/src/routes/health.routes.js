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

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Liveness probe
 *     description: Always returns 200 if the process is alive.
 *     responses:
 *       200:
 *         description: Process is alive
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         status:      { type: string, example: ok }
 *                         environment: { type: string, example: development }
 *                         timestamp:   { type: string, format: date-time }
 *                         version:     { type: string, example: 1.0.0 }
 */
router.get('/', ping);

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     tags: [Health]
 *     summary: Readiness probe (checks DB + service availability)
 *     responses:
 *       200:
 *         description: Service health snapshot
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         api:      { type: object }
 *                         database: { type: object, properties: { connected: { type: boolean }, state: { type: string }, host: { type: string, nullable: true }, db: { type: string, nullable: true } } }
 *                         breez:    { type: object }
 *                         nostr:    { type: object }
 *                         uptime:   { type: string, example: '42s' }
 *                         memory:   { type: object }
 */
router.get('/detailed', detailed);

module.exports = router;
