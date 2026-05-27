/**
 * Unit tests for src/utils/crypto.js
 */

'use strict';

const { randomHex, sha256, hmacSha256, safeCompare, generateRef } = require('../../src/utils/crypto');

describe('utils/crypto', () => {
  test('randomHex(16) returns 32 hex chars', () => {
    const out = randomHex(16);
    expect(out).toMatch(/^[0-9a-f]{32}$/);
  });

  test('randomHex is non-deterministic', () => {
    expect(randomHex(8)).not.toBe(randomHex(8));
  });

  test('sha256 produces deterministic 64-char hex', () => {
    const a = sha256('hello');
    const b = sha256('hello');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  test('sha256 of "" matches well-known empty-string hash', () => {
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  test('hmacSha256 produces deterministic 64-char hex', () => {
    const a = hmacSha256('key', 'msg');
    const b = hmacSha256('key', 'msg');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  test('hmacSha256 changes with the key', () => {
    expect(hmacSha256('k1', 'm')).not.toBe(hmacSha256('k2', 'm'));
  });

  test('safeCompare is true for equal strings', () => {
    expect(safeCompare('abc', 'abc')).toBe(true);
  });

  test('safeCompare is false for different strings', () => {
    expect(safeCompare('abc', 'abd')).toBe(false);
    expect(safeCompare('abc', 'abcd')).toBe(false);
  });

  test('generateRef returns a non-empty string', () => {
    const ref = generateRef();
    expect(typeof ref).toBe('string');
    expect(ref.length).toBeGreaterThan(4);
  });
});
