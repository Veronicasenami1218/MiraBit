/**
 * src/docs/swagger.js – OpenAPI 3.0 Specification (generated via swagger-jsdoc)
 *
 * The shared spec lives here (info, servers, security schemes, reusable
 * schemas). Per-endpoint operations are documented inline in the route
 * files via @swagger JSDoc blocks – swagger-jsdoc stitches everything
 * together at startup.
 *
 * Visit /api/v1/docs in a browser to see the interactive UI.
 */

'use strict';

const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');
const config = require('../config');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title:       'MiraBit Backend API',
      version:     '1.0.0',
      description: [
        'REST API for **MiraBit** — a Nostr-authenticated Bitcoin Lightning ',
        'wallet for students. Provides wallet management, currency conversion, ',
        'savings goals, learning rewards, and a server-persisted offline ',
        'payment queue.',
        '',
        '### Authentication',
        'Mutating endpoints require a **NIP-98** signed event ',
        '(`Authorization: Nostr <base64-event>`). The event must be:',
        '- `kind: 27235`',
        '- have a `["u", "<full request URL>"]` tag',
        '- have a `["method", "<HTTP METHOD>"]` tag',
        '- `created_at` within ±60s of server time',
        '- signed by the Nostr private key of the account being acted upon',
        '',
        '### Response envelope',
        'All endpoints return either:',
        '```json',
        '{ "success": true,  "message": "...", "data": {...}, "meta"?: {...} }',
        '```',
        'or',
        '```json',
        '{ "success": false, "message": "...", "errors"?: [...] }',
        '```',
      ].join('\n'),
      contact: {
        name: 'MiraBit',
        url:  'https://github.com/Veronicasenami1218/MiraBit',
      },
      license: { name: 'MIT' },
    },
    servers: [
      {
        url:         `http://localhost:${config.port}/api/${config.apiVersion}`,
        description: 'Local development',
      },
      {
        url:         `https://api.example.com/api/${config.apiVersion}`,
        description: 'Production (update before deploy)',
      },
    ],
    components: {
      securitySchemes: {
        Nip98Auth: {
          type:         'http',
          scheme:       'Nostr',
          description:  'NIP-98 signed event (base64-encoded) – see top of page',
        },
      },
      schemas: {
        // ── Envelopes ─────────────────────────────────────────────────
        SuccessEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string',  example: 'OK' },
            data:    { description: 'Endpoint-specific payload (varies)' },
            meta:    { type: 'object', description: 'Pagination or other metadata', nullable: true },
          },
          required: ['success', 'message'],
        },
        ErrorEnvelope: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string',  example: 'Something went wrong' },
            errors: {
              type: 'array',
              nullable: true,
              items: {
                type: 'object',
                properties: {
                  field:   { type: 'string', example: 'amount' },
                  message: { type: 'string', example: 'must be positive' },
                },
              },
            },
          },
          required: ['success', 'message'],
        },

        // ── Core domain types (mirror Frontend src/lib/mirabit.ts) ────
        Currency: { type: 'string', enum: ['BTC', 'NGN', 'USDT'] },
        TxType:   { type: 'string', enum: ['save', 'convert', 'pay', 'receive', 'learn-reward'] },
        TxStatus: { type: 'string', enum: ['completed', 'pending', 'queued', 'failed', 'expired'] },

        Wallet: {
          type: 'object',
          properties: {
            id:           { type: 'string', example: '65f0fdc3a1...' },
            pubkey:       { type: 'string', example: 'a'.repeat(64) },
            balances: {
              type: 'object',
              properties: {
                BTC:  { type: 'number', example: 0.0008 },
                NGN:  { type: 'number', example: 25000 },
                USDT: { type: 'number', example: 15 },
              },
            },
            lightningBalanceSats: { type: 'integer', example: 0 },
            onchainBalanceSats:   { type: 'integer', example: 0 },
            pendingSats:          { type: 'integer', example: 0 },
            preferredCurrency:    { $ref: '#/components/schemas/Currency' },
            isActive:             { type: 'boolean', example: true },
            createdAt:            { type: 'string', format: 'date-time' },
            updatedAt:            { type: 'string', format: 'date-time' },
          },
        },

        WalletBalance: {
          type: 'object',
          properties: {
            pubkey:   { type: 'string' },
            balances: { $ref: '#/components/schemas/Wallet/properties/balances' },
            lightningBalanceSats: { type: 'integer' },
            onchainBalanceSats:   { type: 'integer' },
            pendingSats:          { type: 'integer' },
            retrievedAt:          { type: 'string', format: 'date-time' },
          },
        },

        Transaction: {
          type: 'object',
          properties: {
            id:           { type: 'string' },
            type:         { $ref: '#/components/schemas/TxType' },
            status:       { $ref: '#/components/schemas/TxStatus' },
            fromCurrency: { allOf: [{ $ref: '#/components/schemas/Currency' }], nullable: true },
            fromAmount:   { type: 'number' },
            toCurrency:   { $ref: '#/components/schemas/Currency' },
            toAmount:     { type: 'number' },
            note:         { type: 'string', nullable: true },
            counterparty: { type: 'string', nullable: true },
            createdAt:    { type: 'integer', description: 'Unix ms' },
          },
        },

        Rates: {
          type: 'object',
          properties: {
            BTC_USD:   { type: 'number', example: 67500 },
            USD_NGN:   { type: 'number', example: 1580 },
            updatedAt: { type: 'integer', description: 'Unix ms', example: 1733000000000 },
            isStale:   { type: 'boolean', example: false },
          },
          required: ['BTC_USD', 'USD_NGN', 'updatedAt', 'isStale'],
        },

        SavingsGoal: {
          type: 'object',
          properties: {
            id:             { type: 'string' },
            name:           { type: 'string', example: 'New laptop' },
            emoji:          { type: 'string', example: '💻' },
            target:         { type: 'number', example: 500000 },
            targetCurrency: { $ref: '#/components/schemas/Currency' },
            savedBtc:       { type: 'number', example: 0.0012 },
            isAchieved:     { type: 'boolean', example: false },
            createdAt:      { type: 'integer', description: 'Unix ms' },
          },
        },

        Lesson: {
          type: 'object',
          properties: {
            id:          { type: 'string', example: 'what-is-bitcoin' },
            title:       { type: 'string' },
            emoji:       { type: 'string' },
            duration:    { type: 'string', example: '2 min' },
            summary:     { type: 'string' },
            content:     { type: 'array', items: { type: 'string' } },
            question:    { type: 'string' },
            options:     { type: 'array', items: { type: 'string' } },
            rewardBtc:   { type: 'number', example: 0.00000050 },
            explanation: { type: 'string' },
          },
        },

        LearnProgress: {
          type: 'object',
          properties: {
            pubkey:    { type: 'string' },
            completed: { type: 'array', items: { type: 'string' } },
            earnedBtc: { type: 'number' },
            lastCompletedAt: { type: 'integer', nullable: true, description: 'Unix ms' },
          },
        },

        UserPreferences: {
          type: 'object',
          properties: {
            theme:                { type: 'string', enum: ['dark', 'light', 'system'] },
            displayCurrency:      { type: 'string', enum: ['NGN', 'USD', 'USDT', 'BTC'] },
            useAppBlossomServers: { type: 'boolean' },
            simulatedOffline:     { type: 'boolean' },
            relayMetadata: {
              type: 'object',
              properties: {
                relays: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      url:   { type: 'string', example: 'wss://relay.damus.io' },
                      read:  { type: 'boolean' },
                      write: { type: 'boolean' },
                    },
                  },
                },
                updatedAt: { type: 'integer' },
              },
            },
            blossomServerMetadata: {
              type: 'object',
              properties: {
                servers:   { type: 'array', items: { type: 'string' } },
                updatedAt: { type: 'integer' },
              },
            },
          },
        },

        QueuedPayment: {
          type: 'object',
          properties: {
            id:            { type: 'string' },
            status:        { type: 'string', enum: ['queued', 'processing', 'completed', 'failed', 'cancelled'] },
            recipient:     { type: 'string' },
            recipientType: { type: 'string', enum: ['invoice', 'lnurl', 'onchain', 'handle', 'unknown'] },
            amount:        { type: 'number' },
            sourceCurrency: { $ref: '#/components/schemas/Currency' },
            amountSats:    { type: 'integer', nullable: true },
            note:          { type: 'string', nullable: true },
            attempts:      { type: 'integer' },
            maxAttempts:   { type: 'integer' },
            lastError:     { type: 'string', nullable: true },
            paymentHash:   { type: 'string', nullable: true },
            settledAt:     { type: 'string', format: 'date-time', nullable: true },
            createdAt:     { type: 'string', format: 'date-time' },
          },
        },

        FlushSummary: {
          type: 'object',
          properties: {
            processed: { type: 'integer', example: 3 },
            completed: { type: 'integer', example: 2 },
            failed:    { type: 'integer', example: 1 },
            retried:   { type: 'integer', example: 0 },
            items:     { type: 'array', items: { $ref: '#/components/schemas/QueuedPayment' } },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'NIP-98 auth missing or invalid',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
        },
        Forbidden: {
          description: 'Authenticated, but not owner of the requested resource',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
        },
        NotFound: {
          description: 'Resource does not exist',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
        },
        BadRequest: {
          description: 'Validation or business-rule failure',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
        },
        ValidationError: {
          description: 'Schema validation failed',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
        },
      },
      parameters: {
        PubkeyParam: {
          name: 'pubkey',
          in:   'path',
          required: true,
          description: 'Nostr hex public key (64 chars)',
          schema: { type: 'string', minLength: 64, maxLength: 64, pattern: '^[0-9a-f]{64}$' },
        },
        IdParam: {
          name: 'id',
          in:   'path',
          required: true,
          description: 'Mongo ObjectId (24 hex chars)',
          schema: { type: 'string', minLength: 24, maxLength: 24, pattern: '^[0-9a-f]{24}$' },
        },
      },
    },
    tags: [
      { name: 'Health',        description: 'Liveness + readiness probes' },
      { name: 'Wallet',        description: 'Wallet CRUD, balance, transactions, deposits, conversion, savings, rewards' },
      { name: 'Lightning',     description: 'Lightning Network invoice/pay/LNURL operations' },
      { name: 'Payments',      description: 'Offline payment queue – enqueue, list, cancel, flush' },
      { name: 'Conversion',    description: 'BTC/NGN/USDT/USD exchange rates and conversion' },
      { name: 'Savings',       description: 'Savings goals CRUD' },
      { name: 'Learn',         description: 'Lesson catalogue, progress, quiz reward' },
      { name: 'User',          description: 'Per-user preferences and account reset' },
      { name: 'Nostr',         description: 'Nostr relay status, profile lookup, event publishing, NWC' },
    ],
  },
  apis: [
    // Use forward slashes – swagger-jsdoc's glob layer doesn't normalise Windows paths
    path.join(__dirname, '..', 'routes', '*.js').replace(/\\/g, '/'),
    path.join(__dirname, '..', 'controllers', '*.js').replace(/\\/g, '/'),
  ],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
