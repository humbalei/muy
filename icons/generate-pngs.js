#!/usr/bin/env node

// Quick PNG icon generator using Node.js Canvas
// Install: npm install canvas
// Run: node generate-pngs.js

const fs = require('fs');
const path = require('path');

try {
  const { createCanvas } = require('canvas');

  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

  sizes.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    // Border
    const borderRadius = size * 0.15;
    const borderPadding = size * 0.04;
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = size * 0.008;
    roundRect(ctx, borderPadding, borderPadding, size - borderPadding * 2, size - borderPadding * 2, borderRadius);
    ctx.stroke();

    // TEAM text
    ctx.fillStyle = '#00ff00';
    ctx.font = `bold ${size * 0.23}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TEAM', size / 2, size * 0.52);

    // Underline
    const lineY = size * 0.58;
    const lineStart = size * 0.2;
    const lineEnd = size * 0.8;
    ctx.lineWidth = size * 0.012;
    ctx.beginPath();
    ctx.moveTo(lineStart, lineY);
    ctx.lineTo(lineEnd, lineY);
    ctx.stroke();

    // Corner dots
    const dotRadius = size * 0.015;
    const dotMargin = size * 0.15;
    [[dotMargin, dotMargin], [size - dotMargin, dotMargin],
     [dotMargin, size - dotMargin], [size - dotMargin, size - dotMargin]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Save
    const buffer = canvas.toBuffer('image/png');
    const filename = path.join(__dirname, `icon-${size}x${size}.png`);
    fs.writeFileSync(filename, buffer);
    console.log(`✅ Created: icon-${size}x${size}.png`);
  });

  console.log('\n🎉 All icons generated successfully!');

} catch (err) {
  console.error('❌ Error:', err.message);
  console.log('\n📝 Install canvas package first:');
  console.log('   npm install canvas');
  console.log('\nOr open icons/generate-icons.html in browser to download icons manually.');
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
