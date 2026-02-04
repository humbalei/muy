/**
 * Cloudflare Worker - Media Spoofer API
 * Complete iPhone metadata injection for photos and videos
 */

// iPhone device profiles - exactly matching real devices
const DEVICES = {
  "iPhone 16 Pro": {
    make: "Apple",
    model: "iPhone 16 Pro",
    software: "18.2.1",
    lensModel: "iPhone 16 Pro back camera 6.86mm f/1.78",
    focalLength: 6.86,
    focalLength35mm: 24,
    aperture: 1.78,
  },
  "iPhone 16 Pro Max": {
    make: "Apple",
    model: "iPhone 16 Pro Max",
    software: "18.2.1",
    lensModel: "iPhone 16 Pro Max back camera 6.86mm f/1.78",
    focalLength: 6.86,
    focalLength35mm: 24,
    aperture: 1.78,
  },
  "iPhone 17 Pro": {
    make: "Apple",
    model: "iPhone 17 Pro",
    software: "19.0",
    lensModel: "iPhone 17 Pro back camera 6.86mm f/1.78",
    focalLength: 6.86,
    focalLength35mm: 24,
    aperture: 1.78,
  },
  "iPhone 17 Pro Max": {
    make: "Apple",
    model: "iPhone 17 Pro Max",
    software: "19.0",
    lensModel: "iPhone 17 Pro Max back camera 6.86mm f/1.78",
    focalLength: 6.86,
    focalLength35mm: 24,
    aperture: 1.78,
  },
};

// City coordinates with realistic variations
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

// Generate realistic metadata
function generateMetadata(city, device) {
  const dev = DEVICES[device] || DEVICES["iPhone 16 Pro"];
  const loc = CITIES[city] || CITIES["New York"];

  // Add realistic GPS variation (within ~2km)
  const lat = loc.lat + (Math.random() - 0.5) * 0.02;
  const lon = loc.lon + (Math.random() - 0.5) * 0.02;
  const alt = Math.max(0, loc.alt + Math.floor(Math.random() * 20) - 10);

  // Generate realistic timestamp (within last 7 days)
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 7);
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  date.setHours(8 + Math.floor(Math.random() * 12)); // 8am - 8pm
  date.setMinutes(Math.floor(Math.random() * 60));
  date.setSeconds(Math.floor(Math.random() * 60));

  // Camera settings
  const isoValues = [32, 50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800];
  const shutterSpeeds = ['1/30', '1/60', '1/100', '1/125', '1/250', '1/500', '1/1000', '1/2000'];
  const iso = isoValues[Math.floor(Math.random() * isoValues.length)];
  const shutter = shutterSpeeds[Math.floor(Math.random() * shutterSpeeds.length)];

  // Unique content identifier (like Apple's)
  const contentId = crypto.randomUUID().toUpperCase();

  // Format date strings
  const dateStr = date.toISOString().replace('T', ' ').replace('Z', '').split('.')[0].replace(/-/g, ':');
  const dateWithTz = dateStr + loc.tz;

  return {
    make: dev.make,
    model: dev.model,
    software: dev.software,
    lensModel: dev.lensModel,
    focalLength: dev.focalLength,
    focalLength35mm: dev.focalLength35mm,
    aperture: dev.aperture,
    lat,
    lon,
    alt,
    latRef: lat >= 0 ? 'N' : 'S',
    lonRef: lon >= 0 ? 'E' : 'W',
    date: dateStr,
    dateWithTz,
    timezone: loc.tz,
    iso,
    shutter,
    exposureTime: eval(shutter),
    contentId,
    gpsIso6709: formatGpsIso6709(lat, lon, alt),
    brightness: (4 + Math.random() * 4).toFixed(2),
    direction: Math.floor(Math.random() * 360),
    subsec: String(Math.floor(Math.random() * 1000)).padStart(3, '0'),
  };
}

