/**
 * Complete iPhone Metadata Spoofer
 * Injects metadata that iOS Photos actually reads
 */

// iPhone device profiles
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

// Generate random metadata
export function generateMetadata(city, device) {
  const dev = DEVICES[device] || DEVICES["iPhone 16 Pro"];
  const loc = CITIES[city] || CITIES["New York"];

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

  // EXIF format: "YYYY:MM:DD HH:MM:SS"
  const dateExif = `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

  // ISO format for Keys: "YYYY-MM-DDTHH:MM:SS+HHMM"
  const tzNoColon = loc.tz.replace(':', '');
  const dateISO = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${tzNoColon}`;

  // ISO 6709 GPS format: "+DD.DDDD±DDD.DDDD/" (NO ALTITUDE - iOS doesn't like it!)
  // Latitude: 2 digits before decimal, Longitude: 3 digits before decimal
  const latSign = lat >= 0 ? '+' : '-';
  const lonSign = lon >= 0 ? '+' : '-';
  const latAbs = Math.abs(lat).toFixed(4);
  const lonAbs = Math.abs(lon).toFixed(4);
  // Pad latitude to 2 digits, longitude to 3 digits before decimal
  const latPadded = latAbs.padStart(7, '0'); // XX.XXXX
  const lonPadded = lonAbs.padStart(8, '0'); // XXX.XXXX
  const gpsIso6709 = `${latSign}${latPadded}${lonSign}${lonPadded}/`; // NO altitude!

  return {
    make: dev.make,
    model: dev.model,
    software: dev.software,
    lat,
    lon,
    alt,
    dateExif,
    dateISO,
    timezone: loc.tz,
    gpsIso6709,
    contentId: crypto.randomUUID().toUpperCase(),
  };
}

// ============================================
// VIDEO METADATA INJECTION
// ============================================

export function injectVideoMetadata(videoData, metadata) {
  let data = new Uint8Array(videoData);

  // Find moov atom
  const moovInfo = findAtom(data, 0, data.length, 'moov');
  if (!moovInfo) {
    console.log('No moov atom found');
    return data;
  }

  // Find mdat to check if we need offset updates
  const mdatInfo = findAtom(data, 0, data.length, 'mdat');
  const mdatAfterMoov = mdatInfo && mdatInfo.offset > moovInfo.offset;

  // Remove existing udta and meta from moov
  let moovStart = moovInfo.offset;
  let moovSize = moovInfo.size;
  let sizeDiff = 0;

  // Find and remove existing udta
  const udtaInfo = findAtom(data, moovStart + 8, moovStart + moovSize, 'udta');
  if (udtaInfo) {
    data = removeBytes(data, udtaInfo.offset, udtaInfo.size);
    moovSize -= udtaInfo.size;
    sizeDiff -= udtaInfo.size;
    updateAtomSize(data, moovStart, moovSize);
  }

  // Find and remove existing meta at moov level
  const metaInfo = findAtom(data, moovStart + 8, moovStart + moovSize, 'meta');
  if (metaInfo) {
    data = removeBytes(data, metaInfo.offset, metaInfo.size);
    moovSize -= metaInfo.size;
    sizeDiff -= metaInfo.size;
    updateAtomSize(data, moovStart, moovSize);
  }

  // Update timestamps in mvhd, tkhd, mdhd
  const macTime = dateToMacTimestamp(metadata.dateExif);
  updateTimestamps(data, moovStart, moovSize, macTime);

  // Build new udta with ONLY legacy atoms (like ffmpeg does)
  const udtaAtom = buildUdtaAtom(metadata);

  // Insert at end of moov (NO meta atom - iOS doesn't need it)
  const insertPos = moovStart + moovSize;
  data = insertBytes(data, insertPos, udtaAtom);

  // Update moov size
  moovSize += udtaAtom.length;
  sizeDiff += udtaAtom.length;
  updateAtomSize(data, moovStart, moovSize);

  // Update chunk offsets if mdat is after moov
  if (mdatAfterMoov && sizeDiff !== 0) {
    updateChunkOffsets(data, moovStart, moovSize, sizeDiff);
  }

  return data;
}

// Find atom in data
function findAtom(data, start, end, type) {
  let offset = start;
  while (offset < end - 8) {
    const size = readUint32BE(data, offset);
    if (size < 8 || offset + size > end) break;

    const atomType = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);
    if (atomType === type) {
      return { offset, size };
    }
    offset += size;
  }
  return null;
}

