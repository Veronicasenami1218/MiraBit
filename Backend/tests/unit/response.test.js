/**
 * Unit tests for src/utils/response.js – the response envelope helpers.
 */

'use strict';

const {
  ok, created, badRequest, unauthorized, forbidden, notFound,
  validationError, tooManyRequests, serverError,
} = require('../../src/utils/response');

function makeRes() {
  const res = {};
  res.status = jest.fn((code) => { res.statusCode = code; return res; });
  res.json   = jest.fn((body)  => { res.body = body; return res; });
  return res;
}

describe('utils/response', () => {
  test('ok() returns 200 envelope with data + meta', () => {
    const res = makeRes();
    ok(res, 'hello', { a: 1 }, { page: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'hello', data: { a: 1 }, meta: { page: 1 } });
  });

  test('ok() omits data/meta when null', () => {
    const res = makeRes();
    ok(res, 'pong');
    expect(res.body).toEqual({ success: true, message: 'pong' });
  });

  test('created() returns 201', () => {
    const res = makeRes();
    created(res, 'made', { id: 'x' });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('badRequest() returns 400 with optional error', () => {
    const res = makeRes();
    badRequest(res, 'bad', 'reason');
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ success: false, message: 'bad', error: 'reason' });
  });

  test('unauthorized() returns 401', () => {
    const res = makeRes();
    unauthorized(res);
    expect(res.statusCode).toBe(401);
  });

  test('forbidden() returns 403', () => {
    const res = makeRes();
    forbidden(res);
    expect(res.statusCode).toBe(403);
  });

  test('notFound() returns 404', () => {
    const res = makeRes();
    notFound(res, 'gone');
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('gone');
  });

  test('validationError() returns 422 with errors array', () => {
    const res = makeRes();
    validationError(res, 'fail', [{ field: 'x', message: 'no' }]);
    expect(res.statusCode).toBe(422);
    expect(res.body.errors).toHaveLength(1);
  });

  test('tooManyRequests() returns 429', () => {
    const res = makeRes();
    tooManyRequests(res);
    expect(res.statusCode).toBe(429);
  });

  test('serverError() returns 500', () => {
    const res = makeRes();
    serverError(res);
    expect(res.statusCode).toBe(500);
  });
});
