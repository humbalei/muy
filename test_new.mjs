import { generateMetadata, injectVideoMetadata } from './functions/_shared/spoofer.js';
import fs from 'fs';

// Generuj 3x metadata pro ověření randomizace
console.log("=== TESTING RANDOMIZATION ===");
for (let i = 0; i < 3; i++) {
  const m = generateMetadata('Prague', 'iPhone 17 Pro Max');
  console.log(`Run ${i+1}: Date=${m.dateISO}, GPS=${m.gpsIso6709.substring(0,20)}...`);
}

// Spoofni video
const videoData = fs.readFileSync('test_input.mov');
const metadata = generateMetadata('Prague', 'iPhone 17 Pro Max');
console.log("\n=== FINAL METADATA ===");
console.log(JSON.stringify(metadata, null, 2));

const spoofed = injectVideoMetadata(videoData, metadata);
fs.writeFileSync('test_new_spoofed.mov', spoofed);
console.log(`\nWritten: test_new_spoofed.mov (${spoofed.length} bytes)`);
