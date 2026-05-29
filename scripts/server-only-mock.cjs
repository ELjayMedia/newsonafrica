// CJS preload: makes `server-only` a no-op when running scripts outside Next.js
const Module = require('module');
const original = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request === 'server-only') return request;
  return original.call(this, request, ...args);
};
require.cache['server-only'] = {
  id: 'server-only',
  filename: 'server-only',
  loaded: true,
  exports: {},
};
