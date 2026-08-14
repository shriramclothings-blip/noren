const express = require("express");
const proto = express.application;
["use","get","post","put","delete","patch"].forEach(name => {
  const orig = proto[name];
  proto[name] = function(...args) {
    const bad = args.some(a => a !== undefined && typeof a !== "function" && !Array.isArray(a));
    if (bad) {
      console.error("BAD app", name, args.map(a => ({ type: typeof a, value: a && a.name ? a.name : String(a) })));
      console.error(new Error().stack);
    }
    return orig.apply(this, args);
  };
});
const routerProto = express.Router().constructor.prototype;
["use","get","post","put","delete","patch"].forEach(name => {
  const orig = routerProto[name];
  routerProto[name] = function(...args) {
    const bad = args.some(a => a !== undefined && typeof a !== "function" && !Array.isArray(a));
    if (bad) {
      console.error("BAD router", name, args.map(a => ({ type: typeof a, value: a && a.name ? a.name : String(a) })));
      console.error(new Error().stack);
    }
    return orig.apply(this, args);
  };
});
try {
  require("./backend/server.js");
} catch (e) {
  console.error("ERR", e.stack || e);
}