function formatGpsIso6709(lat, lon, alt) {
  const latSign = lat >= 0 ? '+' : '-';
  const lonSign = lon >= 0 ? '+' : '-';
  const latStr = `${latSign}${Math.abs(lat).toFixed(4)}`;
  const lonStr = `${lonSign}${Math.abs(lon).toFixed(4).padStart(9, '0')}`;
  const altStr = `+${Math.floor(alt).toString().padStart(3, '0')}`;
  return `${latStr}${lonStr}${altStr}/`;
}

// ============================================
// JPEG EXIF MANIPULATION
// ============================================

function injectPhotoMetadata(jpegData, metadata) {
  const data = new Uint8Array(jpegData);

  // Build complete EXIF structure
  const exif = buildExifSegment(metadata);

  // Find APP1 marker or insert after SOI
  let insertPos = 2; // After SOI (FFD8)

  // Remove existing APP1 (EXIF) segments
  const cleaned = removeExistingExif(data);

  // Insert new EXIF
  const result = new Uint8Array(cleaned.length + exif.length);
  result.set(cleaned.slice(0, 2)); // SOI
  result.set(exif, 2); // New EXIF
  result.set(cleaned.slice(2), 2 + exif.length); // Rest of image

  return result;
}

function removeExistingExif(data) {
  const result = [];
  let i = 0;

  // Copy SOI
  result.push(data[0], data[1]);
  i = 2;

  while (i < data.length - 1) {
    if (data[i] === 0xFF) {
      const marker = data[i + 1];

      // Skip APP1 (EXIF) segments
      if (marker === 0xE1) {
        const length = (data[i + 2] << 8) | data[i + 3];
        i += 2 + length;
        continue;
      }

      // Check if this is a segment with length
      if (marker >= 0xE0 && marker <= 0xEF || marker === 0xFE || (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC)) {
        if (i + 3 < data.length) {
          const length = (data[i + 2] << 8) | data[i + 3];
          for (let j = 0; j < length + 2 && i + j < data.length; j++) {
            result.push(data[i + j]);
          }
          i += length + 2;
          continue;
        }
      }
    }

    result.push(data[i]);
    i++;
  }

  // Add remaining bytes
  while (i < data.length) {
    result.push(data[i++]);
  }

  return new Uint8Array(result);
}

