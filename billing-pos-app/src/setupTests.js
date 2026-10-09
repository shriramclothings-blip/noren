// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Fix for libraries (e.g., jspdf/fast-png) requiring TextEncoder in Jest environment
if (typeof TextEncoder === 'undefined') {
  // eslint-disable-next-line global-require
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Fix for db layer (idb) requiring IndexedDB in Jest environment.
// For unit tests we only need React to render; DB calls should not crash.
if (typeof global.indexedDB === 'undefined') {
  const fakeIndexedDB = {
    open: () => {
      // idb expects an IDBRequest-like object with addEventListener.
      return {
        result: undefined,
        addEventListener: () => {},
        removeEventListener: () => {},
      };
    },
  };


  global.indexedDB = fakeIndexedDB;
  // Some libs access `indexedDB` as an unqualified global variable.
  // eslint-disable-next-line no-undef
  indexedDB = fakeIndexedDB;

  // idb expects these constructor globals to exist.
  // Minimal stubs so `instanceof IDBRequest` checks won't throw.
  const ensure = (name) => {
    if (typeof global[name] === 'undefined') global[name] = function () {};
  };

  ensure('IDBRequest');
  ensure('IDBTransaction');
  ensure('IDBDatabase');
  ensure('IDBObjectStore');
  ensure('IDBIndex');
  ensure('IDBCursor');


  // Make sure unqualified globals exist as well.
  global.IDBRequest = global.IDBRequest;
  global.IDBTransaction = global.IDBTransaction;
  global.IDBDatabase = global.IDBDatabase;
  global.IDBObjectStore = global.IDBObjectStore;
  global.IDBIndex = global.IDBIndex;
}










