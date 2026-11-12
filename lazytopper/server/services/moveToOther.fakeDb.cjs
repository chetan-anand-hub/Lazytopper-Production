'use strict';
/**
 * Test-only in-memory Firestore for the SIGNED-IN-MOVE-1 tests: optimistic transactions (reads recorded, commit re-checks versions),
 * subcollections, `.limit(n)` queries readable inside a transaction, tx.delete, and auto-id docs (`collection('x').doc()`).
 */
function fakeDb(seed = {}) {
  const docs = new Map();
  for (const [k, v] of Object.entries(seed)) docs.set(k, { data: { ...v }, version: 1 });
  let auto = 0;
  const snapOf = (key, entry) => ({ id: key.split('/').pop(), exists: !!entry, data: () => (entry ? { ...entry.data } : undefined) });
  const write = (key, data, opts) => {
    const prev = docs.get(key);
    const base = opts && opts.merge && prev ? prev.data : {};
    docs.set(key, { data: { ...base, ...data }, version: (prev ? prev.version : 0) + 1 });
  };
  const docRef = (key) => ({
    key,
    kind: 'doc',
    collection: (sub) => colRef(`${key}/${sub}`),
    async get() { return snapOf(key, docs.get(key)); },
    async set(d, o) { write(key, d, o); },
  });
  const colRef = (path) => ({
    path,
    kind: 'col',
    doc: (id) => docRef(`${path}/${id || `auto${(auto += 1)}`}`),
    limit(n) {
      return {
        kind: 'query',
        path,
        n,
        async get() {
          const keys = childrenOf(path, n);
          return { docs: keys.map((k) => snapOf(k, docs.get(k))), size: keys.length, empty: keys.length === 0 };
        },
      };
    },
  });
  const childrenOf = (path, n) =>
    [...docs.keys()].filter((k) => k.startsWith(`${path}/`) && !k.slice(path.length + 1).includes('/')).sort().slice(0, n);
  const db = {
    docs,
    read: (k) => (docs.get(k) ? { ...docs.get(k).data } : undefined),
    keys: (prefix) => [...docs.keys()].filter((k) => k.startsWith(prefix)),
    collection: (name) => colRef(name),
    async runTransaction(fn) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const seen = new Map();
        const pending = [];
        const tx = {
          async get(r) {
            await new Promise((res) => setImmediate(res));
            if (r.kind === 'query') {
              const keys = childrenOf(r.path, r.n);
              for (const k of keys) seen.set(k, docs.get(k).version);
              return { docs: keys.map((k) => snapOf(k, docs.get(k))), size: keys.length, empty: keys.length === 0 };
            }
            const e = docs.get(r.key);
            seen.set(r.key, e ? e.version : 0);
            return snapOf(r.key, e);
          },
          set(r, d, o) { pending.push(['set', r.key, d, o]); },
          delete(r) { pending.push(['del', r.key]); },
        };
        const out = await fn(tx);
        await new Promise((res) => setImmediate(res));
        const conflict = [...seen].some(([k, v]) => (docs.get(k) ? docs.get(k).version : 0) !== v);
        if (conflict) continue;
        for (const [op, k, d, o] of pending) (op === 'set' ? write(k, d, o) : docs.delete(k));
        return out;
      }
      throw new Error('too many retries');
    },
  };
  return db;
}
module.exports = { fakeDb };