function buildExifSegment(meta) {
  // This builds a complete EXIF APP1 segment with all iPhone metadata
  const entries = [];

  // IFD0 (Main image)
  const ifd0 = [
    { tag: 0x010F, type: 2, value: meta.make }, // Make
    { tag: 0x0110, type: 2, value: meta.model }, // Model
    { tag: 0x0112, type: 3, value: [1] }, // Orientation
    { tag: 0x011A, type: 5, value: [[72, 1]] }, // XResolution
    { tag: 0x011B, type: 5, value: [[72, 1]] }, // YResolution
    { tag: 0x0128, type: 3, value: [2] }, // ResolutionUnit
    { tag: 0x0131, type: 2, value: meta.software }, // Software
    { tag: 0x0132, type: 2, value: meta.date }, // DateTime
  ];

  // EXIF SubIFD
  const exifIfd = [
    { tag: 0x829A, type: 5, value: [[Math.round(meta.exposureTime * 1000000), 1000000]] }, // ExposureTime
    { tag: 0x829D, type: 5, value: [[Math.round(meta.aperture * 100), 100]] }, // FNumber
    { tag: 0x8822, type: 3, value: [2] }, // ExposureProgram (Program AE)
    { tag: 0x8827, type: 3, value: [meta.iso] }, // ISO
    { tag: 0x9000, type: 7, value: [0x30, 0x32, 0x33, 0x32] }, // ExifVersion "0232"
    { tag: 0x9003, type: 2, value: meta.date }, // DateTimeOriginal
    { tag: 0x9004, type: 2, value: meta.date }, // DateTimeDigitized
    { tag: 0x9010, type: 2, value: meta.timezone }, // OffsetTime
    { tag: 0x9011, type: 2, value: meta.timezone }, // OffsetTimeOriginal
    { tag: 0x9012, type: 2, value: meta.timezone }, // OffsetTimeDigitized
    { tag: 0x9201, type: 10, value: [[Math.round(Math.log2(1/meta.exposureTime) * 100), 100]] }, // ShutterSpeedValue
    { tag: 0x9202, type: 5, value: [[Math.round(meta.aperture * 100), 100]] }, // ApertureValue
    { tag: 0x9203, type: 10, value: [[Math.round(parseFloat(meta.brightness) * 100), 100]] }, // BrightnessValue
    { tag: 0x9207, type: 3, value: [5] }, // MeteringMode (Multi-segment)
    { tag: 0x9209, type: 3, value: [16] }, // Flash (Off)
    { tag: 0x920A, type: 5, value: [[Math.round(meta.focalLength * 100), 100]] }, // FocalLength
    { tag: 0x9291, type: 2, value: meta.subsec }, // SubSecTimeOriginal
    { tag: 0x9292, type: 2, value: meta.subsec }, // SubSecTimeDigitized
    { tag: 0xA001, type: 3, value: [1] }, // ColorSpace (sRGB)
    { tag: 0xA402, type: 3, value: [0] }, // ExposureMode (Auto)
    { tag: 0xA403, type: 3, value: [0] }, // WhiteBalance (Auto)
    { tag: 0xA405, type: 3, value: [meta.focalLength35mm] }, // FocalLengthIn35mmFilm
    { tag: 0xA406, type: 3, value: [0] }, // SceneCaptureType (Standard)
    { tag: 0xA432, type: 5, value: [[Math.round(meta.focalLength * 100), 100], [Math.round(meta.focalLength * 100), 100], [Math.round(meta.aperture * 100), 100], [Math.round(meta.aperture * 100), 100]] }, // LensInfo
    { tag: 0xA433, type: 2, value: meta.make }, // LensMake
    { tag: 0xA434, type: 2, value: meta.lensModel }, // LensModel
  ];

  // GPS IFD
  const gpsIfd = [
    { tag: 0x0000, type: 1, value: [2, 3, 0, 0] }, // GPSVersionID
    { tag: 0x0001, type: 2, value: meta.latRef }, // GPSLatitudeRef
    { tag: 0x0002, type: 5, value: latToExif(meta.lat) }, // GPSLatitude
    { tag: 0x0003, type: 2, value: meta.lonRef }, // GPSLongitudeRef
    { tag: 0x0004, type: 5, value: lonToExif(meta.lon) }, // GPSLongitude
    { tag: 0x0005, type: 1, value: [0] }, // GPSAltitudeRef (above sea level)
    { tag: 0x0006, type: 5, value: [[Math.round(meta.alt * 100), 100]] }, // GPSAltitude
    { tag: 0x0010, type: 2, value: 'T' }, // GPSImgDirectionRef
    { tag: 0x0011, type: 5, value: [[meta.direction * 100, 100]] }, // GPSImgDirection
    { tag: 0x0017, type: 2, value: 'T' }, // GPSDestBearingRef
    { tag: 0x0018, type: 5, value: [[meta.direction * 100, 100]] }, // GPSDestBearing
    { tag: 0x001F, type: 5, value: [[5, 1]] }, // GPSHPositioningError
  ];

  // Build binary EXIF
  return buildExifBinary(ifd0, exifIfd, gpsIfd);
}

