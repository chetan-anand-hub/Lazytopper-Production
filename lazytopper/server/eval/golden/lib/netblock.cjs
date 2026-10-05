'use strict';
// lib/netblock.cjs — HARD network block for the zero-call golden gate (G1).
//
// Installed BEFORE any server module is required by the CI scorer. Every outbound path
// Node offers is replaced by a stub that THROWS and is COUNTED:
//   globalThis.fetch, http.request/get, https.request/get, net.connect/createConnection,
//   net.Socket.prototype.connect, tls.connect, dns.lookup / dns.promises.lookup.
// `attempts()` is what the gate prints as `calls=`; the gate's verdict is FAIL whenever it
// is non-zero. golden.test.cjs proves each stub fires (a guard not shown to fire is not
// present).

const http = require('http');
const https = require('https');
const net = require('net');
const tls = require('tls');
const dns = require('dns');

class NetworkBlockedError extends Error {
  constructor(what) {
    super('golden gate: outbound network blocked (' + what + ') — the CI scorer must make ZERO model calls');
    this.name = 'NetworkBlockedError';
    this.code = 'ENETBLOCKED';
  }
}

let installed = false;
let count = 0;
const log = [];

function blocked(what) {
  return function blockedNetworkStub() {
    count += 1;
    log.push(what);
    throw new NetworkBlockedError(what);
  };
}

function install() {
  if (installed) return;
  installed = true;
  globalThis.fetch = async function blockedFetch(url) {
    count += 1;
    log.push('fetch ' + String(url).replace(/\?.*$/, ''));
    throw new NetworkBlockedError('fetch');
  };
  http.request = blocked('http.request');
  http.get = blocked('http.get');
  https.request = blocked('https.request');
  https.get = blocked('https.get');
  net.connect = blocked('net.connect');
  net.createConnection = blocked('net.createConnection');
  net.Socket.prototype.connect = blocked('net.Socket.connect');
  tls.connect = blocked('tls.connect');
  dns.lookup = blocked('dns.lookup');
  if (dns.promises) dns.promises.lookup = blocked('dns.promises.lookup');
}

module.exports = {
  install,
  attempts: () => count,
  attemptLog: () => log.slice(),
  isInstalled: () => installed,
  NetworkBlockedError,
};
