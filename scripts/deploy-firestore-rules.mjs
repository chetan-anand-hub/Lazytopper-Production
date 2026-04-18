/**
 * Deploy Firestore security rules to Firebase without requiring
 * full project-owner IAM (avoids the serviceusage.googleapis.com
 * pre-flight check that the firebase-tools CLI performs).
 *
 * Usage:
 *   node scripts/deploy-firestore-rules.mjs
 *   # or via pnpm:
 *   pnpm deploy:firestore-rules
 *
 * Required environment variables:
 *   FIREBASE_SERVICE_ACCOUNT_KEY  — JSON string of the Firebase service account key
 *   VITE_FIREBASE_PROJECT_ID      — Firebase project ID (e.g. "lazzyy-topper")
 */

import fs from 'node:fs';
import https from 'node:https';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_PATH = path.resolve(__dirname, '..', 'firestore.rules');

function assertEnv(key) {
  const val = process.env[key]?.trim();
  if (!val) {
    console.error(`\n❌  Missing required environment variable: ${key}`);
    console.error(`    Set it as a Replit secret before running this script.\n`);
    process.exit(1);
  }
  return val;
}

const saKeyRaw = assertEnv('FIREBASE_SERVICE_ACCOUNT_KEY');
const projectId = assertEnv('VITE_FIREBASE_PROJECT_ID');

let saKey;
try {
  saKey = JSON.parse(saKeyRaw);
} catch {
  console.error('❌  FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON.');
  process.exit(1);
}

if (!fs.existsSync(RULES_PATH)) {
  console.error(`❌  firestore.rules not found at: ${RULES_PATH}`);
  process.exit(1);
}
const rulesContent = fs.readFileSync(RULES_PATH, 'utf8');

function makeJWT(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: [
      'https://www.googleapis.com/auth/firebase',
      'https://www.googleapis.com/auth/cloud-platform',
    ].join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');
  const unsigned = `${header}.${claims}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  return `${unsigned}.${signer.sign(sa.private_key, 'base64url')}`;
}

function httpsReq(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const buf = body != null ? Buffer.from(body) : null;
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method,
        headers: {
          ...(buf ? { 'Content-Length': buf.length } : {}),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      },
    );
    req.on('error', reject);
    if (buf) req.write(buf);
    req.end();
  });
}

async function getAccessToken() {
  const jwt = makeJWT(saKey);
  const form = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
  const res = await httpsReq('POST', 'https://oauth2.googleapis.com/token', form, {
    'Content-Type': 'application/x-www-form-urlencoded',
  });
  if (res.status !== 200) {
    console.error('❌  Failed to obtain access token:', res.body);
    process.exit(1);
  }
  return JSON.parse(res.body).access_token;
}

async function createRuleset(token) {
  const body = JSON.stringify({
    source: { files: [{ name: 'firestore.rules', content: rulesContent }] },
  });
  const res = await httpsReq(
    'POST',
    `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
    body,
    { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  );
  if (res.status !== 200) {
    console.error('❌  Failed to create ruleset:', res.status, res.body);
    process.exit(1);
  }
  return JSON.parse(res.body);
}

async function updateRelease(token, rulesetName) {
  const relName = `projects/${projectId}/releases/cloud.firestore`;
  const body = JSON.stringify({ release: { name: relName, rulesetName } });

  const patchRes = await httpsReq(
    'PATCH',
    `https://firebaserules.googleapis.com/v1/${relName}`,
    body,
    { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  );

  if (patchRes.status === 200) return JSON.parse(patchRes.body);

  if (patchRes.status === 404) {
    const createBody = JSON.stringify({ name: relName, rulesetName });
    const createRes = await httpsReq(
      'POST',
      `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`,
      createBody,
      { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    );
    if (createRes.status === 200) return JSON.parse(createRes.body);
    console.error('❌  Failed to create release:', createRes.status, createRes.body);
    process.exit(1);
  }

  console.error('❌  Failed to update release:', patchRes.status, patchRes.body);
  process.exit(1);
}

async function main() {
  console.log(`\nDeploying Firestore rules → project: ${projectId}`);
  console.log(`  Rules file: ${RULES_PATH}\n`);

  console.log('  [1/3] Obtaining access token...');
  const token = await getAccessToken();
  console.log('        ✓ Token obtained');

  console.log('  [2/3] Creating ruleset...');
  const ruleset = await createRuleset(token);
  console.log(`        ✓ Ruleset: ${ruleset.name}`);

  console.log('  [3/3] Updating cloud.firestore release...');
  const release = await updateRelease(token, ruleset.name);
  console.log(`        ✓ Release updated: ${release.name}`);
  console.log(`        ✓ Points to: ${release.rulesetName}`);
  console.log(`        ✓ Updated at: ${release.updateTime}`);

  console.log('\n✅  Firestore rules deployed successfully.\n');
}

main().catch((err) => {
  console.error('\n❌  Unexpected error:', err);
  process.exit(1);
});