// Read/write helpers
function readUint32BE(data, offset) {
  return (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
}

function writeUint32BE(data, offset, value) {
  data[offset] = (value >> 24) & 0xFF;
  data[offset + 1] = (value >> 16) & 0xFF;
  data[offset + 2] = (value >> 8) & 0xFF;
  data[offset + 3] = value & 0xFF;
}

function updateAtomSize(data, offset, newSize) {
  writeUint32BE(data, offset, newSize);
}

// Array manipulation
function removeBytes(data, offset, length) {
  const result = new Uint8Array(data.length - length);
  result.set(data.slice(0, offset));
  result.set(data.slice(offset + length), offset);
  return result;
}

function insertBytes(data, offset, bytes) {
  const result = new Uint8Array(data.length + bytes.length);
  result.set(data.slice(0, offset));
  result.set(bytes, offset);
  result.set(data.slice(offset), offset + bytes.length);
  return result;
}

function concatArrays(a, b) {
  const result = new Uint8Array(a.length + b.length);
  result.set(a);
  result.set(b, a.length);
  return result;
}

// Convert date to Mac timestamp (seconds since 1904-01-01)
function dateToMacTimestamp(dateExif) {
  const parts = dateExif.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!parts) return Math.floor(Date.now() / 1000) + 2082844800;

  const date = new Date(
    parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]),
    parseInt(parts[4]), parseInt(parts[5]), parseInt(parts[6])
  );
  return Math.floor(date.getTime() / 1000) + 2082844800;
}

// Update timestamps in mvhd, tkhd, mdhd
function updateTimestamps(data, moovStart, moovSize, macTime) {
  let offset = moovStart + 8;
  const end = moovStart + moovSize;

  while (offset < end - 8) {
    const size = readUint32BE(data, offset);
    if (size < 8 || offset + size > end) break;

    const type = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);

    if (type === 'mvhd') {
      // Movie header - version 0 has 32-bit timestamps at offset 12 and 16
      if (data[offset + 8] === 0) {
        writeUint32BE(data, offset + 12, macTime);
        writeUint32BE(data, offset + 16, macTime);
      }
    } else if (type === 'trak') {
      // Recurse into track
      updateTrackTimestamps(data, offset + 8, offset + size, macTime);
    }

    offset += size;
  }
}

function updateTrackTimestamps(data, start, end, macTime) {
  let offset = start;
  while (offset < end - 8) {
    const size = readUint32BE(data, offset);
    if (size < 8 || offset + size > end) break;

    const type = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);

    if (type === 'tkhd' && data[offset + 8] === 0) {
      writeUint32BE(data, offset + 12, macTime);
      writeUint32BE(data, offset + 16, macTime);
    } else if (type === 'mdia') {
      updateMediaTimestamps(data, offset + 8, offset + size, macTime);
    }

    offset += size;
  }
}

function updateMediaTimestamps(data, start, end, macTime) {
  let offset = start;
  while (offset < end - 8) {
    const size = readUint32BE(data, offset);
    if (size < 8 || offset + size > end) break;

    const type = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);

    if (type === 'mdhd' && data[offset + 8] === 0) {
      writeUint32BE(data, offset + 12, macTime);
      writeUint32BE(data, offset + 16, macTime);
    }

    offset += size;
  }
}

// Update stco/co64 chunk offsets
function updateChunkOffsets(data, moovStart, moovSize, sizeDiff) {
  updateOffsetsRecursive(data, moovStart + 8, moovStart + moovSize, sizeDiff);
}

function updateOffsetsRecursive(data, start, end, sizeDiff) {
  let offset = start;
  while (offset < end - 8) {
    const size = readUint32BE(data, offset);
    if (size < 8 || offset + size > end) break;

    const type = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);

    if (type === 'stco') {
      const count = readUint32BE(data, offset + 12);
      for (let i = 0; i < count; i++) {
        const entryOffset = offset + 16 + i * 4;
        const oldValue = readUint32BE(data, entryOffset);
        writeUint32BE(data, entryOffset, oldValue + sizeDiff);
      }
    } else if (type === 'co64') {
      const count = readUint32BE(data, offset + 12);
      for (let i = 0; i < count; i++) {
        const entryOffset = offset + 16 + i * 8 + 4; // Lower 32 bits
        const oldValue = readUint32BE(data, entryOffset);
        writeUint32BE(data, entryOffset, oldValue + sizeDiff);
      }
    } else if (type === 'trak' || type === 'mdia' || type === 'minf' || type === 'stbl') {
      updateOffsetsRecursive(data, offset + 8, offset + size, sizeDiff);
    }

    offset += size;
  }
}

