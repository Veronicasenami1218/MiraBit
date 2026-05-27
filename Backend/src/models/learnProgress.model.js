/**
 * src/models/learnProgress.model.js – Per-user Learning Progress
 *
 * One document per pubkey. Tracks completed lesson IDs and the
 * cumulative BTC earned from quiz rewards.
 * Mirrors `LearnProgress { completed: string[]; earnedBtc: number }` (FE).
 */

'use strict';

const { Schema, model } = require('mongoose');

const LearnProgressSchema = new Schema(
  {
    pubkey: {
      type:      String,
      required:  true,
      unique:    true,
      index:     true,
      lowercase: true,
    },

    completed: { type: [String], default: [] },     // lesson ids
    earnedBtc: { type: Number,   default: 0, min: 0 },
    lastCompletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => ({
        pubkey:    ret.pubkey,
        completed: ret.completed,
        earnedBtc: ret.earnedBtc,
        lastCompletedAt: ret.lastCompletedAt
          ? (ret.lastCompletedAt instanceof Date
              ? ret.lastCompletedAt.getTime()
              : ret.lastCompletedAt)
          : null,
      }),
    },
  }
);

module.exports = model('LearnProgress', LearnProgressSchema);
