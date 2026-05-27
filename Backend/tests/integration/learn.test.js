/**
 * Integration: /api/v1/learn endpoints
 */

'use strict';

require('../helpers/mocks').install();

const { connectTestDb, disconnectTestDb, clearTestDb } = require('../helpers/db');
const { startTestServer } = require('../helpers/server');
const { makeKeypair } = require('../helpers/auth');
const { LESSONS } = require('../../src/data/lessons');

let ctx, alice;

beforeAll(async () => {
  await connectTestDb();
  ctx = await startTestServer();
  alice = makeKeypair();
});
afterEach(async () => { await clearTestDb(); });
afterAll(async () => { await ctx.close(); await disconnectTestDb(); });

const base = '/api/v1/learn';

describe('GET /lessons (public)', () => {
  test('returns all lessons without the answer key', async () => {
    const res = await ctx.request.get(`${base}/lessons`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(LESSONS.length);
    for (const l of res.body.data) {
      expect(l).not.toHaveProperty('answerIndex'); // server keeps the answer secret
      expect(l.options.length).toBeGreaterThan(0);
    }
  });
});

describe('GET /progress', () => {
  test('requires auth', async () => {
    const res = await ctx.request.get(`${base}/progress`);
    expect(res.status).toBe(401);
  });

  test('returns empty progress on first call (auto-create)', async () => {
    const res = await ctx.signed(alice.sk, 'GET', `${base}/progress`);
    expect(res.status).toBe(200);
    expect(res.body.data.completed).toEqual([]);
    expect(res.body.data.earnedBtc).toBe(0);
  });
});

describe('POST /complete', () => {
  test('rejects wrong answer with explanation', async () => {
    const lesson = LESSONS[0];
    const wrongIdx = lesson.answerIndex === 0 ? 1 : 0;
    const res = await ctx.signed(alice.sk, 'POST', `${base}/complete`, {
      lessonId: lesson.id, answerIndex: wrongIdx,
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/[Ii]ncorrect/);
    // The 422/400 helper places the explanation under `error` in the envelope
    // via badRequest(res, msg, { explanation, correctIndex })
    expect(res.body.error).toBeDefined();
    expect(res.body.error.explanation).toBe(lesson.explanation);
  });

  test('correct answer credits the reward and marks completed', async () => {
    const lesson = LESSONS[0];
    const res = await ctx.signed(alice.sk, 'POST', `${base}/complete`, {
      lessonId: lesson.id, answerIndex: lesson.answerIndex,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.alreadyCompleted).toBe(false);
    expect(res.body.data.awardedBtc).toBe(lesson.rewardBtc);
    expect(res.body.data.progress.completed).toContain(lesson.id);
    expect(res.body.data.transaction).toBeDefined();
    expect(res.body.data.transaction.type).toBe('learn-reward');
  });

  test('repeat completion is idempotent (no double reward)', async () => {
    const lesson = LESSONS[0];

    const first = await ctx.signed(alice.sk, 'POST', `${base}/complete`, {
      lessonId: lesson.id, answerIndex: lesson.answerIndex,
    });
    expect(first.status).toBe(200);
    expect(first.body.data.awardedBtc).toBe(lesson.rewardBtc);

    const second = await ctx.signed(alice.sk, 'POST', `${base}/complete`, {
      lessonId: lesson.id, answerIndex: lesson.answerIndex,
    });
    expect(second.status).toBe(200);
    expect(second.body.data.alreadyCompleted).toBe(true);
    expect(second.body.data.awardedBtc).toBe(0);
    expect(second.body.data.progress.completed.filter(id => id === lesson.id))
      .toHaveLength(1);
  });

  test('returns 404 for unknown lesson', async () => {
    const res = await ctx.signed(alice.sk, 'POST', `${base}/complete`, {
      lessonId: 'no-such-lesson', answerIndex: 0,
    });
    expect(res.status).toBe(404);
  });
});
