var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// _shared/spoofer.js
var DEVICES = {
  "iPhone 16 Pro": {
    make: "Apple",
    model: "iPhone 16 Pro",
    software: "18.2.1"
  },
  "iPhone 16 Pro Max": {
    make: "Apple",
    model: "iPhone 16 Pro Max",
    software: "18.2.1"
  },
  "iPhone 17 Pro": {
    make: "Apple",
    model: "iPhone 17 Pro",
    software: "19.0"
  },
  "iPhone 17 Pro Max": {
    make: "Apple",
    model: "iPhone 17 Pro Max",
    software: "19.0"
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
  const lat = loc.lat + (Math.random() - 0.5) * 0.01;
  const lon = loc.lon + (Math.random() - 0.5) * 0.01;
  const alt = Math.max(0, loc.alt + Math.floor(Math.random() * 20) - 10);
  const now = /* @__PURE__ */ new Date();
  const daysAgo = 1 + Math.floor(Math.random() * 14);
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1e3);
  date.setHours(8 + Math.floor(Math.random() * 12));
  date.setMinutes(Math.floor(Math.random() * 60));
  date.setSeconds(Math.floor(Math.random() * 60));
  const pad = /* @__PURE__ */ __name((n) => String(n).padStart(2, "0"), "pad");
  const dateExif = `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  const tzNoColon = loc.tz.replace(":", "");
  const dateISO = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${tzNoColon}`;
  const latSign = lat >= 0 ? "+" : "-";
  const lonSign = lon >= 0 ? "+" : "-";
  const latAbs = Math.abs(lat).toFixed(4);
  const lonAbs = Math.abs(lon).toFixed(4);
  const latPadded = latAbs.padStart(7, "0");
  const lonPadded = lonAbs.padStart(8, "0");
  const gpsIso6709 = `${latSign}${latPadded}${lonSign}${lonPadded}/`;
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
    contentId: crypto.randomUUID().toUpperCase()
  };
}
__name(generateMetadata, "generateMetadata");
function injectVideoMetadata(videoData, metadata) {
  let data = new Uint8Array(videoData);
  const moovInfo = findAtom(data, 0, data.length, "moov");
  if (!moovInfo) {
    console.log("No moov atom found");
    return data;
  }
  const mdatInfo = findAtom(data, 0, data.length, "mdat");
  const mdatAfterMoov = mdatInfo && mdatInfo.offset > moovInfo.offset;
  let moovStart = moovInfo.offset;
  let moovSize = moovInfo.size;
  let sizeDiff = 0;
  const udtaInfo = findAtom(data, moovStart + 8, moovStart + moovSize, "udta");
  if (udtaInfo) {
    data = removeBytes(data, udtaInfo.offset, udtaInfo.size);
    moovSize -= udtaInfo.size;
    sizeDiff -= udtaInfo.size;
    updateAtomSize(data, moovStart, moovSize);
  }
  const metaInfo = findAtom(data, moovStart + 8, moovStart + moovSize, "meta");
  if (metaInfo) {
    data = removeBytes(data, metaInfo.offset, metaInfo.size);
    moovSize -= metaInfo.size;
    sizeDiff -= metaInfo.size;
    updateAtomSize(data, moovStart, moovSize);
  }
  const macTime = dateToMacTimestamp(metadata.dateExif);
  updateTimestamps(data, moovStart, moovSize, macTime);
  const udtaAtom = buildUdtaAtom(metadata);
  const insertPos = moovStart + moovSize;
  data = insertBytes(data, insertPos, udtaAtom);
  moovSize += udtaAtom.length;
  sizeDiff += udtaAtom.length;
  updateAtomSize(data, moovStart, moovSize);
  if (mdatAfterMoov && sizeDiff !== 0) {
    updateChunkOffsets(data, moovStart, moovSize, sizeDiff);
  }
  return data;
}
__name(injectVideoMetadata, "injectVideoMetadata");
function findAtom(data, start, end, type) {
  let offset = start;
  while (offset < end - 8) {
    const size = readUint32BE(data, offset);
    if (size < 8 || offset + size > end)
      break;
    const atomType = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);
    if (atomType === type) {
      return { offset, size };
    }
    offset += size;
  }
  return null;
}
__name(findAtom, "findAtom");
function readUint32BE(data, offset) {
  return data[offset] << 24 | data[offset + 1] << 16 | data[offset + 2] << 8 | data[offset + 3];
}
__name(readUint32BE, "readUint32BE");
function writeUint32BE(data, offset, value) {
  data[offset] = value >> 24 & 255;
  data[offset + 1] = value >> 16 & 255;
  data[offset + 2] = value >> 8 & 255;
  data[offset + 3] = value & 255;
}
__name(writeUint32BE, "writeUint32BE");
function updateAtomSize(data, offset, newSize) {
  writeUint32BE(data, offset, newSize);
}
__name(updateAtomSize, "updateAtomSize");
function removeBytes(data, offset, length) {
  const result = new Uint8Array(data.length - length);
  result.set(data.slice(0, offset));
  result.set(data.slice(offset + length), offset);
  return result;
}
__name(removeBytes, "removeBytes");
function insertBytes(data, offset, bytes) {
  const result = new Uint8Array(data.length + bytes.length);
  result.set(data.slice(0, offset));
  result.set(bytes, offset);
  result.set(data.slice(offset), offset + bytes.length);
  return result;
}
__name(insertBytes, "insertBytes");
function dateToMacTimestamp(dateExif) {
  const parts = dateExif.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
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
function updateTimestamps(data, moovStart, moovSize, macTime) {
  let offset = moovStart + 8;
  const end = moovStart + moovSize;
  while (offset < end - 8) {
    const size = readUint32BE(data, offset);
    if (size < 8 || offset + size > end)
      break;
    const type = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);
    if (type === "mvhd") {
      if (data[offset + 8] === 0) {
        writeUint32BE(data, offset + 12, macTime);
        writeUint32BE(data, offset + 16, macTime);
      }
    } else if (type === "trak") {
      updateTrackTimestamps(data, offset + 8, offset + size, macTime);
    }
    offset += size;
  }
}
__name(updateTimestamps, "updateTimestamps");
function updateTrackTimestamps(data, start, end, macTime) {
  let offset = start;
  while (offset < end - 8) {
    const size = readUint32BE(data, offset);
    if (size < 8 || offset + size > end)
      break;
    const type = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);
    if (type === "tkhd" && data[offset + 8] === 0) {
      writeUint32BE(data, offset + 12, macTime);
      writeUint32BE(data, offset + 16, macTime);
    } else if (type === "mdia") {
      updateMediaTimestamps(data, offset + 8, offset + size, macTime);
    }
    offset += size;
  }
}
__name(updateTrackTimestamps, "updateTrackTimestamps");
function updateMediaTimestamps(data, start, end, macTime) {
  let offset = start;
  while (offset < end - 8) {
    const size = readUint32BE(data, offset);
    if (size < 8 || offset + size > end)
      break;
    const type = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);
    if (type === "mdhd" && data[offset + 8] === 0) {
      writeUint32BE(data, offset + 12, macTime);
      writeUint32BE(data, offset + 16, macTime);
    }
    offset += size;
  }
}
__name(updateMediaTimestamps, "updateMediaTimestamps");
function updateChunkOffsets(data, moovStart, moovSize, sizeDiff) {
  updateOffsetsRecursive(data, moovStart + 8, moovStart + moovSize, sizeDiff);
}
__name(updateChunkOffsets, "updateChunkOffsets");
function updateOffsetsRecursive(data, start, end, sizeDiff) {
  let offset = start;
  while (offset < end - 8) {
    const size = readUint32BE(data, offset);
    if (size < 8 || offset + size > end)
      break;
    const type = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);
    if (type === "stco") {
      const count = readUint32BE(data, offset + 12);
      for (let i = 0; i < count; i++) {
        const entryOffset = offset + 16 + i * 4;
        const oldValue = readUint32BE(data, entryOffset);
        writeUint32BE(data, entryOffset, oldValue + sizeDiff);
      }
    } else if (type === "co64") {
      const count = readUint32BE(data, offset + 12);
      for (let i = 0; i < count; i++) {
        const entryOffset = offset + 16 + i * 8 + 4;
        const oldValue = readUint32BE(data, entryOffset);
        writeUint32BE(data, entryOffset, oldValue + sizeDiff);
      }
    } else if (type === "trak" || type === "mdia" || type === "minf" || type === "stbl") {
      updateOffsetsRecursive(data, offset + 8, offset + size, sizeDiff);
    }
    offset += size;
  }
}
__name(updateOffsetsRecursive, "updateOffsetsRecursive");
function buildUdtaAtom(meta) {
  const children = [];
  children.push(buildTextAtom("\xA9mak", meta.make));
  children.push(buildTextAtom("\xA9mod", meta.model));
  children.push(buildTextAtom("\xA9swr", meta.software));
  children.push(buildTextAtom("\xA9xyz", meta.gpsIso6709));
  let totalSize = 8;
  for (let i = 0; i < children.length; i++) {
    totalSize += children[i].length;
  }
  const result = new Uint8Array(totalSize);
  writeUint32BE(result, 0, totalSize);
  result[4] = 117;
  result[5] = 100;
  result[6] = 116;
  result[7] = 97;
  let offset = 8;
  for (let i = 0; i < children.length; i++) {
    result.set(children[i], offset);
    offset += children[i].length;
  }
  return result;
}
__name(buildUdtaAtom, "buildUdtaAtom");
function buildTextAtom(type, value) {
  const textBytes = new TextEncoder().encode(value);
  const size = 8 + 4 + textBytes.length;
  const result = new Uint8Array(size);
  writeUint32BE(result, 0, size);
  result[4] = type.charCodeAt(0);
  result[5] = type.charCodeAt(1);
  result[6] = type.charCodeAt(2);
  result[7] = type.charCodeAt(3);
  result[8] = textBytes.length >> 8 & 255;
  result[9] = textBytes.length & 255;
  result[10] = 21;
  result[11] = 199;
  result.set(textBytes, 12);
  return result;
}
__name(buildTextAtom, "buildTextAtom");
function injectPhotoMetadata(jpegData, metadata) {
  return new Uint8Array(jpegData);
}
__name(injectPhotoMetadata, "injectPhotoMetadata");

// spoof-photo.js
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

// spoof-video.js
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
__name(onRequestPost2, "onRequestPost");
async function onRequestOptions2() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "*"
    }
  });
}
__name(onRequestOptions2, "onRequestOptions");

// ../.wrangler/tmp/pages-IG3SA1/functionsRoutes-0.027968608199027356.mjs
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

// ../node_modules/path-to-regexp/dist.es2015/index.js
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
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
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
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
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
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
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
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
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
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
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
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../node_modules/wrangler/templates/pages-template-worker.ts
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
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
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
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
