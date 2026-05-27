/**
 * Unit tests for the recipient classifier inside the queue service.
 * Loaded WITHOUT booting the app, so no DB connection is needed.
 */

'use strict';

// We mock the deeper services so the require chain doesn't try real network/DB
require('../helpers/mocks').install();

const { classifyRecipient } = require('../../src/services/queue.service');

describe('queue.service.classifyRecipient', () => {
  test.each([
    ['lnbc100n1ps0xyz...',                                  'invoice'],
    ['LNBC100N1PS0XYZ',                                     'invoice'],
    ['lntb500u1mocktestnetinvoice',                         'invoice'],
    ['LNURL1DP68GURN8GHJ7AMPD3KX2AR0VEEKZAR0WD5XJTNRDAKJ7TNHV4KXCTTTDEHHWM30D3H82UNVWQHKZURF9AMRZTMHV9MKWYESJG9JG', 'lnurl'],
    ['lightning:LNURL1DP68GURN8GHJ7AMPD3KX2AR0VEEKZAR0WD5XJ', 'lnurl'],
    ['bc1q9h8d2v9zmuxq3kdg4t8w5e3yzhmsexample',             'onchain'],
    ['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',                  'onchain'],
    ['3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5',                  'onchain'],
    ['@alice',                                              'handle'],
    ['hello',                                               'unknown'],
    ['',                                                    'unknown'],
    [null,                                                  'unknown'],
    [undefined,                                             'unknown'],
  ])('classifies %j → %s', (input, expected) => {
    expect(classifyRecipient(input)).toBe(expected);
  });
});
