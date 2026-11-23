'use strict';
// lib/schemeCallContext.cjs — GRADER-TYPE-1 fix round (E-c). A scheme-GENERATION call is tagged AT CALL TIME: schemeCache wraps the
// generator's callGemini in `schemeCallAls.run(true, …)`, and lib/live.cjs marks the call record `scheme: true` the moment it creates
// it — so a FAILED scheme call (error / 429 / timeout) is tagged exactly like a successful one and never stays in the grading pool.
const { AsyncLocalStorage } = require('async_hooks');
module.exports = { schemeCallAls: new AsyncLocalStorage() };
