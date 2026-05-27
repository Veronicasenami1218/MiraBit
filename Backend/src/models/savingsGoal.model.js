/**
 * src/models/savingsGoal.model.js – User Savings Goals
 *
 * Mirrors the FE `Goal` shape from src/pages/SavingsPage.tsx:21-28.
 * Each goal is scoped to a single Nostr pubkey.
 */

'use strict';

const { Schema, model } = require('mongoose');

const SavingsGoalSchema = new Schema(
  {
    pubkey: {
      type:      String,
      required:  true,
      lowercase: true,
      index:     true,
    },

    name:           { type: String, required: true, maxlength: 100, trim: true },
    emoji:          { type: String, default: '⭐', maxlength: 8 },
    target:         { type: Number, required: true, min: 0 },
    targetCurrency: { type: String, enum: ['BTC', 'NGN', 'USDT'], required: true },
    savedBtc:       { type: Number, default: 0, min: 0 },

    isAchieved: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => ({
        id:             ret._id.toString(),
        name:           ret.name,
        emoji:          ret.emoji,
        target:         ret.target,
        targetCurrency: ret.targetCurrency,
        savedBtc:       ret.savedBtc,
        isAchieved:     ret.isAchieved,
        createdAt:      ret.createdAt instanceof Date ? ret.createdAt.getTime() : ret.createdAt,
      }),
    },
  }
);

SavingsGoalSchema.index({ pubkey: 1, createdAt: -1 });

module.exports = model('SavingsGoal', SavingsGoalSchema);
