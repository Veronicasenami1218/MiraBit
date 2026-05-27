/**
 * src/models/exchangeRate.model.js – Persistent Currency-Rate Cache
 *
 * The conversion service used to keep rates in an in-process Map.
 * That cache was lost on every restart and not shared across instances.
 * This model persists the latest snapshot in MongoDB so multiple
 * server replicas (or a restarted process) can serve cached rates
 * instantly while a fresh fetch is in flight.
 *
 * We intentionally store a single document (upserted by `key: 'latest'`)
 * – not historical timeseries. Historical analytics is out of scope here.
 */

'use strict';

const { Schema, model } = require('mongoose');

const ExchangeRateSchema = new Schema(
  {
    key: {
      type:     String,
      required: true,
      unique:   true,
      default:  'latest',
    },

    rates: {
      BTC_USD:  { type: Number, required: true },
      BTC_NGN:  { type: Number, required: true },
      USDT_USD: { type: Number, required: true },
      USDT_NGN: { type: Number, required: true },
    },

    source:    { type: String, default: 'coingecko' },
    fetchedAt: { type: Date,   required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = model('ExchangeRate', ExchangeRateSchema);