// ============================================
// BUILD UDTA ATOM
// ============================================

function buildUdtaAtom(meta) {
  const children = [];

  // Only legacy atoms - exactly like ffmpeg does
  // Order matters for iOS!

  // 1. ©mak - Make (Apple)
  children.push(buildTextAtom('\xa9mak', meta.make));

  // 2. ©mod - Model (iPhone 17 Pro Max)
  children.push(buildTextAtom('\xa9mod', meta.model));

  // 3. ©swr - Software
  children.push(buildTextAtom('\xa9swr', meta.software));

  // 4. ©xyz - GPS in ISO 6709 format
  children.push(buildTextAtom('\xa9xyz', meta.gpsIso6709));

  // Combine all children
  let totalSize = 8;
  for (let i = 0; i < children.length; i++) {
    totalSize += children[i].length;
  }

  const result = new Uint8Array(totalSize);
  writeUint32BE(result, 0, totalSize);
  result[4] = 0x75; result[5] = 0x64; result[6] = 0x74; result[7] = 0x61; // 'udta'

  let offset = 8;
  for (let i = 0; i < children.length; i++) {
    result.set(children[i], offset);
    offset += children[i].length;
  }

  return result;
}

// Build legacy text atom (©xxx format)
function buildTextAtom(type, value) {
  const textBytes = new TextEncoder().encode(value);
  const size = 8 + 4 + textBytes.length; // atom header + text header + text

  const result = new Uint8Array(size);
  writeUint32BE(result, 0, size);
  result[4] = type.charCodeAt(0);
  result[5] = type.charCodeAt(1);
  result[6] = type.charCodeAt(2);
  result[7] = type.charCodeAt(3);

  // Text length (2 bytes) + language (2 bytes)
  result[8] = (textBytes.length >> 8) & 0xFF;
  result[9] = textBytes.length & 0xFF;
  result[10] = 0x15; // Language code like ffmpeg uses
  result[11] = 0xc7;

  result.set(textBytes, 12);
  return result;
}

// Build loci atom (ISO 14496-12 location)
function buildLociAtom(lat, lon, alt) {
  // loci atom structure:
  // - size (4)
  // - type 'loci' (4)
  // - version (1) + flags (3)
  // - language (2)
  // - name (null-terminated string)
  // - role (1)
  // - longitude (4) - fixed point 16.16
  // - latitude (4) - fixed point 16.16
  // - altitude (4) - fixed point 16.16
  // - body (null-terminated)
  // - notes (null-terminated)

  const name = ""; // empty name
  const body = "";
  const notes = "";

  const size = 8 + 4 + 2 + (name.length + 1) + 1 + 4 + 4 + 4 + (body.length + 1) + (notes.length + 1);
  const result = new Uint8Array(size);

  let offset = 0;

  // Size
  writeUint32BE(result, offset, size);
  offset += 4;

  // Type 'loci'
  result[offset++] = 0x6C; // l
  result[offset++] = 0x6F; // o
  result[offset++] = 0x63; // c
  result[offset++] = 0x69; // i

  // Version (0) + flags (0)
  result[offset++] = 0x00;
  result[offset++] = 0x00;
  result[offset++] = 0x00;
  result[offset++] = 0x00;

  // Language (undetermined = 0x55C4)
  result[offset++] = 0x55;
  result[offset++] = 0xC4;

  // Name (null-terminated)
  result[offset++] = 0x00;

  // Role (0 = shooting location)
  result[offset++] = 0x00;

  // Longitude - fixed point 16.16 (degrees)
  const lonFixed = Math.round(lon * 65536);
  writeUint32BE(result, offset, lonFixed);
  offset += 4;

  // Latitude - fixed point 16.16 (degrees)
  const latFixed = Math.round(lat * 65536);
  writeUint32BE(result, offset, latFixed);
  offset += 4;

  // Altitude - fixed point 16.16 (meters)
  const altFixed = Math.round(alt * 65536);
  writeUint32BE(result, offset, altFixed);
  offset += 4;

  // Body (null-terminated)
  result[offset++] = 0x00;

  // Notes (null-terminated)
  result[offset++] = 0x00;

  return result;
}

// ============================================
// BUILD META ATOM (Keys format)
// ============================================

