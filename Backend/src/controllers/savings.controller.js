/**
 * src/controllers/savings.controller.js – Savings Goal CRUD
 *
 * Owner-only: all endpoints require NIP-98 auth and operate on the
 * authenticated pubkey (req.nostrPubkey). Goal IDs in the URL are
 * additionally checked against ownership inside the service layer.
 */

'use strict';

const savingsService = require('../services/savings.service');
const { ok, created, notFound, badRequest } = require('../utils/response');
const logger = require('../utils/logger');

const listGoals = async (req, res, next) => {
  try {
    const goals = await savingsService.listGoals(req.nostrPubkey);
    return ok(res, 'Goals retrieved', goals);
  } catch (err) { logger.error('listGoals error:', err); next(err); }
};

const createGoal = async (req, res, next) => {
  try {
    const goal = await savingsService.createGoal({
      pubkey: req.nostrPubkey,
      ...req.body,
    });
    return created(res, 'Goal created', goal);
  } catch (err) { logger.error('createGoal error:', err); next(err); }
};

const updateGoal = async (req, res, next) => {
  try {
    const goal = await savingsService.updateGoal(req.nostrPubkey, req.params.id, req.body);
    if (!goal) return notFound(res, 'Goal not found or not owned by you');
    return ok(res, 'Goal updated', goal);
  } catch (err) {
    logger.error('updateGoal error:', err);
    if (err.name === 'CastError') return badRequest(res, 'Invalid goal id');
    next(err);
  }
};

const deleteGoal = async (req, res, next) => {
  try {
    const deleted = await savingsService.deleteGoal(req.nostrPubkey, req.params.id);
    if (!deleted) return notFound(res, 'Goal not found or not owned by you');
    return ok(res, 'Goal deleted', { id: req.params.id });
  } catch (err) {
    logger.error('deleteGoal error:', err);
    if (err.name === 'CastError') return badRequest(res, 'Invalid goal id');
    next(err);
  }
};

module.exports = { listGoals, createGoal, updateGoal, deleteGoal };
