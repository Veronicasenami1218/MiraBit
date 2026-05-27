/**
 * src/controllers/user.controller.js – User preferences + account reset
 *
 * All endpoints here require NIP-98 authentication. The pubkey is taken
 * exclusively from req.nostrPubkey – never from a URL parameter – so a
 * user can never read/modify another user's settings.
 */

'use strict';

const userService = require('../services/user.service');
const { ok, badRequest } = require('../utils/response');
const logger = require('../utils/logger');

// ── GET /user/preferences ────────────────────────────────────────────────────
const getPreferences = async (req, res, next) => {
  try {
    const prefs = await userService.getPreferences(req.nostrPubkey);
    return ok(res, 'Preferences retrieved', prefs);
  } catch (err) { logger.error('getPreferences error:', err); next(err); }
};

// ── PUT /user/preferences ────────────────────────────────────────────────────
const updatePreferences = async (req, res, next) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return badRequest(res, 'Empty preferences payload');
    }
    const prefs = await userService.updatePreferences(req.nostrPubkey, req.body);
    return ok(res, 'Preferences updated', prefs);
  } catch (err) { logger.error('updatePreferences error:', err); next(err); }
};

// ── POST /user/account/reset ─────────────────────────────────────────────────
const resetAccount = async (req, res, next) => {
  try {
    const summary = await userService.resetAccount(req.nostrPubkey);
    return ok(res, 'Account data wiped', summary);
  } catch (err) { logger.error('resetAccount error:', err); next(err); }
};

module.exports = { getPreferences, updatePreferences, resetAccount };
