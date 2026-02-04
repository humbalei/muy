import { generateMetadata, injectVideoMetadata } from './functions/_shared/spoofer.js';
import fs from 'fs';

const videoData = fs.readFileSync('test_input.mov');
const metadata = generateMetadata('Prague', 'iPhone 17 Pro Max');
console.log('Metadata:', JSON.stringify(metadata, null, 2));

const spoofed = injectVideoMetadata(videoData, metadata);
fs.writeFileSync('test_spoofed.mov', spoofed);
console.log('Written test_spoofed.mov, size:', spoofed.length);
