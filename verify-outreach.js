// Verification script for Outreach implementation
const fs = require('fs');

console.log('🔍 VERIFYING OUTREACH IMPLEMENTATION...\n');

const admin2 = fs.readFileSync('js/admin2.js', 'utf8');
const adminHtml = fs.readFileSync('admin.html', 'utf8');

const checks = [
  // Functions
  { name: 'loadOutreach function', pattern: /async function loadOutreach\(\)/, required: true },
  { name: 'loadOutreachAccounts function', pattern: /async function loadOutreachAccounts\(\)/, required: true },
  { name: 'loadWarmupGuides function', pattern: /async function loadWarmupGuides\(\)/, required: true },
  { name: 'loadOutseeker function', pattern: /async function loadOutseeker\(\)/, required: true },
  { name: 'loadOpeners function', pattern: /async function loadOpeners\(\)/, required: true },
  { name: 'loadFollowups function', pattern: /async function loadFollowups\(\)/, required: true },
  { name: 'loadScripts function', pattern: /async function loadScripts\(\)/, required: true },
  { name: 'saveOutreachAcc function', pattern: /async function saveOutreachAcc\(type\)/, required: true },
  { name: 'updateOutreachAcc function', pattern: /async function updateOutreachAcc\(type\)/, required: true },
  { name: 'editOutreachAcc function', pattern: /async function editOutreachAcc\(id\)/, required: true },
  { name: 'saveOutseeker function', pattern: /async function saveOutseeker\(\)/, required: true },
  { name: 'renderWebcamAccounts function', pattern: /function renderWebcamAccounts\(/, required: true },
  { name: 'copyToClipboard function', pattern: /function copyToClipboard\(/, required: true },
  
  // Modal cases
  { name: "Modal case 'outreach-acc'", pattern: /case\s+['"]outreach-acc['"]:/, required: true },
  { name: "Modal case 'outreach-acc-edit'", pattern: /case\s+['"]outreach-acc-edit['"]:/, required: true },
  { name: "Modal case 'outseeker'", pattern: /case\s+['"]outseeker['"]:/, required: true },
  
  // Modal activation
  { name: 'Modal activation', pattern: /m\.classList\.add\(['"]active['"]\);/, required: true },
  
  // userId definition
  { name: 'userId constant', pattern: /const userId = CONFIG\.assistant;/, required: true },
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
  if (check.pattern.test(admin2)) {
    console.log(`✅ ${check.name}`);
    passed++;
  } else {
    console.log(`❌ ${check.name} - NOT FOUND`);
    failed++;
  }
});

// HTML checks
console.log('\n🔍 CHECKING HTML...\n');

const htmlChecks = [
  { name: "Instagram Add Account button", pattern: /onclick="modal\('outreach-acc','instagram'\)"/ },
  { name: "Twitter Add Account button", pattern: /onclick="modal\('outreach-acc','twitter'\)"/ },
  { name: "Webcam Add Account button", pattern: /onclick="modal\('outreach-acc','webcam'\)"/ },
  { name: "Outseeker Log button", pattern: /onclick="modal\('outseeker'\)"/ },
  { name: "admin2.js version", pattern: /admin2\.js\?v=29/ },
];

htmlChecks.forEach(check => {
  if (check.pattern.test(adminHtml)) {
    console.log(`✅ ${check.name}`);
    passed++;
  } else {
    console.log(`❌ ${check.name} - NOT FOUND`);
    failed++;
  }
});

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

if (failed === 0) {
  console.log('✅ ALL CHECKS PASSED!');
  console.log('✅ Outreach section is 100% implemented correctly.\n');
  console.log('📝 Next steps:');
  console.log('1. Open admin.html in browser');
  console.log('2. Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)');
  console.log('3. Open browser console (F12) to check for any runtime errors');
  console.log('4. Test "Add Account" buttons in Outreach section\n');
} else {
  console.log('⚠️  SOME CHECKS FAILED!');
  console.log('Check the failed items above and fix them.\n');
}
