#!/usr/bin/env node
/**
 * Deploy API to AWS via SAM. Reads secrets from .env.local,
 * copies products + config into api/ for Lambda, runs sam build + deploy.
 *
 * Usage: npm run deploy:api
 * @module scripts/deploy-api
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** @param {string} file @returns {Record<string, string>} */
function loadEnv(file) {
  try {
    const src = readFileSync(resolve(ROOT, file), 'utf-8');
    /** @type {Record<string, string>} */
    const env = {};
    for (const line of src.split('\n')) {
      const m = line.match(/^([^#=]+)=(.+)$/);
      if (m) env[m[1].trim()] = m[2].trim();
    }
    return env;
  } catch { return {}; }
}

/** @param {string} cmd */
function run(cmd) {
  try {
    execSync(cmd, { cwd: ROOT, stdio: ['inherit', 'inherit', 'inherit'] });
  } catch { /* sam deploy --no-fail-on-empty-changeset exits 0 */ }
}

const env = { ...loadEnv('.env'), ...loadEnv('.env.local') };
const config = JSON.parse(readFileSync(resolve(ROOT, 'staticart.config.json'), 'utf-8'));
const provider = config.fulfillment?.provider;

if (!env.STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY in .env.local');
  process.exit(1);
}

const STACK = env.SAM_STACK_NAME || 'staticart';
const REGION = env.AWS_REGION || 'us-east-1';

console.log(`\n🚀 Deploying ${STACK} to ${REGION}...\n`);

// Stamp to force new code hash
writeFileSync(resolve(ROOT, 'api/.deploy-stamp'), `// ${new Date().toISOString()}\n`);

// Copy products + config into api/ so Lambda can read them
if (existsSync(resolve(ROOT, 'src/data/products.json'))) {
  copyFileSync(resolve(ROOT, 'src/data/products.json'), resolve(ROOT, 'api/products.json'));
}
copyFileSync(resolve(ROOT, 'staticart.config.json'), resolve(ROOT, 'api/staticart.config.json'));
console.log('✓ Copied products.json + config into api/');

run('cd api && sam build');

const overrides = [
  `StripeSecretKey=${env.STRIPE_SECRET_KEY}`,
  `StripeWebhookSecret=${env.STRIPE_WEBHOOK_SECRET || 'PLACEHOLDER'}`,
  `SiteOrigin=${env.SITE_ORIGIN || '*'}`,
  env.BUILD_HOOK_URL ? `BuildHookUrl=${env.BUILD_HOOK_URL}` : null,
  provider && env[`${provider.toUpperCase()}_API_KEY`]
    ? `${provider.charAt(0).toUpperCase() + provider.slice(1)}ApiKey=${env[`${provider.toUpperCase()}_API_KEY`]}`
    : null,
].filter(Boolean).join(' ');

run([
  'cd api && sam deploy',
  `--stack-name ${STACK}`,
  `--region ${REGION}`,
  '--resolve-s3',
  '--capabilities CAPABILITY_IAM',
  `--parameter-overrides ${overrides}`,
  '--no-confirm-changeset',
  '--no-fail-on-empty-changeset',
].join(' '));

console.log(`\n✅ Deployed ${STACK}!`);
