<div align="center">

# ⚡ MiraBit

### *Ominira (Freedom) + Bitcoin*

**A student-focused Bitcoin Lightning wallet powered by Nostr identity and the Breez SDK**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express)](https://expressjs.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Nostr](https://img.shields.io/badge/Nostr-NIP--98%20%7C%20NIP--47-purple)](https://github.com/nostr-protocol/nostr)
[![Lightning](https://img.shields.io/badge/Lightning-Breez%20SDK-F7931A?logo=bitcoin)](https://breez.technology)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

</div>

---

## Overview

**MiraBit** (*Ominira* — Yoruba for *Freedom* — combined with *Bitcoin*) is an open-source, student-focused Bitcoin Lightning wallet that makes Bitcoin savings, payments, and financial access simple and inclusive for students in Nigeria and beyond. It can be used offline to carry out transactions during poor network conditions on campuses or when students run out of mobile data. Once the user reconnects to the internet, all offline transactions are automatically synced.

## Problem
Many students face:

- Difficulty saving consistently
- Limited access to stable digital finance
- Challenges with online payments
- Poor internet connectivity
- Lack of beginner-friendly crypto education

## Solution
MiraBit provides an accessible platform where students can:

- Save with Naira or USDT and convert to BTC
- Pay for services using Bitcoin
- Convert between BTC, Naira, and USDT
- Use offline savings mode/offline access
- Make fast QR code payments
- Learn Bitcoin basics through a beginner-friendly learning mode

## Core Features
### 1. BTC Savings
Users can save in Naira or USDT and convert funds into Bitcoin for better value preservation and digital financial growth.

### 2. BTC Payments
Students can pay for services securely and seamlessly using Bitcoin.

### 3. Currency Conversion
Supports:

- BTC ↔ Naira
- BTC ↔ USDT
- USDT ↔ Naira

### 4. Offline Savings Mode
Allows users to access savings features and queue activities offline until internet connection is restored.

### 5. QR Payments
Enables quick and easy Bitcoin payments through QR code scanning.

### 6. Beginner Learning Mode
Provides simple educational content to help beginners understand Bitcoin and digital finance.

## Target Audience
University students
Young people interested in digital finance
Beginner crypto users
Goal
To promote financial freedom, digital savings, and accessible Bitcoin adoption for students.

## The platform combines three powerful technologies:

| Layer | Technology | Role |
|---|---|---|
| **Identity** | [Nostr](https://nostr.com) | Decentralised, self-sovereign user identity via keypairs |
| **Payments** | [Breez SDK Liquid](https://sdk-doc-liquid.breez.technology) | Non-custodial Lightning Network payments |
| **Currency** | CoinGecko API | Real-time BTC ↔ NGN ↔ USDT ↔ USD conversion |

Students save in Naira or USDT, convert to Bitcoin, send and receive Lightning payments, and manage everything through a clean mobile-first interface — no bank account required.

---

## Features

### Wallet & Payments
- ⚡ **Instant Lightning payments** — send and receive Bitcoin in seconds
- 🧾 **BOLT-11 invoice generation** — receive any amount with a scannable QR code
- 🔗 **LNURL-pay support** — pay Lightning addresses (e.g. `user@domain.com`)
- 📊 **Real-time balance** — Lightning + on-chain balance from the Breez SDK
- 📜 **Transaction history** — paginated list of all payments

### Currency Conversion
- 💱 **BTC ↔ NGN** — live Naira rates via CoinGecko
- 💱 **BTC ↔ USDT / USD** — stablecoin conversion support
- 🔁 **Satoshi ↔ BTC** — instant unit conversion utility

### Identity & Security
- 🔑 **Nostr-based identity** — users own their keypair (no email/password)
- 🛡️ **NIP-98 HTTP Auth** — every sensitive API call is authenticated with a signed Nostr event
- 🌐 **NIP-47 Wallet Connect (NWC)** — connect external apps to your wallet via Nostr

### Developer & Production Ready
- 🏗️ **Scalable MVC structure** — controllers, routes, services, middleware, utils
- 🪵 **Structured logging** — Winston with file rotation and request audit trail
- 🚦 **Rate limiting** — per-route limits to prevent abuse
- 🔒 **Security hardened** — Helmet, CORS, HPP, input sanitisation
- 🧪 **Jest test scaffold** — ready for unit and integration tests

---

## Tech Stack

| Category | Technology | Version |
|---|---|---|
| Runtime | Node.js | 18+ |
| Framework | Express | 4.x |
| Frontend | React + TypeScript + Vite | 19 / 4.x |
| UI Components | Radix UI + Tailwind CSS | Latest |
| Lightning SDK | Breez SDK Liquid | 0.6+ |
| Nostr | nostr-tools | 2.x |
| Validation | Joi | 17.x |
| Logging | Winston | 3.x |
| Rate Limiting | express-rate-limit | 7.x |
| Security | Helmet, HPP, CORS | Latest |
| Testing | Jest + Supertest | 29.x |

---

## Project Structure

```
MiraBit/
├── Frontend/                        # React + TypeScript + Vite UI
│   ├── src/
│   │   ├── components/              # Shared UI components (Radix/shadcn)
│   │   ├── contexts/                # React context providers
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── lib/                     # Utility functions
│   │   ├── pages/                   # Route-level page components
│   │   ├── App.tsx                  # App root
│   │   └── AppRouter.tsx            # React Router config
│   ├── package.json
│   └── vite.config.ts
│
└── Backend/                         # Node.js + Express API
    ├── src/
    │   ├── config/
    │   │   ├── index.js             # Centralised env/config object
    │   │   ├── breez.js             # Breez SDK connect config + validation
    │   │   └── nostr.js             # Relay list, private key, NIP kind constants
    │   │
    │   ├── controllers/             # Request handlers (thin layer)
    │   │   ├── health.controller.js # GET /health — liveness + readiness probes
    │   │   ├── wallet.controller.js # Wallet CRUD + balance + history
    │   │   ├── lightning.controller.js # Invoice create/pay, LNURL, node info
    │   │   ├── nostr.controller.js  # Relay status, profile fetch, NWC
    │   │   └── conversion.controller.js # Exchange rates + currency math
    │   │
    │   ├── routes/
    │   │   ├── index.js             # Root router (aggregates all feature routers)
    │   │   ├── health.routes.js     # /api/v1/health
    │   │   ├── wallet.routes.js     # /api/v1/wallet
    │   │   ├── lightning.routes.js  # /api/v1/lightning
    │   │   ├── nostr.routes.js      # /api/v1/nostr
    │   │   └── conversion.routes.js # /api/v1/conversion
    │   │
    │   ├── services/                # Business logic + external integrations
    │   │   ├── breez.service.js     # Breez SDK singleton (init, send, receive)
    │   │   ├── lightning.service.js # Lightning orchestration (delegates to breez)
    │   │   ├── nostr.service.js     # Relay pool, event publish/fetch, NWC handler
    │   │   ├── wallet.service.js    # Wallet lifecycle + balance management
    │   │   └── conversion.service.js # CoinGecko rates + TTL cache
    │   │
    │   ├── middleware/
    │   │   ├── auth.middleware.js   # NIP-98 HTTP Auth (requireNostrAuth / optionalNostrAuth)
    │   │   ├── errorHandler.js      # Global Express error handler (register last)
    │   │   ├── rateLimiter.js       # apiLimiter / strictLimiter / authLimiter
    │   │   ├── requestLogger.js     # Structured per-request audit logging
    │   │   └── validator.js         # Joi schema middleware factory (body/query/params)
    │   │
    │   ├── utils/
    │   │   ├── logger.js            # Winston logger (console + file transports)
    │   │   ├── response.js          # Consistent API response envelope helpers
    │   │   ├── crypto.js            # randomHex, sha256, hmacSha256, safeCompare
    │   │   └── nostr.utils.js       # Key derivation, event verification, NIP-98 validation
    │   │
    │   └── app.js                   # Express app factory (middleware + routes wired)
    │
    ├── server.js                    # HTTP server entry point + graceful shutdown
    ├── package.json
    ├── .env.example                 # Environment variable template (safe to commit)
    └── .gitignore
```

---

## API Reference

All endpoints are prefixed with `/api/v1`.

### Health
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Liveness probe |
| GET | `/health/detailed` | None | Readiness probe (services status) |

### Wallet
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/wallet/:pubkey` | None | Get wallet info |
| POST | `/wallet` | NIP-98 | Create wallet |
| GET | `/wallet/:pubkey/balance` | None | Get balance |
| GET | `/wallet/:pubkey/transactions` | None | Transaction history |

### Lightning
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/lightning/node/info` | None | Node info & balance |
| POST | `/lightning/invoice` | NIP-98 | Create receive invoice |
| POST | `/lightning/pay` | NIP-98 + strict rate limit | Pay BOLT-11 invoice |
| GET | `/lightning/payment/:hash` | None | Payment status |
| POST | `/lightning/lnurl/pay` | NIP-98 + strict rate limit | Pay LNURL address |

### Nostr
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/nostr/relays` | None | Relay connection status |
| GET | `/nostr/profile/:pubkey` | None | NIP-01 profile metadata |
| POST | `/nostr/event` | NIP-98 | Publish signed event |
| POST | `/nostr/nwc/request` | NIP-98 | Handle NIP-47 NWC command |

### Conversion
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/conversion/rates` | None | All exchange rates snapshot |
| GET | `/conversion/rate?from=BTC&to=NGN` | None | Specific pair rate |
| POST | `/conversion/convert` | None | Convert amount between currencies |
| GET | `/conversion/btc/sats?amount=0.001` | None | BTC → satoshis |
| GET | `/conversion/sats/btc?amount=100000` | None | Satoshis → BTC |

---

## Setup Instructions

### Prerequisites

- **Node.js 18+** — [Download](https://nodejs.org)
- **npm 9+** (bundled with Node.js)
- A **Breez API key** — [Request one](https://breez.technology)
- A **Nostr keypair** — generate with `nostr-tools` or [Alby](https://getalby.com)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/mirabit.git
cd mirabit

# Install backend dependencies
cd Backend
npm install

# Install frontend dependencies
cd ../Frontend
npm install
```

### 2. Configure Environment Variables

```bash
cd Backend
cp .env.example .env
```

Edit `.env` with your real credentials (see [Environment Variables](#environment-variables) below).

### 3. Run in Development

```bash
# Backend (from Backend/)
npm run dev

# Frontend (from Frontend/) — in a separate terminal
npm run dev
```

The backend starts at **http://localhost:5000**
The frontend starts at **http://localhost:5173**

### 4. Verify Installation

```bash
curl http://localhost:5000/api/v1/health
```

Expected response:
```json
{
  "success": true,
  "message": "MiraBit backend is alive",
  "data": {
    "status": "ok",
    "environment": "development",
    "timestamp": "2025-01-01T00:00:00.000Z",
    "version": "1.0.0"
  }
}
```

### 5. Run Tests

```bash
cd Backend
npm test
```

---

## Environment Variables

Create a `.env` file in `Backend/` by copying `.env.example`. The following variables are required for full functionality:

### Application

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `PORT` | No | `5000` | HTTP server port |
| `API_VERSION` | No | `v1` | URL prefix for all API routes |
| `ALLOWED_ORIGINS` | No | `http://localhost:5173` | Comma-separated CORS allowed origins |

### Breez SDK (Lightning Network)

| Variable | Required | Default | Description |
|---|---|---|---|
| `BREEZ_API_KEY` | **Yes** (prod) | — | API key from [breez.technology](https://breez.technology) |
| `BREEZ_MNEMONIC` | **Yes** (prod) | — | 12 or 24-word BIP-39 mnemonic for the Lightning wallet. **Never commit this.** |
| `BREEZ_WORKING_DIR` | No | `./breez_data` | Local directory for Breez SDK state files |

> ⚠️ The `BREEZ_MNEMONIC` controls your Lightning wallet's private keys. Store it in a secrets manager (e.g. HashiCorp Vault, AWS Secrets Manager) in production.

### Nostr

| Variable | Required | Default | Description |
|---|---|---|---|
| `NOSTR_PRIVATE_KEY` | **Yes** (prod) | — | Hex-encoded 32-byte private key for the backend's Nostr identity |
| `NOSTR_RELAYS` | No | 4 public relays | Comma-separated WebSocket relay URLs |

> 💡 Generate a Nostr keypair: `node -e "const {generateSecretKey,getPublicKey}=require('nostr-tools'); const sk=generateSecretKey(); console.log('priv:', Buffer.from(sk).toString('hex')); console.log('pub:', getPublicKey(sk));"`

### Currency Conversion

| Variable | Required | Default | Description |
|---|---|---|---|
| `COINGECKO_API_URL` | No | CoinGecko v3 | Base URL for the CoinGecko API |
| `COINGECKO_API_KEY` | No | — | Optional API key for higher rate limits |
| `RATE_CACHE_TTL_SECONDS` | No | `60` | How long to cache exchange rates |

### Rate Limiting

| Variable | Required | Default | Description |
|---|---|---|---|
| `RATE_LIMIT_WINDOW_MS` | No | `900000` (15 min) | Time window for rate limit counting |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per IP per window |

### Logging

| Variable | Required | Default | Description |
|---|---|---|---|
| `LOG_LEVEL` | No | `debug` | Winston log level: `error`, `warn`, `info`, `http`, `debug` |
| `LOG_DIR` | No | `./logs` | Directory for log files |

---

## Authentication — NIP-98

MiraBit uses **NIP-98 HTTP Authentication** for all sensitive routes. This means no passwords or JWTs — every authenticated request carries a short-lived, URL-bound Nostr event signed by the user's private key.

### How it works

```
1. Client constructs a Nostr event:
   {
     kind: 27235,
     created_at: Math.floor(Date.now() / 1000),
     tags: [
       ["u", "https://api.mirabit.com/api/v1/lightning/pay"],
       ["method", "POST"]
     ],
     content: ""
   }

2. Client signs the event with their nsec private key.

3. Client base64-encodes the JSON and sends it as a header:
   Authorization: Nostr <base64(JSON.stringify(signedEvent))>

4. Backend verifies:
   ✓ kind === 27235
   ✓ created_at within ±60 seconds of server time
   ✓ "u" tag matches the exact request URL
   ✓ "method" tag matches the HTTP method
   ✓ Schnorr signature is valid
```

The verified `pubkey` is then available as `req.nostrPubkey` in all downstream handlers.

---

## Nostr Protocol Support

| NIP | Name | Status | Usage |
|---|---|---|---|
| NIP-01 | Basic protocol | ✅ Implemented | Event structure, relay communication |
| NIP-04 | Encrypted DMs | ✅ Implemented | NWC request/response encryption |
| NIP-19 | Bech32 encoding | ✅ Implemented | npub/nsec/nevent encoding |
| NIP-47 | Wallet Connect | ✅ Implemented | External app → wallet commands |
| NIP-98 | HTTP Auth | ✅ Implemented | Securing all payment endpoints |
| NIP-57 | Zaps | 🔜 Planned | Send/receive Lightning zaps |
| NIP-05 | DNS Identity | 🔜 Planned | Verified Nostr addresses |

---

## Future Improvements

### Core Features
- [ ] **Persistent database** — replace in-memory wallet store with PostgreSQL or SQLite + Drizzle ORM
- [ ] **Push notifications** — notify users of incoming payments via Nostr DMs (NIP-04)
- [ ] **Nostr Zaps (NIP-57)** — send and receive Lightning tips through Nostr social feeds
- [ ] **USDT on-ramp** — direct Naira → USDT → BTC conversion flow
- [ ] **Offline queue** — cache payment intents locally and retry on reconnect

### Security & Infrastructure
- [ ] **Secrets management** — integrate HashiCorp Vault or AWS Secrets Manager
- [ ] **Database encryption** — encrypt wallet records at rest using AES-256
- [ ] **WebSocket relay** — real-time payment notifications via a server-sent event stream
- [ ] **Docker support** — `Dockerfile` + `docker-compose.yml` for one-command deployment
- [ ] **CI/CD pipeline** — GitHub Actions for lint, test, and deploy on every push

### UX & Accessibility
- [ ] **NIP-05 verified identity** — allow users to claim a `user@mirabit.app` Nostr address
- [ ] **QR code payments** — scan-to-pay with BOLT-11 and LNURL
- [ ] **Beginner learning mode** — in-app Bitcoin education tailored for students
- [ ] **Multi-language support** — English, Yoruba, Hausa, Igbo
- [ ] **Low-bandwidth mode** — compressed API responses for poor network conditions

### Business
- [ ] **Student savings goals** — BTC-denominated savings targets with progress tracking
- [ ] **Merchant QR payments** — allow campus merchants to accept Bitcoin
- [ ] **School fee payments** — direct BTC payment integration with university portals
- [ ] **Group savings (Ajo)** — Nostr-coordinated rotating savings groups

---

## Contributing

Contributions are welcome! Please open an issue to discuss the change before submitting a pull request.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a pull request

---

## License

[MIT](LICENSE) — Built with ❤️ for financial freedom.

---

<div align="center">
  <strong>Freedom through Bitcoin. ₿</strong>
</div>
