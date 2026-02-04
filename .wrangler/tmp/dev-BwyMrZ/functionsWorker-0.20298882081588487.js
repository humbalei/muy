var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-OKayEG/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/bundle-OKayEG/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// .wrangler/tmp/pages-zzpvAe/functionsWorker-0.20298882081588487.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var urls2 = /* @__PURE__ */ new Set();
function checkURL2(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls2.has(url.toString())) {
      urls2.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL2, "checkURL");
__name2(checkURL2, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL2(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});
function stripCfConnectingIPHeader2(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader2, "stripCfConnectingIPHeader");
__name2(stripCfConnectingIPHeader2, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader2.apply(null, argArray)
    ]);
  }
});
var DEVICES = {
  "iPhone 16 Pro": {
    make: "Apple",
    model: "iPhone 16 Pro",
    software: "18.2.1",
    lensModel: "iPhone 16 Pro back camera 6.86mm f/1.78",
    focalLength: 6.86,
    focalLength35mm: 24,
    aperture: 1.78
  },
  "iPhone 16 Pro Max": {
    make: "Apple",
    model: "iPhone 16 Pro Max",
    software: "18.2.1",
    lensModel: "iPhone 16 Pro Max back camera 6.86mm f/1.78",
    focalLength: 6.86,
    focalLength35mm: 24,
    aperture: 1.78
  },
  "iPhone 17 Pro": {
    make: "Apple",
    model: "iPhone 17 Pro",
    software: "19.0",
    lensModel: "iPhone 17 Pro back camera 6.86mm f/1.78",
    focalLength: 6.86,
    focalLength35mm: 24,
    aperture: 1.78
  },
  "iPhone 17 Pro Max": {
    make: "Apple",
    model: "iPhone 17 Pro Max",
    software: "19.0",
    lensModel: "iPhone 17 Pro Max back camera 6.86mm f/1.78",
    focalLength: 6.86,
    focalLength35mm: 24,
    aperture: 1.78
  }
};
var CITIES = {
  "New York": { lat: 40.7128, lon: -74.006, alt: 10, tz: "-05:00" },
  "Los Angeles": { lat: 34.0522, lon: -118.2437, alt: 71, tz: "-08:00" },
  "Miami": { lat: 25.7617, lon: -80.1918, alt: 2, tz: "-05:00" },
  "Chicago": { lat: 41.8781, lon: -87.6298, alt: 181, tz: "-06:00" },
  "London": { lat: 51.5074, lon: -0.1278, alt: 11, tz: "+00:00" },
  "Prague": { lat: 50.0755, lon: 14.4378, alt: 235, tz: "+01:00" },
  "Paris": { lat: 48.8566, lon: 2.3522, alt: 35, tz: "+01:00" },
  "Berlin": { lat: 52.52, lon: 13.405, alt: 34, tz: "+01:00" },
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
  "Seoul": { lat: 37.5665, lon: 126.978, alt: 38, tz: "+09:00" },
  "Mumbai": { lat: 19.076, lon: 72.8777, alt: 14, tz: "+05:30" }
};
function generateMetadata(city, device) {
  const dev = DEVICES[device] || DEVICES["iPhone 16 Pro"];
  const loc = CITIES[city] || CITIES["New York"];
  const lat = loc.lat + (Math.random() - 0.5) * 0.02;
  const lon = loc.lon + (Math.random() - 0.5) * 0.02;
  const alt = Math.max(0, loc.alt + Math.floor(Math.random() * 20) - 10);
  const now = /* @__PURE__ */ new Date();
  const daysAgo = Math.floor(Math.random() * 7);
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1e3);
  date.setHours(8 + Math.floor(Math.random() * 12));
  date.setMinutes(Math.floor(Math.random() * 60));
  date.setSeconds(Math.floor(Math.random() * 60));
  const isoValues = [32, 50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800];
  const shutterSpeeds = ["1/30", "1/60", "1/100", "1/125", "1/250", "1/500", "1/1000", "1/2000"];
  const iso = isoValues[Math.floor(Math.random() * isoValues.length)];
  const shutter = shutterSpeeds[Math.floor(Math.random() * shutterSpeeds.length)];
  const contentId = crypto.randomUUID().toUpperCase();
  const pad = /* @__PURE__ */ __name2((n) => String(n).padStart(2, "0"), "pad");
  const dateStr = `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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
    latRef: lat >= 0 ? "N" : "S",
    lonRef: lon >= 0 ? "E" : "W",
    date: dateStr,
    dateWithTz,
    timezone: loc.tz,
    iso,
    shutter,
    exposureTime: parseShutter(shutter),
    contentId,
    gpsIso6709: formatGpsIso6709(lat, lon, alt),
    brightness: (4 + Math.random() * 4).toFixed(2),
    direction: Math.floor(Math.random() * 360),
    subsec: String(Math.floor(Math.random() * 1e3)).padStart(3, "0")
  };
}
__name(generateMetadata, "generateMetadata");
__name2(generateMetadata, "generateMetadata");
function parseShutter(shutter) {
  const parts = shutter.split("/");
  if (parts.length === 2) {
    return parseFloat(parts[0]) / parseFloat(parts[1]);
  }
  return parseFloat(shutter);
}
__name(parseShutter, "parseShutter");
__name2(parseShutter, "parseShutter");
function formatGpsIso6709(lat, lon, alt) {
  const latSign = lat >= 0 ? "+" : "-";
  const lonSign = lon >= 0 ? "+" : "-";
  const latStr = `${latSign}${Math.abs(lat).toFixed(4)}`;
  const lonStr = `${lonSign}${Math.abs(lon).toFixed(4).padStart(9, "0")}`;
  const altStr = `+${Math.floor(alt).toString().padStart(3, "0")}`;
  return `${latStr}${lonStr}${altStr}/`;
}
__name(formatGpsIso6709, "formatGpsIso6709");
__name2(formatGpsIso6709, "formatGpsIso6709");
function injectPhotoMetadata(jpegData, metadata) {
  const data = new Uint8Array(jpegData);
  const exif = buildExifSegment(metadata);
  const cleaned = removeExistingExif(data);
  const result = new Uint8Array(cleaned.length + exif.length);
  result.set(cleaned.slice(0, 2));
  result.set(exif, 2);
  result.set(cleaned.slice(2), 2 + exif.length);
  return result;
}
__name(injectPhotoMetadata, "injectPhotoMetadata");
__name2(injectPhotoMetadata, "injectPhotoMetadata");
function removeExistingExif(data) {
  const result = [];
  let i = 0;
  result.push(data[0], data[1]);
  i = 2;
  while (i < data.length - 1) {
    if (data[i] === 255 && data[i + 1] === 225) {
      const length = data[i + 2] << 8 | data[i + 3];
      i += 2 + length;
      continue;
    }
    result.push(data[i]);
    i++;
  }
  while (i < data.length)
    result.push(data[i++]);
  return new Uint8Array(result);
}
__name(removeExistingExif, "removeExistingExif");
__name2(removeExistingExif, "removeExistingExif");
function buildExifSegment(meta) {
  const buffer = [];
  buffer.push(255, 225);
  const lengthPos = buffer.length;
  buffer.push(0, 0);
  buffer.push(69, 120, 105, 102, 0, 0);
  const tiffStart = buffer.length;
  buffer.push(73, 73);
  buffer.push(42, 0);
  buffer.push(8, 0, 0, 0);
  const ifd0Entries = [
    makeEntry(271, 2, meta.make + "\0"),
    // Make
    makeEntry(272, 2, meta.model + "\0"),
    // Model
    makeEntry(274, 3, [1]),
    // Orientation
    makeEntry(305, 2, meta.software + "\0"),
    // Software
    makeEntry(306, 2, meta.date + "\0")
    // DateTime
  ];
  const gpsEntries = [
    makeEntry(1, 2, meta.latRef + "\0"),
    // GPSLatitudeRef
    makeEntry(2, 5, gpsCoordToRational(Math.abs(meta.lat))),
    // GPSLatitude
    makeEntry(3, 2, meta.lonRef + "\0"),
    // GPSLongitudeRef
    makeEntry(4, 5, gpsCoordToRational(Math.abs(meta.lon))),
    // GPSLongitude
    makeEntry(5, 1, [0]),
    // GPSAltitudeRef
    makeEntry(6, 5, [[Math.round(meta.alt * 100), 100]])
    // GPSAltitude
  ];
  const exifEntries = [
    makeEntry(33434, 5, [[Math.round(meta.exposureTime * 1e6), 1e6]]),
    // ExposureTime
    makeEntry(33437, 5, [[Math.round(meta.aperture * 100), 100]]),
    // FNumber
    makeEntry(34855, 3, [meta.iso]),
    // ISO
    makeEntry(36867, 2, meta.date + "\0"),
    // DateTimeOriginal
    makeEntry(36868, 2, meta.date + "\0"),
    // DateTimeDigitized
    makeEntry(37386, 5, [[Math.round(meta.focalLength * 100), 100]]),
    // FocalLength
    makeEntry(41989, 3, [meta.focalLength35mm]),
    // FocalLengthIn35mmFilm
    makeEntry(42035, 2, meta.make + "\0"),
    // LensMake
    makeEntry(42036, 2, meta.lensModel + "\0")
    // LensModel
  ];
  const ifd0Size = 2 + ifd0Entries.length * 12 + 4;
  const exifIfdOffset = 8 + ifd0Size + calculateDataSize(ifd0Entries);
  const gpsIfdOffset = exifIfdOffset + 2 + exifEntries.length * 12 + 4 + calculateDataSize(exifEntries);
  ifd0Entries.push(makeEntry(34665, 4, [exifIfdOffset]));
  ifd0Entries.push(makeEntry(34853, 4, [gpsIfdOffset]));
  writeIFD(buffer, ifd0Entries, tiffStart, 8 + 2 + ifd0Entries.length * 12 + 4);
  buffer.length = tiffStart + exifIfdOffset;
  writeIFD(buffer, exifEntries, tiffStart, exifIfdOffset + 2 + exifEntries.length * 12 + 4);
  buffer.length = tiffStart + gpsIfdOffset;
  writeIFD(buffer, gpsEntries, tiffStart, gpsIfdOffset + 2 + gpsEntries.length * 12 + 4);
  const length = buffer.length - 2;
  buffer[lengthPos] = length >> 8 & 255;
  buffer[lengthPos + 1] = length & 255;
  return new Uint8Array(buffer);
}
__name(buildExifSegment, "buildExifSegment");
__name2(buildExifSegment, "buildExifSegment");
function makeEntry(tag, type, value) {
  return { tag, type, value };
}
__name(makeEntry, "makeEntry");
__name2(makeEntry, "makeEntry");
function gpsCoordToRational(coord) {
  const deg = Math.floor(coord);
  const minFloat = (coord - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = Math.round((minFloat - min) * 60 * 1e4);
  return [[deg, 1], [min, 1], [sec, 1e4]];
}
__name(gpsCoordToRational, "gpsCoordToRational");
__name2(gpsCoordToRational, "gpsCoordToRational");
function calculateDataSize(entries) {
  let size = 0;
  for (const e of entries) {
    const valueSize = getValueSize(e.type, e.value);
    if (valueSize > 4)
      size += valueSize;
  }
  return size;
}
__name(calculateDataSize, "calculateDataSize");
__name2(calculateDataSize, "calculateDataSize");
function getValueSize(type, value) {
  if (type === 2)
    return value.length;
  if (type === 3)
    return value.length * 2;
  if (type === 4)
    return value.length * 4;
  if (type === 5)
    return value.length * 8;
  if (type === 1)
    return value.length;
  return 4;
}
__name(getValueSize, "getValueSize");
__name2(getValueSize, "getValueSize");
function writeIFD(buffer, entries, tiffStart, dataOffset) {
  buffer.push(entries.length & 255, entries.length >> 8 & 255);
  let currentDataOffset = dataOffset;
  for (const entry of entries) {
    buffer.push(entry.tag & 255, entry.tag >> 8 & 255);
    buffer.push(entry.type & 255, entry.type >> 8 & 255);
    const { count, bytes } = encodeValue(entry.type, entry.value);
    buffer.push(count & 255, count >> 8 & 255, count >> 16 & 255, count >> 24 & 255);
    if (bytes.length <= 4) {
      buffer.push(...bytes);
      while (buffer.length % 12 !== (tiffStart + 8 + 2) % 12 + 8) {
        if (bytes.length < 4)
          buffer.push(0);
        else
          break;
      }
      while (bytes.length + buffer.length % 4 < 4)
        buffer.push(0);
      for (let i = bytes.length; i < 4; i++)
        buffer.push(0);
    } else {
      buffer.push(
        currentDataOffset & 255,
        currentDataOffset >> 8 & 255,
        currentDataOffset >> 16 & 255,
        currentDataOffset >> 24 & 255
      );
      currentDataOffset += bytes.length;
    }
  }
  buffer.push(0, 0, 0, 0);
  currentDataOffset = dataOffset;
  for (const entry of entries) {
    const { bytes } = encodeValue(entry.type, entry.value);
    if (bytes.length > 4) {
      while (buffer.length < tiffStart + currentDataOffset)
        buffer.push(0);
      buffer.push(...bytes);
      currentDataOffset += bytes.length;
    }
  }
}
__name(writeIFD, "writeIFD");
__name2(writeIFD, "writeIFD");
function encodeValue(type, value) {
  const bytes = [];
  let count;
  if (type === 2) {
    count = value.length;
    for (let i = 0; i < value.length; i++) {
      bytes.push(value.charCodeAt(i));
    }
  } else if (type === 3) {
    count = value.length;
    for (const v of value) {
      bytes.push(v & 255, v >> 8 & 255);
    }
  } else if (type === 4) {
    count = value.length;
    for (const v of value) {
      bytes.push(v & 255, v >> 8 & 255, v >> 16 & 255, v >> 24 & 255);
    }
  } else if (type === 5) {
    count = value.length;
    for (const [num, den] of value) {
      bytes.push(num & 255, num >> 8 & 255, num >> 16 & 255, num >> 24 & 255);
      bytes.push(den & 255, den >> 8 & 255, den >> 16 & 255, den >> 24 & 255);
    }
  } else if (type === 1) {
    count = value.length;
    bytes.push(...value);
  } else {
    count = 1;
    bytes.push(0, 0, 0, 0);
  }
  return { count, bytes };
}
__name(encodeValue, "encodeValue");
__name2(encodeValue, "encodeValue");
function injectVideoMetadata(videoData, metadata) {
  let data = new Uint8Array(videoData);
  const atoms = parseAtoms(data, 0, data.length);
  const moovAtom = atoms.find((a) => a.type === "moov");
  if (!moovAtom) {
    console.log("No moov atom found");
    return data;
  }
  data = updateTimeAtoms(data, moovAtom, metadata);
  const udtaAtom = buildCompleteUdtaAtom(metadata);
  data = insertUdtaIntoMoov(data, moovAtom, udtaAtom);
  data = addXmpMetadata(data, metadata);
  return data;
}
__name(injectVideoMetadata, "injectVideoMetadata");
__name2(injectVideoMetadata, "injectVideoMetadata");
function dateToMacTimestamp(dateStr) {
  const parts = dateStr.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!parts)
    return Math.floor(Date.now() / 1e3) + 2082844800;
  const date = new Date(
    parseInt(parts[1]),
    parseInt(parts[2]) - 1,
    parseInt(parts[3]),
    parseInt(parts[4]),
    parseInt(parts[5]),
    parseInt(parts[6])
  );
  return Math.floor(date.getTime() / 1e3) + 2082844800;
}
__name(dateToMacTimestamp, "dateToMacTimestamp");
__name2(dateToMacTimestamp, "dateToMacTimestamp");
function updateTimeAtoms(data, moovAtom, metadata) {
  const result = new Uint8Array(data);
  const macTime = dateToMacTimestamp(metadata.date);
  const moovStart = moovAtom.offset + 8;
  const moovEnd = moovAtom.offset + moovAtom.size;
  let offset = moovStart;
  while (offset < moovEnd - 8) {
    const size = result[offset] << 24 | result[offset + 1] << 16 | result[offset + 2] << 8 | result[offset + 3];
    const type = String.fromCharCode(
      result[offset + 4],
      result[offset + 5],
      result[offset + 6],
      result[offset + 7]
    );
    if (size < 8 || offset + size > moovEnd)
      break;
    if (type === "mvhd") {
      const version = result[offset + 8];
      const timeOffset = version === 1 ? 12 : 12;
      if (version === 0) {
        writeUint32BE(result, offset + timeOffset, macTime);
        writeUint32BE(result, offset + timeOffset + 4, macTime);
      }
    } else if (type === "trak") {
      updateTrackAtoms(result, offset + 8, offset + size, macTime);
    }
    offset += size;
  }
  return result;
}
__name(updateTimeAtoms, "updateTimeAtoms");
__name2(updateTimeAtoms, "updateTimeAtoms");
function updateTrackAtoms(data, start, end, macTime) {
  let offset = start;
  while (offset < end - 8) {
    const size = data[offset] << 24 | data[offset + 1] << 16 | data[offset + 2] << 8 | data[offset + 3];
    const type = String.fromCharCode(
      data[offset + 4],
      data[offset + 5],
      data[offset + 6],
      data[offset + 7]
    );
    if (size < 8 || offset + size > end)
      break;
    if (type === "tkhd") {
      const version = data[offset + 8];
      if (version === 0) {
        writeUint32BE(data, offset + 12, macTime);
        writeUint32BE(data, offset + 16, macTime);
      }
    } else if (type === "mdia") {
      updateMediaAtoms(data, offset + 8, offset + size, macTime);
    }
    offset += size;
  }
}
__name(updateTrackAtoms, "updateTrackAtoms");
__name2(updateTrackAtoms, "updateTrackAtoms");
function updateMediaAtoms(data, start, end, macTime) {
  let offset = start;
  while (offset < end - 8) {
    const size = data[offset] << 24 | data[offset + 1] << 16 | data[offset + 2] << 8 | data[offset + 3];
    const type = String.fromCharCode(
      data[offset + 4],
      data[offset + 5],
      data[offset + 6],
      data[offset + 7]
    );
    if (size < 8 || offset + size > end)
      break;
    if (type === "mdhd") {
      const version = data[offset + 8];
      if (version === 0) {
        writeUint32BE(data, offset + 12, macTime);
        writeUint32BE(data, offset + 16, macTime);
      }
    }
    offset += size;
  }
}
__name(updateMediaAtoms, "updateMediaAtoms");
__name2(updateMediaAtoms, "updateMediaAtoms");
function writeUint32BE(data, offset, value) {
  data[offset] = value >> 24 & 255;
  data[offset + 1] = value >> 16 & 255;
  data[offset + 2] = value >> 8 & 255;
  data[offset + 3] = value & 255;
}
__name(writeUint32BE, "writeUint32BE");
__name2(writeUint32BE, "writeUint32BE");
function buildCompleteUdtaAtom(meta) {
  const content = [];
  const metaAtom = buildCompleteMetaAtom(meta);
  content.push(...metaAtom);
  const size = 8 + content.length;
  return new Uint8Array([
    size >> 24 & 255,
    size >> 16 & 255,
    size >> 8 & 255,
    size & 255,
    117,
    100,
    116,
    97,
    // 'udta'
    ...content
  ]);
}
__name(buildCompleteUdtaAtom, "buildCompleteUdtaAtom");
__name2(buildCompleteUdtaAtom, "buildCompleteUdtaAtom");
function buildCompleteMetaAtom(meta) {
  const items = [
    ["com.apple.quicktime.make", meta.make],
    ["com.apple.quicktime.model", meta.model],
    ["com.apple.quicktime.software", meta.software],
    ["com.apple.quicktime.creationdate", meta.dateWithTz],
    ["com.apple.quicktime.location.ISO6709", meta.gpsIso6709],
    ["com.apple.quicktime.content.identifier", meta.contentId],
    ["com.apple.quicktime.camera.lens_model", meta.lensModel],
    ["com.apple.quicktime.camera.focal_length.35mm_equivalent", String(meta.focalLength35mm)],
    ["com.apple.quicktime.location.accuracy.horizontal", "5.000000"],
    ["com.apple.quicktime.live-photo.auto", "0"],
    ["com.apple.quicktime.full-frame-rate-playback-intent", "1"],
    ["com.apple.quicktime.live-photo.vitality-score", "1.000000"],
    ["com.apple.quicktime.live-photo.vitality-scoring-version", "4"],
    ["com.apple.quicktime.direction.facing", String(meta.direction)]
  ];
  const keysContent = [0, 0, 0, 0];
  keysContent.push(0, 0, 0, items.length);
  for (const [key] of items) {
    const keyBytes = new TextEncoder().encode(key);
    const keySize = keyBytes.length + 8;
    keysContent.push(keySize >> 24 & 255, keySize >> 16 & 255, keySize >> 8 & 255, keySize & 255);
    keysContent.push(109, 100, 116, 97);
    keysContent.push(...keyBytes);
  }
  const keysAtom = buildAtomFromContent("keys", keysContent);
  const ilstContent = [];
  items.forEach(([, value], index) => {
    const valueBytes = new TextEncoder().encode(String(value));
    const dataSize = 16 + valueBytes.length;
    const dataAtom = [
      dataSize >> 24 & 255,
      dataSize >> 16 & 255,
      dataSize >> 8 & 255,
      dataSize & 255,
      100,
      97,
      116,
      97,
      // 'data'
      0,
      0,
      0,
      1,
      // type: UTF-8
      0,
      0,
      0,
      0,
      // locale
      ...valueBytes
    ];
    const itemSize = 8 + dataAtom.length;
    ilstContent.push(
      itemSize >> 24 & 255,
      itemSize >> 16 & 255,
      itemSize >> 8 & 255,
      itemSize & 255,
      0,
      0,
      0,
      index + 1,
      ...dataAtom
    );
  });
  const ilstAtom = buildAtomFromContent("ilst", ilstContent);
  const hdlrContent = [
    0,
    0,
    0,
    0,
    // version + flags
    0,
    0,
    0,
    0,
    // predefined
    109,
    100,
    116,
    97,
    // handler type 'mdta'
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0
    // name
  ];
  const hdlrAtom = buildAtomFromContent("hdlr", hdlrContent);
  const metaContent = [0, 0, 0, 0, ...hdlrAtom, ...keysAtom, ...ilstAtom];
  return buildAtomFromContent("meta", metaContent);
}
__name(buildCompleteMetaAtom, "buildCompleteMetaAtom");
__name2(buildCompleteMetaAtom, "buildCompleteMetaAtom");
function addXmpMetadata(data, metadata) {
  const xmpContent = buildXmpPacket(metadata);
  const xmpUuid = [
    190,
    122,
    207,
    203,
    151,
    169,
    66,
    232,
    156,
    113,
    153,
    148,
    145,
    227,
    175,
    172
  ];
  const xmpBytes = new TextEncoder().encode(xmpContent);
  const atomSize = 8 + 16 + xmpBytes.length;
  const xmpAtom = new Uint8Array(atomSize);
  xmpAtom[0] = atomSize >> 24 & 255;
  xmpAtom[1] = atomSize >> 16 & 255;
  xmpAtom[2] = atomSize >> 8 & 255;
  xmpAtom[3] = atomSize & 255;
  xmpAtom[4] = 117;
  xmpAtom[5] = 117;
  xmpAtom[6] = 105;
  xmpAtom[7] = 100;
  xmpAtom.set(xmpUuid, 8);
  xmpAtom.set(xmpBytes, 24);
  const result = new Uint8Array(data.length + xmpAtom.length);
  result.set(data);
  result.set(xmpAtom, data.length);
  return result;
}
__name(addXmpMetadata, "addXmpMetadata");
__name2(addXmpMetadata, "addXmpMetadata");
function buildXmpPacket(meta) {
  const isoDate = meta.date.replace(/:/g, "-").replace(" ", "T") + meta.timezone;
  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Apple Photos 9.0">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:tiff="http://ns.adobe.com/tiff/1.0/"
      xmlns:exif="http://ns.adobe.com/exif/1.0/"
      xmlns:exifEX="http://cipa.jp/exif/1.0/"
      xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
      xmlns:xmp="http://ns.adobe.com/xap/1.0/"
      xmlns:creatorAtom="http://ns.adobe.com/creatorAtom/1.0/"
      tiff:Make="${meta.make}"
      tiff:Model="${meta.model}"
      tiff:Software="${meta.software}"
      exif:DateTimeOriginal="${isoDate}"
      exif:LensModel="${meta.lensModel}"
      exif:LensMake="${meta.make}"
      exif:FocalLength="${meta.focalLength}/1"
      exif:FocalLengthIn35mmFilm="${meta.focalLength35mm}"
      exif:FNumber="${Math.round(meta.aperture * 10)}/10"
      exif:ISOSpeedRatings="${meta.iso}"
      exif:GPSLatitude="${formatGpsExif(meta.lat, meta.latRef)}"
      exif:GPSLongitude="${formatGpsExif(meta.lon, meta.lonRef)}"
      exif:GPSAltitude="${Math.round(meta.alt * 100)}/100"
      exif:GPSAltitudeRef="0"
      photoshop:DateCreated="${isoDate}"
      xmp:CreateDate="${isoDate}"
      xmp:ModifyDate="${isoDate}"
      xmp:CreatorTool="${meta.software}">
      <exif:GPSLatitudeRef>${meta.latRef}</exif:GPSLatitudeRef>
      <exif:GPSLongitudeRef>${meta.lonRef}</exif:GPSLongitudeRef>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}
__name(buildXmpPacket, "buildXmpPacket");
__name2(buildXmpPacket, "buildXmpPacket");
function formatGpsExif(coord, ref) {
  const abs = Math.abs(coord);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;
  return `${deg},${min},${sec.toFixed(2)}${ref}`;
}
__name(formatGpsExif, "formatGpsExif");
__name2(formatGpsExif, "formatGpsExif");
function parseAtoms(data, start, end) {
  const atoms = [];
  let offset = start;
  while (offset < end - 8) {
    const size = data[offset] << 24 | data[offset + 1] << 16 | data[offset + 2] << 8 | data[offset + 3];
    const type = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);
    if (size < 8 || offset + size > end)
      break;
    atoms.push({ type, offset, size });
    offset += size;
  }
  return atoms;
}
__name(parseAtoms, "parseAtoms");
__name2(parseAtoms, "parseAtoms");
function buildAtomFromContent(type, content) {
  const size = 8 + content.length;
  return [
    size >> 24 & 255,
    size >> 16 & 255,
    size >> 8 & 255,
    size & 255,
    type.charCodeAt(0),
    type.charCodeAt(1),
    type.charCodeAt(2),
    type.charCodeAt(3),
    ...content
  ];
}
__name(buildAtomFromContent, "buildAtomFromContent");
__name2(buildAtomFromContent, "buildAtomFromContent");
function insertUdtaIntoMoov(data, moovAtom, udtaAtom) {
  const moovEnd = moovAtom.offset + moovAtom.size;
  const moovChildren = parseAtoms(data, moovAtom.offset + 8, moovEnd);
  const existingUdta = moovChildren.find((a) => a.type === "udta");
  let insertPos, removeSize;
  if (existingUdta) {
    insertPos = existingUdta.offset;
    removeSize = existingUdta.size;
  } else {
    insertPos = moovEnd;
    removeSize = 0;
  }
  const sizeDiff = udtaAtom.length - removeSize;
  const result = new Uint8Array(data.length + sizeDiff);
  result.set(data.slice(0, insertPos));
  result.set(udtaAtom, insertPos);
  result.set(data.slice(insertPos + removeSize), insertPos + udtaAtom.length);
  const newMoovSize = moovAtom.size + sizeDiff;
  result[moovAtom.offset] = newMoovSize >> 24 & 255;
  result[moovAtom.offset + 1] = newMoovSize >> 16 & 255;
  result[moovAtom.offset + 2] = newMoovSize >> 8 & 255;
  result[moovAtom.offset + 3] = newMoovSize & 255;
  return result;
}
__name(insertUdtaIntoMoov, "insertUdtaIntoMoov");
__name2(insertUdtaIntoMoov, "insertUdtaIntoMoov");
async function onRequestPost(context) {
  try {
    const formData = await context.request.formData();
    const photo = formData.get("photo");
    const city = formData.get("city") || "New York";
    const device = formData.get("device") || "iPhone 16 Pro";
    if (!photo) {
      return new Response(JSON.stringify({ error: "No photo provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const metadata = generateMetadata(city, device);
    const photoData = await photo.arrayBuffer();
    const spoofedPhoto = injectPhotoMetadata(photoData, metadata);
    return new Response(spoofedPhoto, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="IMG_${Date.now()}.jpg"`,
        "X-Metadata": JSON.stringify(metadata),
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    console.error("Photo spoof error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost, "onRequestPost");
__name2(onRequestPost, "onRequestPost");
async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*"
    }
  });
}
__name(onRequestOptions, "onRequestOptions");
__name2(onRequestOptions, "onRequestOptions");
async function onRequestPost2(context) {
  try {
    const formData = await context.request.formData();
    const video = formData.get("video");
    const city = formData.get("city") || "New York";
    const device = formData.get("device") || "iPhone 16 Pro";
    if (!video) {
      return new Response(JSON.stringify({ error: "No video provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const metadata = generateMetadata(city, device);
    const videoData = await video.arrayBuffer();
    const spoofedVideo = injectVideoMetadata(videoData, metadata);
    return new Response(spoofedVideo, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="IMG_${Date.now()}.mp4"`,
        "X-Metadata": JSON.stringify(metadata),
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    console.error("Video spoof error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost2, "onRequestPost2");
__name2(onRequestPost2, "onRequestPost");
async function onRequestOptions2() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*"
    }
  });
}
__name(onRequestOptions2, "onRequestOptions2");
__name2(onRequestOptions2, "onRequestOptions");
var routes = [
  {
    routePath: "/spoof-photo",
    mountPath: "/",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions]
  },
  {
    routePath: "/spoof-photo",
    mountPath: "/",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/spoof-video",
    mountPath: "/",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions2]
  },
  {
    routePath: "/spoof-video",
    mountPath: "/",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: () => {
            isFailOpen = true;
          }
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = /* @__PURE__ */ __name(class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
}, "__Facade_ScheduledController__");
__name2(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-OKayEG/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-OKayEG/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__2, "__Facade_ScheduledController__");
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.20298882081588487.js.map