function buildMetaAtom(meta) {
  // Keys to include
  const keys = [
    'com.apple.quicktime.creationdate',
    'com.apple.quicktime.location.ISO6709',
    'com.apple.quicktime.make',
    'com.apple.quicktime.model',
    'com.apple.quicktime.software',
    'com.apple.quicktime.content.identifier',
  ];

  const values = [
    meta.dateISO,
    meta.gpsIso6709,
    meta.make,
    meta.model,
    meta.software,
    meta.contentId,
  ];

  // Build hdlr atom
  const hdlrData = new Uint8Array([
    0x00, 0x00, 0x00, 0x00, // version + flags
    0x00, 0x00, 0x00, 0x00, // predefined
    0x6D, 0x64, 0x74, 0x61, // handler type 'mdta'
    0x00, 0x00, 0x00, 0x00, // reserved
    0x00, 0x00, 0x00, 0x00, // reserved
    0x00, 0x00, 0x00, 0x00, // reserved
    0x00, // empty name
  ]);
  const hdlrAtom = wrapAtom('hdlr', hdlrData);

  // Build keys atom
  const keysContent = [];
  // Version + flags
  keysContent.push(0x00, 0x00, 0x00, 0x00);
  // Entry count
  keysContent.push(0x00, 0x00, 0x00, keys.length);

  for (let i = 0; i < keys.length; i++) {
    const keyBytes = new TextEncoder().encode(keys[i]);
    const keySize = 8 + keyBytes.length;
    keysContent.push((keySize >> 24) & 0xFF, (keySize >> 16) & 0xFF, (keySize >> 8) & 0xFF, keySize & 0xFF);
    keysContent.push(0x6D, 0x64, 0x74, 0x61); // 'mdta'
    for (let j = 0; j < keyBytes.length; j++) {
      keysContent.push(keyBytes[j]);
    }
  }
  const keysAtom = wrapAtom('keys', new Uint8Array(keysContent));

  // Build ilst atom
  const ilstContent = [];
  for (let i = 0; i < values.length; i++) {
    const valueBytes = new TextEncoder().encode(values[i]);

    // data atom
    const dataSize = 16 + valueBytes.length;
    const dataAtom = new Uint8Array(dataSize);
    writeUint32BE(dataAtom, 0, dataSize);
    dataAtom[4] = 0x64; dataAtom[5] = 0x61; dataAtom[6] = 0x74; dataAtom[7] = 0x61; // 'data'
    dataAtom[8] = 0x00; dataAtom[9] = 0x00; dataAtom[10] = 0x00; dataAtom[11] = 0x01; // UTF-8 type
    dataAtom[12] = 0x00; dataAtom[13] = 0x00; dataAtom[14] = 0x00; dataAtom[15] = 0x00; // locale
    dataAtom.set(valueBytes, 16);

    // Item wrapper (key index is 1-based)
    const itemSize = 8 + dataSize;
    const itemAtom = new Uint8Array(itemSize);
    writeUint32BE(itemAtom, 0, itemSize);
    itemAtom[4] = 0x00;
    itemAtom[5] = 0x00;
    itemAtom[6] = 0x00;
    itemAtom[7] = i + 1; // 1-based key index
    itemAtom.set(dataAtom, 8);

    for (let j = 0; j < itemAtom.length; j++) {
      ilstContent.push(itemAtom[j]);
    }
  }
  const ilstAtom = wrapAtom('ilst', new Uint8Array(ilstContent));

  // Combine into meta atom (NO version/flags for meta at moov level)
  const metaContent = new Uint8Array(hdlrAtom.length + keysAtom.length + ilstAtom.length);
  metaContent.set(hdlrAtom, 0);
  metaContent.set(keysAtom, hdlrAtom.length);
  metaContent.set(ilstAtom, hdlrAtom.length + keysAtom.length);

  return wrapAtom('meta', metaContent);
}

function wrapAtom(type, content) {
  const size = 8 + content.length;
  const result = new Uint8Array(size);
  writeUint32BE(result, 0, size);
  result[4] = type.charCodeAt(0);
  result[5] = type.charCodeAt(1);
  result[6] = type.charCodeAt(2);
  result[7] = type.charCodeAt(3);
  result.set(content, 8);
  return result;
}

// ============================================
// PHOTO (JPEG) METADATA - keeping for compatibility
// ============================================

export function injectPhotoMetadata(jpegData, metadata) {
  // Simplified - just return original for now
  // Photo support can be added later if needed
  return new Uint8Array(jpegData);
}
