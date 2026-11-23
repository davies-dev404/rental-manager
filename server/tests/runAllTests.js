const path = require('path');
const { spawnSync } = require('child_process');

const SUITES = [
  'foundationTest.js',
  'dataIntegrityTest.js',
  'reliabilityTest.js',
  'cacheAndQueueTest.js',
  'securityIsolationTest.js',
  'realtimeAndHealthTest.js',
  'adminIntegrationTest.js',
  'saasIntegrationTest.js',
  'intasendIntegrationTest.js',
  'pesapalIntegrationTest.js',
  'paybillIntegrationTest.js',
  'communicationIntegrationTest.js',
  'documentsIntegrationTest.js',
  'utilityIntegrationTest.js'
];

let failed = 0;

for (const suite of SUITES) {
  const fullPath = path.join(__dirname, suite);
  console.log(`\n=== Running ${suite} ===`);
  const res = spawnSync(process.execPath, [fullPath], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' }
  });
  if (res.status !== 0) {
    console.error(`❌ ${suite} exited with code ${res.status}`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\n❌ ${failed} test suite(s) failed.`);
  process.exit(1);
}

console.log(`\n✅ All ${SUITES.length} test suites passed!`);
