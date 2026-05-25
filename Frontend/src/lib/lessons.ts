export interface Lesson {
  id: string;
  title: string;
  emoji: string;
  duration: string;
  summary: string;
  /** Content paragraphs (plain text). */
  content: string[];
  /** Single multiple-choice question to unlock the sat reward. */
  question: string;
  options: string[];
  /** Index in `options` of the correct answer. */
  answerIndex: number;
  /** BTC reward on correct answer. */
  rewardBtc: number;
  explanation: string;
}

export const LESSONS: Lesson[] = [
  {
    id: "what-is-bitcoin",
    title: "What is Bitcoin?",
    emoji: "₿",
    duration: "3 min read",
    summary: "Money for the internet — created by people, not a single company or government.",
    content: [
      "Bitcoin is digital money. Unlike Naira in your bank account, it isn't created or controlled by any single bank, company or government.",
      "Anyone with a phone and an internet connection can send and receive Bitcoin — no application form, no waiting in line. That's why it's especially useful for students: low barriers, global reach.",
      "Bitcoin runs on a network of thousands of computers worldwide. Every transaction is recorded in a public ledger called the blockchain, which makes it transparent and very hard to fake.",
    ],
    question: "Who controls Bitcoin?",
    options: ["A single company", "The Nigerian government", "A global network of computers", "Your bank"],
    answerIndex: 2,
    rewardBtc: 0.00002,
    explanation:
      "No single entity controls Bitcoin. It's maintained by a global, open network of computers running the same software.",
  },
  {
    id: "satoshis",
    title: "Satoshis — Bitcoin's small units",
    emoji: "🔬",
    duration: "2 min read",
    summary: "1 Bitcoin = 100,000,000 sats. You don't need a whole BTC to get started.",
    content: [
      "A common myth is that you need a lot of money to buy Bitcoin. You don't. 1 BTC is divisible into 100,000,000 smaller units called satoshis (or 'sats' for short).",
      "If 1 BTC ≈ ₦80 million, then 1 sat ≈ ₦0.80. Saving even ₦500 buys you hundreds of sats — and they're yours.",
      "Most modern Bitcoin apps (including MiraBit) let you save and pay in fractions of a BTC, down to a single satoshi.",
    ],
    question: "How many satoshis are in 1 Bitcoin?",
    options: ["1,000", "1,000,000", "10,000,000", "100,000,000"],
    answerIndex: 3,
    rewardBtc: 0.00002,
    explanation:
      "Exactly 100,000,000 satoshis make up 1 BTC. That's why you can save tiny amounts and still own real Bitcoin.",
  },
  {
    id: "wallets-keys",
    title: "Wallets & keys (not your keys, not your coins)",
    emoji: "🔑",
    duration: "4 min read",
    summary: "A wallet holds keys, not coins. Keys = ownership. Protect them.",
    content: [
      "A Bitcoin 'wallet' isn't a wallet for cash — it's an app that holds your keys. Two keys matter: the public key (your address, safe to share) and the private key (only you should ever see it).",
      "If someone gets your private key, they can spend all your Bitcoin. If you lose it with no backup, your Bitcoin is gone forever — nobody can reset it for you.",
      "Most wallets give you a recovery phrase: 12 or 24 random words. Write it down on paper, store it somewhere safe, and never type it into a random website.",
    ],
    question: "What gives you ownership of your Bitcoin?",
    options: [
      "Your username and password",
      "Your private key",
      "An email confirmation",
      "Your phone number",
    ],
    answerIndex: 1,
    rewardBtc: 0.00003,
    explanation:
      "Whoever holds the private key owns the Bitcoin. That's why it's said: 'not your keys, not your coins.'",
  },
  {
    id: "why-save-btc",
    title: "Why save in Bitcoin?",
    emoji: "📈",
    duration: "3 min read",
    summary: "Inflation eats Naira. Bitcoin has a fixed supply of 21 million coins.",
    content: [
      "When prices keep going up but your salary doesn't, that's inflation. Naira savings can lose purchasing power year after year.",
      "Bitcoin works differently: only 21 million bitcoins will ever exist. New bitcoins are created at a slowing, predictable rate. There's no government printer.",
      "Bitcoin can be volatile in the short term — its price goes up and down. But many people use it as long-term savings, putting in small amounts regularly (a strategy called Dollar-Cost Averaging or DCA).",
    ],
    question: "What is the maximum number of bitcoins that will ever exist?",
    options: ["100 million", "1 billion", "21 million", "Unlimited"],
    answerIndex: 2,
    rewardBtc: 0.00003,
    explanation:
      "Only 21 million BTC will ever exist. This hard supply cap is one reason people use Bitcoin as long-term savings.",
  },
  {
    id: "stay-safe",
    title: "Staying safe with crypto",
    emoji: "🛡️",
    duration: "3 min read",
    summary: "If it sounds too good to be true, it is. Verify before you send.",
    content: [
      "Crypto is fast and final: once a Bitcoin payment is confirmed, it can't be reversed. That means a few habits go a long way.",
      "Never share your recovery phrase. No real support agent will ever ask for it.",
      "Beware of 'double your Bitcoin' offers, urgency-laden DMs, and unfamiliar links. Scammers thrive on emotion.",
      "Always double-check the address you're sending to — copy/paste, then verify the first and last 4 characters. A test send of a small amount first is normal and smart.",
    ],
    question: "If someone offers to 'double your Bitcoin' in 24 hours, you should:",
    options: [
      "Send a small amount to test",
      "Ignore and block them — it's a scam",
      "Send half to be safe",
      "Ask them for proof and then send",
    ],
    answerIndex: 1,
    rewardBtc: 0.00004,
    explanation:
      "There's no legitimate way to 'double' your Bitcoin. These are always scams designed to steal what you send.",
  },
];