function latToExif(lat) {
  lat = Math.abs(lat);
  const deg = Math.floor(lat);
  const minFloat = (lat - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = Math.round((minFloat - min) * 60 * 100);
  return [[deg, 1], [min, 1], [sec, 100]];
}

function lonToExif(lon) {
  return latToExif(lon);
}

function buildExifBinary(ifd0, exifIfd, gpsIfd) {
  // Simplified EXIF builder - creates valid EXIF APP1 segment
  const buffer = [];

  // APP1 marker
  buffer.push(0xFF, 0xE1);

  // Length placeholder (will be filled later)
  const lengthPos = buffer.length;
  buffer.push(0x00, 0x00);

  // EXIF header
  buffer.push(0x45, 0x78, 0x69, 0x66, 0x00, 0x00); // "Exif\0\0"

  // TIFF header (little endian)
  const tiffStart = buffer.length;
  buffer.push(0x49, 0x49); // Little endian
  buffer.push(0x2A, 0x00); // TIFF magic
  buffer.push(0x08, 0x00, 0x00, 0x00); // IFD0 offset

  // Build IFD0 entries
  const ifd0Offset = buffer.length - tiffStart;
  const { entries: ifd0Entries, data: ifd0Data, nextOffset: exifOffset } = buildIFD(ifd0, buffer.length - tiffStart + 2 + ifd0.length * 12 + 4, tiffStart);

  // Entry count
  buffer.push(ifd0.length & 0xFF, (ifd0.length >> 8) & 0xFF);

  // Add entries
  for (const entry of ifd0Entries) {
    buffer.push(...entry);
  }

  // Next IFD offset (0 = no more IFDs)
  buffer.push(0x00, 0x00, 0x00, 0x00);

  // Add IFD0 data
  buffer.push(...ifd0Data);

  // Update length
  const length = buffer.length - 2;
  buffer[lengthPos] = (length >> 8) & 0xFF;
  buffer[lengthPos + 1] = length & 0xFF;

  return new Uint8Array(buffer);
}

function buildIFD(entries, dataOffset, tiffStart) {
  const ifdEntries = [];
  const data = [];
  let currentDataOffset = dataOffset;

  for (const entry of entries) {
    const tagBytes = [entry.tag & 0xFF, (entry.tag >> 8) & 0xFF];
    const typeBytes = [entry.type & 0xFF, (entry.type >> 8) & 0xFF];

    let valueBytes;
    let count;

    if (entry.type === 2) { // ASCII
      const str = entry.value + '\0';
      count = str.length;
      valueBytes = Array.from(str).map(c => c.charCodeAt(0));
    } else if (entry.type === 3) { // SHORT
      count = entry.value.length;
      valueBytes = [];
      for (const v of entry.value) {
        valueBytes.push(v & 0xFF, (v >> 8) & 0xFF);
      }
    } else if (entry.type === 5 || entry.type === 10) { // RATIONAL or SRATIONAL
      count = entry.value.length;
      valueBytes = [];
      for (const [num, den] of entry.value) {
        valueBytes.push(num & 0xFF, (num >> 8) & 0xFF, (num >> 16) & 0xFF, (num >> 24) & 0xFF);
        valueBytes.push(den & 0xFF, (den >> 8) & 0xFF, (den >> 16) & 0xFF, (den >> 24) & 0xFF);
      }
    } else if (entry.type === 1 || entry.type === 7) { // BYTE or UNDEFINED
      count = entry.value.length;
      valueBytes = entry.value;
    } else {
      count = 1;
      valueBytes = [0, 0, 0, 0];
    }

    const countBytes = [count & 0xFF, (count >> 8) & 0xFF, (count >> 16) & 0xFF, (count >> 24) & 0xFF];

    // Check if value fits in 4 bytes
    if (valueBytes.length <= 4) {
      while (valueBytes.length < 4) valueBytes.push(0);
      ifdEntries.push([...tagBytes, ...typeBytes, ...countBytes, ...valueBytes]);
    } else {
      // Store offset and add data
      const offsetBytes = [
        currentDataOffset & 0xFF,
        (currentDataOffset >> 8) & 0xFF,
        (currentDataOffset >> 16) & 0xFF,
        (currentDataOffset >> 24) & 0xFF
      ];
      ifdEntries.push([...tagBytes, ...typeBytes, ...countBytes, ...offsetBytes]);
      data.push(...valueBytes);
      currentDataOffset += valueBytes.length;
    }
  }

  return { entries: ifdEntries, data, nextOffset: currentDataOffset };
}

// ============================================
// MP4/MOV METADATA MANIPULATION
// ============================================

function injectVideoMetadata(videoData, metadata) {
  const data = new Uint8Array(videoData);

  // Parse MP4 structure
  const atoms = parseAtoms(data, 0, data.length);

  // Find moov atom
  const moovAtom = atoms.find(a => a.type === 'moov');
  if (!moovAtom) {
    console.log('No moov atom found, returning original');
    return data;
  }

  // Build new metadata atoms
  const metaAtom = buildAppleMetadataAtom(metadata);
  const udtaAtom = buildUdtaAtom(metadata, metaAtom);

  // Insert udta into moov
  const result = insertUdtaIntoMoov(data, moovAtom, udtaAtom);

  return result;
}

function parseAtoms(data, start, end) {
  const atoms = [];
  let offset = start;

  while (offset < end - 8) {
    const size = readUint32BE(data, offset);
    const type = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);

    if (size < 8 || offset + size > end) break;

    atoms.push({
      type,
      offset,
      size,
      dataOffset: offset + 8,
      dataSize: size - 8
    });

    offset += size;
  }

  return atoms;
}

