/**
 * babel.config.js – ONLY used by Jest (via babel-jest) to transpile
 * a small set of ESM-only node_modules (nostr-tools + @noble/*).
 *
 * Production runtime is plain CommonJS Node.js and does NOT use Babel.
 */

'use strict';

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
  ],
};
