/**
 * ExifTool-based Video Spoofer Server
 * Uses ExifTool to properly inject metadata into video metadata tracks
 */

import express from 'express';
import multer from 'multer';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { randomBytes } from 'crypto';
import cors from 'cors';

const app = express();
const upload = multer({ dest: '/tmp/' });

app.use(cors());
app.use(express.json());

// Device profiles
const DEVICES = {
  "iPhone 16 Pro": {
    make: "Apple",
    model: "iPhone 16 Pro",
    software: "18.2.1",
  },
  "iPhone 16 Pro Max": {
    make: "Apple",
    model: "iPhone 16 Pro Max",
    software: "18.2.1",
  },
  "iPhone 17 Pro": {
    make: "Apple",
    model: "iPhone 17 Pro",
    software: "19.0",
  },
  "iPhone 17 Pro Max": {
    make: "Apple",
    model: "iPhone 17 Pro Max",
    software: "19.0",
  },
};

// City coordinates
const CITIES = {
  "New York": { lat: 40.7128, lon: -74.0060, alt: 10, tz: "-05:00" },
  "Los Angeles": { lat: 34.0522, lon: -118.2437, alt: 71, tz: "-08:00" },
  "Miami": { lat: 25.7617, lon: -80.1918, alt: 2, tz: "-05:00" },
  "Chicago": { lat: 41.8781, lon: -87.6298, alt: 181, tz: "-06:00" },
  "London": { lat: 51.5074, lon: -0.1278, alt: 11, tz: "+00:00" },
  "Prague": { lat: 50.0755, lon: 14.4378, alt: 235, tz: "+01:00" },
  "Paris": { lat: 48.8566, lon: 2.3522, alt: 35, tz: "+01:00" },
  "Berlin": { lat: 52.5200, lon: 13.4050, alt: 34, tz: "+01:00" },
  "Tokyo": { lat: 35.6762, lon: 139.6503, alt: 40, tz: "+09:00" },
  "Sydney": { lat: -33.8688, lon: 151.2093, alt: 58, tz: "+11:00" },
  "Dubai": { lat: 25.2048, lon: 55.2708, alt: 5, tz: "+04:00" },
  "Toronto": { lat: 43.6532, lon: -79.3832, alt: 76, tz: "-05:00" },
  "Amsterdam": { lat: 52.3676, lon: 4.9041, alt: 2, tz: "+01:00" },
  "Barcelona": { lat: 41.3851, lon: 2.1734, alt: 12, tz: "+01:00" },
  "Rome": { lat: 41.9028, lon: 12.4964, alt: 21, tz: "+01:00" },
  "Vienna": { lat: 48.2082, lon: 16.3738, alt: 171, tz: "+01:00" },
  "Singapore": { lat: 1.3521, lon: 103.8198, alt: 15, tz: "+08:00" },
  "Hong Kong": { lat: 22.3193, lon: 114.1694, alt: 32, tz: "+08:00" },
  "Seoul": { lat: 37.5665, lon: 126.9780, alt: 38, tz: "+09:00" },
  "Mumbai": { lat: 19.0760, lon: 72.8777, alt: 14, tz: "+05:30" },
};

function generateMetadata(city, device) {
  const dev = DEVICES[device] || DEVICES["iPhone 16 Pro"];
  const loc = CITIES[city] || CITIES["Prague"];

  // Random GPS variation (within ~1km)
  const lat = loc.lat + (Math.random() - 0.5) * 0.01;
  const lon = loc.lon + (Math.random() - 0.5) * 0.01;
  const alt = Math.max(0, loc.alt + Math.floor(Math.random() * 20) - 10);

  // Random timestamp (1-14 days ago, random hour 8-20)
  const now = new Date();
  const daysAgo = 1 + Math.floor(Math.random() * 14);
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  date.setHours(8 + Math.floor(Math.random() * 12));
  date.setMinutes(Math.floor(Math.random() * 60));
  date.setSeconds(Math.floor(Math.random() * 60));

  const pad = (n) => String(n).padStart(2, '0');
  const tzNoColon = loc.tz.replace(':', '');
  const dateISO = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${tzNoColon}`;

  return {
    make: dev.make,
    model: dev.model,
    software: dev.software,
    lat,
    lon,
    alt,
    dateISO,
    contentId: randomBytes(16).toString('hex').toUpperCase(),
  };
}

// Spoof video endpoint
app.post('/spoof-video', upload.single('video'), (req, res) => {
  try {
    const { city, device } = req.body;
    const inputPath = req.file.path;
    const outputPath = `/tmp/spoofed-${Date.now()}.mov`;

    console.log(`Spoofing video: ${device} in ${city}`);

    // Generate metadata
    const meta = generateMetadata(city || 'Prague', device || 'iPhone 16 Pro');

    // Use ExifTool to write metadata
    const cmd = `exiftool -overwrite_original \
      -Keys:Make="${meta.make}" \
      -Keys:Model="${meta.model}" \
      -Keys:Software="${meta.software}" \
      -Keys:GPSCoordinates="${meta.lat}, ${meta.lon}, ${meta.alt}" \
      -Keys:CreationDate="${meta.dateISO}" \
      -Keys:ContentIdentifier="${meta.contentId}" \
      "${inputPath}"`;

    console.log('Running ExifTool...');
    execSync(cmd, { encoding: 'utf-8' });

    // Read spoofed video
    const spoofedVideo = readFileSync(inputPath);

    // Clean up
    unlinkSync(inputPath);

    // Send response
    res.setHeader('Content-Type', 'video/quicktime');
    res.setHeader('Content-Disposition', `attachment; filename="IMG_${Date.now()}.mov"`);
    res.send(spoofedVideo);

    console.log('✓ Video spoofed successfully');

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', exiftool: 'available' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ ExifTool Spoofer Server running on http://localhost:${PORT}`);
  console.log(`  POST /spoof-video - Upload video with city & device params`);
  console.log(`  GET  /health - Check server status`);
});
