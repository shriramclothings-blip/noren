const express = require('express');
const proto = express.application;
['use','get','post','put','delete','patch'].forEach(name => {
  const orig = proto[name];
  proto[name] = function(...args) {
    const bad = args.some(a => a !== undefined && typeof a !== 'function' && !Array.isArray(a));
    if (bad) {
      console.error('BAD app', name, args.map(a => ({ type: typeof a, value: a && a.name ? a.name : String(a) })));
      console.error(new Error().stack);
    }
    return orig.apply(this, args);
  };
});
const routerProto = express.Router().constructor.prototype;
['use','get','post','put','delete','patch'].forEach(name => {
  const orig = routerProto[name];
  routerProto[name] = function(...args) {
    const bad = args.some(a => a !== undefined && typeof a !== 'function' && !Array.isArray(a));
    if (bad) {
      console.error('BAD router', name, args.map(a => ({ type: typeof a, value: a && a.name ? a.name : String(a) })));
      console.error(new Error().stack);
    }
    return orig.apply(this, args);
  };
});
process.on('uncaughtException', err => {
  console.error('UNCHECKED EXCEPTION', err.stack || err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNCHECKED REJECTION', reason && reason.stack ? reason.stack : reason);
  process.exit(1);
});

try {
  require('./server.js');
} catch (e) {
  console.error('REQUIRE ERROR', e.stack || e);
}