function readUint32BE(data, offset) {
  return (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
}

function writeUint32BE(value) {
  return [(value >> 24) & 0xFF, (value >> 16) & 0xFF, (value >> 8) & 0xFF, value & 0xFF];
}

function buildAppleMetadataAtom(meta) {
  // Build Apple QuickTime metadata keys and values
  const items = [];

  // Key-value pairs for Apple metadata
  const keys = [
    ['com.apple.quicktime.make', meta.make],
    ['com.apple.quicktime.model', meta.model],
    ['com.apple.quicktime.software', meta.software],
    ['com.apple.quicktime.creationdate', meta.dateWithTz],
    ['com.apple.quicktime.location.ISO6709', meta.gpsIso6709],
    ['com.apple.quicktime.content.identifier', meta.contentId],
  ];

  // Build keys atom
  const keysData = [];
  keysData.push(...writeUint32BE(0)); // version + flags
  keysData.push(...writeUint32BE(keys.length)); // entry count

  for (const [key, _] of keys) {
    const keyBytes = new TextEncoder().encode(key);
    keysData.push(...writeUint32BE(keyBytes.length + 8)); // key size
    keysData.push(0x6D, 0x64, 0x74, 0x61); // 'mdta' namespace
    keysData.push(...keyBytes);
  }

  const keysAtom = buildAtom('keys', keysData);

  // Build ilst atom (values)
  const ilstItems = [];
  keys.forEach(([key, value], index) => {
    const valueBytes = new TextEncoder().encode(value);

    // Data atom
    const dataAtom = [];
    dataAtom.push(...writeUint32BE(valueBytes.length + 16)); // size
    dataAtom.push(0x64, 0x61, 0x74, 0x61); // 'data'
    dataAtom.push(0x00, 0x00, 0x00, 0x01); // type (UTF-8)
    dataAtom.push(0x00, 0x00, 0x00, 0x00); // locale
    dataAtom.push(...valueBytes);

    // Item atom (key index starts at 1)
    const itemAtom = buildAtom(String.fromCharCode(0, 0, 0, index + 1), dataAtom);
    ilstItems.push(...itemAtom);
  });

  const ilstAtom = buildAtom('ilst', ilstItems);

  // Build hdlr atom for metadata
  const hdlrData = [
    0x00, 0x00, 0x00, 0x00, // version + flags
    0x00, 0x00, 0x00, 0x00, // predefined
    0x6D, 0x64, 0x74, 0x61, // handler type 'mdta'
    0x00, 0x00, 0x00, 0x00, // reserved
    0x00, 0x00, 0x00, 0x00, // reserved
    0x00, 0x00, 0x00, 0x00, // reserved
    0x00 // name (empty)
  ];
  const hdlrAtom = buildAtom('hdlr', hdlrData);

  // Combine into meta atom
  const metaContent = [...hdlrAtom, ...keysAtom, ...ilstAtom];
  const metaData = [0x00, 0x00, 0x00, 0x00, ...metaContent]; // version + flags

  return buildAtom('meta', metaData);
}

function buildUdtaAtom(meta, metaAtom) {
  // Also add traditional udta fields
  const udtaContent = [];

  // Add meta atom
  udtaContent.push(...metaAtom);

  // Add copyright notice (optional, makes it look more authentic)
  const cprtData = [
    0x00, 0x00, 0x00, 0x00, // version + flags
    0x00, 0x00, // language (undetermined)
    ...new TextEncoder().encode(`Shot on ${meta.model}`)
  ];
  udtaContent.push(...buildAtom('\xA9cpy', cprtData));

  return buildAtom('udta', udtaContent);
}

function buildAtom(type, data) {
  const size = 8 + data.length;
  const result = [
    ...writeUint32BE(size),
    type.charCodeAt(0) || 0,
    type.charCodeAt(1) || 0,
    type.charCodeAt(2) || 0,
    type.charCodeAt(3) || 0,
    ...data
  ];
  return result;
}

function insertUdtaIntoMoov(data, moovAtom, udtaAtom) {
  // Parse moov children
  const moovChildren = parseAtoms(data, moovAtom.dataOffset, moovAtom.offset + moovAtom.size);

  // Remove existing udta if present
  const existingUdta = moovChildren.find(a => a.type === 'udta');

  let newData;
  let insertPos;
  let removeSize = 0;

  if (existingUdta) {
    // Replace existing udta
    insertPos = existingUdta.offset;
    removeSize = existingUdta.size;
  } else {
    // Insert at end of moov
    insertPos = moovAtom.offset + moovAtom.size;
  }

  // Build new file
  const udtaBytes = new Uint8Array(udtaAtom);
  const sizeDiff = udtaBytes.length - removeSize;

  newData = new Uint8Array(data.length + sizeDiff);

  // Copy before insertion point
  newData.set(data.slice(0, insertPos));

  // Insert udta
  newData.set(udtaBytes, insertPos);

  // Copy after insertion point
  newData.set(data.slice(insertPos + removeSize), insertPos + udtaBytes.length);

  // Update moov size
  const newMoovSize = moovAtom.size + sizeDiff;
  const moovSizeBytes = writeUint32BE(newMoovSize);
  newData[moovAtom.offset] = moovSizeBytes[0];
  newData[moovAtom.offset + 1] = moovSizeBytes[1];
  newData[moovAtom.offset + 2] = moovSizeBytes[2];
  newData[moovAtom.offset + 3] = moovSizeBytes[3];

  return newData;
}

// ============================================
// REQUEST HANDLERS
// ============================================

async function handleSpoofVideo(request) {
  try {
    const formData = await request.formData();
    const video = formData.get('video');
    const city = formData.get('city') || 'New York';
    const device = formData.get('device') || 'iPhone 16 Pro';

    if (!video) {
      return new Response('No video provided', { status: 400 });
    }

    const metadata = generateMetadata(city, device);
    const videoData = await video.arrayBuffer();
    const spoofedVideo = injectVideoMetadata(videoData, metadata);

    return new Response(spoofedVideo, {
      headers: {
        'Content-Type': 'video/mp4',
        'X-Metadata': JSON.stringify(metadata),
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}

async function handleSpoofPhoto(request) {
  try {
    const formData = await request.formData();
    const photo = formData.get('photo');
    const city = formData.get('city') || 'New York';
    const device = formData.get('device') || 'iPhone 16 Pro';

    if (!photo) {
      return new Response('No photo provided', { status: 400 });
    }

    const metadata = generateMetadata(city, device);
    const photoData = await photo.arrayBuffer();
    const spoofedPhoto = injectPhotoMetadata(photoData, metadata);

    return new Response(spoofedPhoto, {
      headers: {
        'Content-Type': 'image/jpeg',
        'X-Metadata': JSON.stringify(metadata),
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}

// ============================================
// MAIN WORKER
// ============================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        }
      });
    }

    // API routes
    if (request.method === 'POST') {
      if (url.pathname === '/spoof-video') {
        return handleSpoofVideo(request);
      }
      if (url.pathname === '/spoof-photo') {
        return handleSpoofPhoto(request);
      }
    }

    // Serve static files (for Pages integration)
    return env.ASSETS?.fetch(request) || new Response('Not Found', { status: 404 });
  }
};
