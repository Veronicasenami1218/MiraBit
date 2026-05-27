/**
 * src/models/userPreferences.model.js – Per-user App Settings
 *
 * Mirrors the FE `AppConfig` shape from src/components/AppProvider.tsx
 * plus `displayCurrency` referenced in the audit.
 * Stored as one document per Nostr pubkey.
 */

'use strict';

const { Schema, model } = require('mongoose');

const UserPreferencesSchema = new Schema(
  {
    pubkey: {
      type:      String,
      required:  true,
      unique:    true,
      index:     true,
      lowercase: true,
    },

    theme: {
      type:    String,
      enum:    ['dark', 'light', 'system'],
      default: 'system',
    },

    displayCurrency: {
      type:    String,
      enum:    ['NGN', 'USD', 'USDT', 'BTC'],
      default: 'NGN',
    },

    useAppBlossomServers: { type: Boolean, default: true },
    simulatedOffline:     { type: Boolean, default: false },

    // Nostr-side metadata (NIP-65 relay list, BUD-03 blossom servers)
    relayMetadata: {
      relays: [{
        url:   { type: String, required: true },
        read:  { type: Boolean, default: true  },
        write: { type: Boolean, default: true  },
      }],
      updatedAt: { type: Number, default: 0 },
    },

    blossomServerMetadata: {
      servers:   { type: [String], default: [] },
      updatedAt: { type: Number,   default: 0 },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

module.exports = model('UserPreferences', UserPreferencesSchema);
