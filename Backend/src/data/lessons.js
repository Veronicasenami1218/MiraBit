/**
 * src/data/lessons.js – Bitcoin Beginner Lesson Catalogue
 *
 * Mirrors the lesson data the frontend currently hard-codes in
 * src/lib/lessons.ts so the server can:
 *   - serve the catalogue (GET /learn/lessons)
 *   - verify quiz answers server-side (POST /learn/complete)
 *
 * The shape matches the FE `Lesson` interface exactly.
 *
 * Reward values are small (0.00000050 BTC = 50 sats) so a misbehaving
 * client cannot drain a meaningful amount even if it spams "complete".
 */

'use strict';

const LESSONS = [
  {
    id:       'what-is-bitcoin',
    title:    'What is Bitcoin?',
    emoji:    '₿',
    duration: '2 min',
    summary:  'Learn what Bitcoin is and why it matters for everyday savings.',
    content: [
      'Bitcoin is a digital currency that lets you send and receive value across the internet without a bank in the middle.',
      'It was invented in 2009 by Satoshi Nakamoto and has a fixed supply of 21 million coins — no one can print more.',
      'Because it is digital and global, you can use it just as easily for a ₦200 snack as for a $200 transfer to another country.',
    ],
    question:    'Why is Bitcoin called "scarce"?',
    options: [
      'Because only banks can issue it',
      'Because its total supply is capped at 21 million',
      'Because it gets harder to use every year',
    ],
    answerIndex: 1,
    rewardBtc:   0.00000050,
    explanation: 'Bitcoin\'s code limits its total supply to 21 million coins, which is what makes it scarce.',
  },
  {
    id:       'why-save-in-btc',
    title:    'Why save in BTC?',
    emoji:    '💰',
    duration: '3 min',
    summary:  'Understand how saving in Bitcoin can protect your money from inflation.',
    content: [
      'Local currencies often lose value over time because governments can print more.',
      'Bitcoin\'s fixed supply means its value tends to hold or grow as more people use it.',
      'Saving even small amounts in BTC regularly is called "stacking sats" — it adds up over time.',
    ],
    question:    'What is "stacking sats"?',
    options: [
      'Paying bills with Bitcoin',
      'Saving small amounts of Bitcoin regularly',
      'Mining Bitcoin on your phone',
    ],
    answerIndex: 1,
    rewardBtc:   0.00000050,
    explanation: 'Stacking sats means consistently buying or saving small amounts of Bitcoin (1 BTC = 100M sats).',
  },
  {
    id:       'wallets-and-keys',
    title:    'Wallets & Keys',
    emoji:    '🔐',
    duration: '3 min',
    summary:  'Discover how Bitcoin wallets work and why your private key is everything.',
    content: [
      'A Bitcoin wallet does not store coins — it stores keys that prove you own them.',
      'Your public key is like a bank account number you can share. Your private key is the password — never share it.',
      'If someone gets your private key, they can take your Bitcoin. If you lose it, you lose access forever.',
    ],
    question:    'What should you NEVER share?',
    options: [
      'Your wallet address',
      'Your public key',
      'Your private key / seed phrase',
    ],
    answerIndex: 2,
    rewardBtc:   0.00000050,
    explanation: 'Your private key (or seed phrase) is the only thing that proves you own your Bitcoin. Guard it.',
  },
  {
    id:       'lightning-payments',
    title:    'Lightning payments',
    emoji:    '⚡',
    duration: '3 min',
    summary:  'See how the Lightning Network makes Bitcoin payments fast and cheap.',
    content: [
      'On-chain Bitcoin payments can take minutes and cost more in fees.',
      'The Lightning Network is a layer on top that settles small payments instantly with almost no fee.',
      'MiraBit uses Lightning so a ₦50 transfer is just as practical as a larger one.',
    ],
    question:    'Why does MiraBit use Lightning?',
    options: [
      'It is faster and cheaper for small payments',
      'It only works for very large amounts',
      'It requires a bank account',
    ],
    answerIndex: 0,
    rewardBtc:   0.00000050,
    explanation: 'Lightning settles small payments in seconds for fractions of a cent, perfect for student-scale spending.',
  },
];

module.exports = { LESSONS };
