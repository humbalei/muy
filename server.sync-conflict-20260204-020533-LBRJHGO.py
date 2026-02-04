#!/usr/bin/env python3
"""
Video Spoofer Server - ULTIMATE VERSION
Uses exiftool for 100% reliable iPhone metadata injection
"""

import os
import sys
import json
import subprocess
import tempfile
import random
import shutil
import uuid
from datetime import datetime, timedelta, timezone
from http.server import HTTPServer, SimpleHTTPRequestHandler
import cgi

# Tool paths
HOME = os.path.expanduser("~")
EXIFTOOL = os.path.join(HOME, "bin", "exiftool")
FFMPEG = os.path.join(HOME, "bin", "ffmpeg")

CITIES = {
    "New York": (40.7128, -74.0060, 10),
    "Los Angeles": (34.0522, -118.2437, 71),
    "Miami": (25.7617, -80.1918, 2),
    "Chicago": (41.8781, -87.6298, 181),
    "London": (51.5074, -0.1278, 11),
    "Prague": (50.0755, 14.4378, 235),
    "Paris": (48.8566, 2.3522, 35),
    "Berlin": (52.5200, 13.4050, 34),
    "Tokyo": (35.6762, 139.6503, 40),
    "Sydney": (-33.8688, 151.2093, 58),
    "Dubai": (25.2048, 55.2708, 5),
    "Toronto": (43.6532, -79.3832, 76),
    "Amsterdam": (52.3676, 4.9041, 2),
    "Barcelona": (41.3851, 2.1734, 12),
    "Rome": (41.9028, 12.4964, 21),
    "Vienna": (48.2082, 16.3738, 171),
    "Singapore": (1.3521, 103.8198, 15),
    "Hong Kong": (22.3193, 114.1694, 32),
    "Seoul": (37.5665, 126.9780, 38),
    "Mumbai": (19.0760, 72.8777, 14),
}

DEVICES = {
    "iPhone 16 Pro": {
        "make": "Apple",
        "model": "iPhone 16 Pro",
        "software": "18.2.1",
        "lens_make": "Apple",
        "lens_model": "iPhone 16 Pro back camera 6.86mm f/1.78",
        "focal_length": 6.86,
        "focal_length_35mm": 24,
        "aperture": 1.78,
        "max_aperture": 1.78,
    },
    "iPhone 16 Pro Max": {
        "make": "Apple",
        "model": "iPhone 16 Pro Max",
        "software": "18.2.1",
        "lens_make": "Apple",
        "lens_model": "iPhone 16 Pro Max back camera 6.86mm f/1.78",
        "focal_length": 6.86,
        "focal_length_35mm": 24,
        "aperture": 1.78,
        "max_aperture": 1.78,
    },
    "iPhone 17 Pro": {
        "make": "Apple",
        "model": "iPhone 17 Pro",
        "software": "19.0",
        "lens_make": "Apple",
        "lens_model": "iPhone 17 Pro back camera 6.86mm f/1.78",
        "focal_length": 6.86,
        "focal_length_35mm": 24,
        "aperture": 1.78,
        "max_aperture": 1.78,
    },
    "iPhone 17 Pro Max": {
        "make": "Apple",
        "model": "iPhone 17 Pro Max",
        "software": "19.0",
        "lens_make": "Apple",
        "lens_model": "iPhone 17 Pro Max back camera 6.86mm f/1.78",
        "focal_length": 6.86,
        "focal_length_35mm": 24,
        "aperture": 1.78,
        "max_aperture": 1.78,
    },
}


def format_gps_iso6709(lat, lon, alt):
    """Format GPS as ISO 6709: +40.7128-074.0060+010/"""
    lat_sign = '+' if lat >= 0 else '-'
    lon_sign = '+' if lon >= 0 else '-'
    lat_str = f"{lat_sign}{abs(lat):.4f}"
    lon_str = f"{lon_sign}{abs(lon):08.4f}"
    alt_str = f"+{int(alt):03d}"
    return f"{lat_str}{lon_str}{alt_str}/"


def format_gps_ref(coord, is_lat):
    """Get GPS reference (N/S/E/W)"""
    if is_lat:
        return 'N' if coord >= 0 else 'S'
    else:
        return 'E' if coord >= 0 else 'W'


def spoof_video_exiftool(input_path, output_path, metadata):
    """Use exiftool for reliable metadata injection - COMPLETE iPhone signature"""

    lat = metadata['lat']
    lon = metadata['lon']
    alt = metadata['alt']
    gps_iso = metadata['gps']

    # Build exiftool command with COMPLETE iPhone metadata signature
    cmd = [
        EXIFTOOL,
        '-overwrite_original',
        '-api', 'QuickTimeUTC',

        # ========== QUICKTIME CORE ==========
        f'-QuickTime:Make={metadata["make"]}',
        f'-QuickTime:Model={metadata["model"]}',
        f'-QuickTime:Software={metadata["software"]}',
        f'-QuickTime:CreationDate={metadata["date_with_tz"]}',
        f'-QuickTime:ModifyDate={metadata["date"]}',
        f'-QuickTime:TrackCreateDate={metadata["date"]}',
        f'-QuickTime:TrackModifyDate={metadata["date"]}',
        f'-QuickTime:MediaCreateDate={metadata["date"]}',
        f'-QuickTime:MediaModifyDate={metadata["date"]}',
        f'-QuickTime:GPSCoordinates={gps_iso}',

        # ========== APPLE KEYS (Primary for iOS) ==========
        f'-Keys:Make={metadata["make"]}',
        f'-Keys:Model={metadata["model"]}',
        f'-Keys:Software={metadata["software"]}',
        f'-Keys:CreationDate={metadata["date_with_tz"]}',
        f'-Keys:GPSCoordinates={gps_iso}',
        f'-Keys:ContentIdentifier={metadata["content_id"]}',

        # ========== XMP (Cross-platform) ==========
        f'-XMP:Make={metadata["make"]}',
        f'-XMP:Model={metadata["model"]}',
        f'-XMP:Software={metadata["software"]}',
        f'-XMP:DateCreated={metadata["date"]}',
        f'-XMP:CreateDate={metadata["date"]}',
        f'-XMP:ModifyDate={metadata["date"]}',
        f'-XMP:GPSLatitude={abs(lat)}',
        f'-XMP:GPSLongitude={abs(lon)}',
        f'-XMP:GPSAltitude={alt}',
        f'-XMP:GPSLatitudeRef={format_gps_ref(lat, True)}',
        f'-XMP:GPSLongitudeRef={format_gps_ref(lon, False)}',
        f'-XMP:LensInfo={metadata["focal_length"]}mm f/{metadata["aperture"]}',
        f'-XMP:Lens={metadata["lens_model"]}',
        f'-XMP:LensModel={metadata["lens_model"]}',
        f'-XMP:LensMake={metadata["lens_make"]}',
        f'-XMP:FocalLength={metadata["focal_length"]}',
        f'-XMP:FocalLengthIn35mmFormat={metadata["focal_length_35mm"]}',
        f'-XMP:FNumber={metadata["aperture"]}',
        f'-XMP:ApertureValue={metadata["aperture"]}',
        f'-XMP:MaxApertureValue={metadata["max_aperture"]}',
        f'-XMP:ExposureTime={metadata["exposure_time"]}',
        f'-XMP:ISO={metadata["iso"]}',
        f'-XMP:ColorSpace=sRGB',
        f'-XMP:CreatorTool={metadata["software"]}',

        # ========== EXIF (Standard photo/video metadata) ==========
        f'-EXIF:Make={metadata["make"]}',
        f'-EXIF:Model={metadata["model"]}',
        f'-EXIF:Software={metadata["software"]}',
        f'-EXIF:DateTimeOriginal={metadata["date"]}',
        f'-EXIF:CreateDate={metadata["date"]}',
        f'-EXIF:ModifyDate={metadata["date"]}',
        f'-EXIF:OffsetTime={metadata["tz_offset"]}',
        f'-EXIF:OffsetTimeOriginal={metadata["tz_offset"]}',
        f'-EXIF:GPSLatitude={abs(lat)}',
        f'-EXIF:GPSLongitude={abs(lon)}',
        f'-EXIF:GPSAltitude={alt}',
        f'-EXIF:GPSLatitudeRef={format_gps_ref(lat, True)}',
        f'-EXIF:GPSLongitudeRef={format_gps_ref(lon, False)}',
        f'-EXIF:GPSAltitudeRef=Above Sea Level',
        f'-EXIF:LensMake={metadata["lens_make"]}',
        f'-EXIF:LensModel={metadata["lens_model"]}',
        f'-EXIF:FocalLength={metadata["focal_length"]}',
        f'-EXIF:FocalLengthIn35mmFormat={metadata["focal_length_35mm"]}',
        f'-EXIF:FNumber={metadata["aperture"]}',
        f'-EXIF:ApertureValue={metadata["aperture"]}',
        f'-EXIF:MaxApertureValue={metadata["max_aperture"]}',
        f'-EXIF:ExposureTime={metadata["exposure_time"]}',
        f'-EXIF:ISO={metadata["iso"]}',
        f'-EXIF:ExposureProgram=Program AE',
        f'-EXIF:MeteringMode=Multi-segment',
        f'-EXIF:Flash=Off, Did not fire',
        f'-EXIF:WhiteBalance=Auto',
        f'-EXIF:ColorSpace=sRGB',
        f'-EXIF:SceneCaptureType=Standard',
        f'-EXIF:ExposureMode=Auto',
        f'-EXIF:SensingMethod=One-chip color area',
        f'-EXIF:Orientation=Horizontal (normal)',

        # ========== USERDATA (Classic QuickTime) ==========
        f'-UserData:Make={metadata["make"]}',
        f'-UserData:Model={metadata["model"]}',
        f'-UserData:Software={metadata["software"]}',
        f'-UserData:GPSCoordinates={gps_iso}',

        # ========== ITEMLIST ==========
        f'-ItemList:Make={metadata["make"]}',
        f'-ItemList:Model={metadata["model"]}',
        f'-ItemList:Software={metadata["software"]}',
        f'-ItemList:ContentID={metadata["content_id"]}',

        # ========== HANDLER NAMES (Apple-specific) ==========
        '-Handler:HandlerType=mdta',

        input_path
    ]

    print(f"[Exiftool] Running with {len(cmd)-2} arguments...")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"[Exiftool] Warning: {result.stderr}")
    else:
        print(f"[Exiftool] Success: {result.stdout.strip()}")

    # Copy to output
    shutil.copy(input_path, output_path)
    return True


def spoof_video_ffmpeg(input_path, output_path, metadata):
    """Use ffmpeg as backup for metadata injection"""

    gps_iso = metadata['gps']

    cmd = [
        FFMPEG, '-y', '-i', input_path,
        '-c', 'copy',
        '-movflags', 'use_metadata_tags+faststart',
        # Apple QuickTime metadata
        '-metadata', f'com.apple.quicktime.make={metadata["make"]}',
        '-metadata', f'com.apple.quicktime.model={metadata["model"]}',
        '-metadata', f'com.apple.quicktime.software={metadata["software"]}',
        '-metadata', f'com.apple.quicktime.creationdate={metadata["date_with_tz"]}',
        '-metadata', f'com.apple.quicktime.location.ISO6709={gps_iso}',
        '-metadata', f'com.apple.quicktime.content.identifier={metadata["content_id"]}',
        # Standard metadata
        '-metadata', f'make={metadata["make"]}',
        '-metadata', f'model={metadata["model"]}',
        '-metadata', f'creation_time={metadata["date"]}',
        # Handler names
        '-metadata:s:v', 'handler_name=Core Media Video',
        '-metadata:s:a', 'handler_name=Core Media Audio',
        output_path
    ]

    print(f"[FFmpeg] Processing...")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"[FFmpeg] Error: {result.stderr[:500]}")
        return False

    print(f"[FFmpeg] Success!")
    return True


def spoof_photo_exiftool(input_path, metadata):
    """Use exiftool for COMPLETE iPhone photo metadata injection"""

    lat = metadata['lat']
    lon = metadata['lon']
    alt = metadata['alt']

    # Build exiftool command with COMPLETE iPhone photo signature
    cmd = [
        EXIFTOOL,
        '-overwrite_original',

        # ========== EXIF (Primary for photos) ==========
        f'-EXIF:Make={metadata["make"]}',
        f'-EXIF:Model={metadata["model"]}',
        f'-EXIF:Software={metadata["software"]}',
        f'-EXIF:DateTimeOriginal={metadata["date"]}',
        f'-EXIF:CreateDate={metadata["date"]}',
        f'-EXIF:ModifyDate={metadata["date"]}',
        f'-EXIF:OffsetTime={metadata["tz_offset"]}',
        f'-EXIF:OffsetTimeOriginal={metadata["tz_offset"]}',
        f'-EXIF:OffsetTimeDigitized={metadata["tz_offset"]}',
        f'-EXIF:GPSLatitude={abs(lat)}',
        f'-EXIF:GPSLongitude={abs(lon)}',
        f'-EXIF:GPSAltitude={alt}',
        f'-EXIF:GPSLatitudeRef={format_gps_ref(lat, True)}',
        f'-EXIF:GPSLongitudeRef={format_gps_ref(lon, False)}',
        f'-EXIF:GPSAltitudeRef=Above Sea Level',
        f'-EXIF:LensMake={metadata["lens_make"]}',
        f'-EXIF:LensModel={metadata["lens_model"]}',
        f'-EXIF:FocalLength={metadata["focal_length"]}',
        f'-EXIF:FocalLengthIn35mmFormat={metadata["focal_length_35mm"]}',
        f'-EXIF:FNumber={metadata["aperture"]}',
        f'-EXIF:ApertureValue={metadata["aperture"]}',
        f'-EXIF:MaxApertureValue={metadata["max_aperture"]}',
        f'-EXIF:ExposureTime={metadata["exposure_time"]}',
        f'-EXIF:ISO={metadata["iso"]}',
        f'-EXIF:ExposureProgram=Program AE',
        f'-EXIF:MeteringMode=Multi-segment',
        f'-EXIF:Flash=Off, Did not fire',
        f'-EXIF:WhiteBalance=Auto',
        f'-EXIF:ColorSpace=Uncalibrated',
        f'-EXIF:SceneCaptureType=Standard',
        f'-EXIF:ExposureMode=Auto',
        f'-EXIF:SensingMethod=One-chip color area',
        f'-EXIF:SceneType=Directly photographed',
        f'-EXIF:Orientation=Horizontal (normal)',
        f'-EXIF:BrightnessValue={random.uniform(4.0, 8.0):.2f}',
        f'-EXIF:SubSecTimeOriginal={random.randint(0, 999):03d}',
        f'-EXIF:SubSecTimeDigitized={random.randint(0, 999):03d}',

        # ========== XMP (Cross-platform) ==========
        f'-XMP:Make={metadata["make"]}',
        f'-XMP:Model={metadata["model"]}',
        f'-XMP:Software={metadata["software"]}',
        f'-XMP:DateCreated={metadata["date"]}',
        f'-XMP:CreateDate={metadata["date"]}',
        f'-XMP:ModifyDate={metadata["date"]}',
        f'-XMP:GPSLatitude={abs(lat)}',
        f'-XMP:GPSLongitude={abs(lon)}',
        f'-XMP:GPSAltitude={alt}',
        f'-XMP:GPSLatitudeRef={format_gps_ref(lat, True)}',
        f'-XMP:GPSLongitudeRef={format_gps_ref(lon, False)}',
        f'-XMP:Lens={metadata["lens_model"]}',
        f'-XMP:LensModel={metadata["lens_model"]}',
        f'-XMP:LensMake={metadata["lens_make"]}',
        f'-XMP:FocalLength={metadata["focal_length"]}',
        f'-XMP:FocalLengthIn35mmFormat={metadata["focal_length_35mm"]}',
        f'-XMP:FNumber={metadata["aperture"]}',
        f'-XMP:ApertureValue={metadata["aperture"]}',
        f'-XMP:ExposureTime={metadata["exposure_time"]}',
        f'-XMP:ISO={metadata["iso"]}',
        f'-XMP:ColorSpace=sRGB',
        f'-XMP:CreatorTool={metadata["software"]}',

        # ========== IPTC ==========
        f'-IPTC:DateCreated={metadata["date"][:10].replace(":", "")}',
        f'-IPTC:TimeCreated={metadata["date"][11:].replace(":", "")}',

        # ========== GPS Direction and Speed ==========
        f'-EXIF:GPSImgDirection={random.randint(0, 359)}',
        '-EXIF:GPSImgDirectionRef=True North',
        '-EXIF:GPSSpeed=0',
        '-EXIF:GPSSpeedRef=K',
        f'-EXIF:GPSDestBearing={random.randint(0, 359)}',
        '-EXIF:GPSDestBearingRef=True North',
        '-EXIF:GPSHPositioningError=5',

        input_path
    ]

    print(f"[Exiftool Photo] Running with {len(cmd)-2} arguments...")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"[Exiftool Photo] Warning: {result.stderr}")
    else:
        print(f"[Exiftool Photo] Success: {result.stdout.strip()}")

    return True


def spoof_photo(input_path, city, device):
    """Main photo spoofing function"""

    dev = DEVICES.get(device, DEVICES["iPhone 16 Pro"])

    base_lat, base_lon, base_alt = CITIES.get(city, CITIES["New York"])
    lat = base_lat + (random.random() - 0.5) * 0.04
    lon = base_lon + (random.random() - 0.5) * 0.04
    alt = max(0, base_alt + random.randint(-10, 10))

    # Generate realistic date with timezone
    date = datetime.now() - timedelta(days=random.randint(0, 7))
    date = date.replace(hour=random.randint(8, 20), minute=random.randint(0, 59), second=random.randint(0, 59))
    date_str = date.strftime('%Y:%m:%d %H:%M:%S')
    tz_offset = get_timezone_offset()

    # Generate unique content identifier
    content_id = str(uuid.uuid4()).upper()

    # Realistic camera settings for photos
    iso_speed = random.choice([32, 50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800, 1000])
    shutter_speed = random.choice(['1/30', '1/60', '1/100', '1/125', '1/250', '1/500', '1/1000', '1/2000', '1/4000'])
    exposure_time = eval(shutter_speed)

    metadata = {
        'make': dev['make'],
        'model': dev['model'],
        'software': dev['software'],
        'date': date_str,
        'tz_offset': tz_offset,
        'lat': lat,
        'lon': lon,
        'alt': alt,
        'content_id': content_id,
        'lens_make': dev['lens_make'],
        'lens_model': dev['lens_model'],
        'focal_length': dev['focal_length'],
        'focal_length_35mm': dev['focal_length_35mm'],
        'aperture': dev['aperture'],
        'max_aperture': dev['max_aperture'],
        'iso': iso_speed,
        'shutter_speed': shutter_speed,
        'exposure_time': exposure_time,
    }

    print(f"\n[Photo Spoofer] ========================================")
    print(f"[Photo Spoofer] Make: {dev['make']}")
    print(f"[Photo Spoofer] Model: {dev['model']}")
    print(f"[Photo Spoofer] Software: {dev['software']}")
    print(f"[Photo Spoofer] Date: {date_str} {tz_offset}")
    print(f"[Photo Spoofer] Lat: {lat:.6f}, Lon: {lon:.6f}, Alt: {alt}m")
    print(f"[Photo Spoofer] Lens: {dev['lens_model']}")
    print(f"[Photo Spoofer] ISO: {iso_speed}, Shutter: {shutter_speed}")
    print(f"[Photo Spoofer] ========================================")

    # Try exiftool
    if os.path.exists(EXIFTOOL):
        print(f"[Photo Spoofer] Using exiftool...")
        success = spoof_photo_exiftool(input_path, metadata)
        if success:
            # Verify with exiftool
            print(f"\n[Verify Photo] Checking written metadata...")
            verify = subprocess.run(
                [EXIFTOOL, '-Make', '-Model', '-Software', '-GPSLatitude', '-GPSLongitude',
                 '-LensModel', '-FocalLength', '-FNumber', '-ISO', input_path],
                capture_output=True, text=True
            )
            print(verify.stdout)
            return True, metadata

    return False, "exiftool not available"


def get_timezone_offset():
    """Get current timezone offset in format +01:00"""
    now = datetime.now(timezone.utc).astimezone()
    offset = now.utcoffset()
    total_seconds = int(offset.total_seconds())
    hours, remainder = divmod(abs(total_seconds), 3600)
    minutes = remainder // 60
    sign = '+' if total_seconds >= 0 else '-'
    return f"{sign}{hours:02d}:{minutes:02d}"


def spoof_video(input_path, city, device):
    """Main spoofing function"""

    dev = DEVICES.get(device, DEVICES["iPhone 16 Pro"])

    base_lat, base_lon, base_alt = CITIES.get(city, CITIES["New York"])
    lat = base_lat + (random.random() - 0.5) * 0.04
    lon = base_lon + (random.random() - 0.5) * 0.04
    alt = max(0, base_alt + random.randint(-10, 10))

    # Generate realistic date with timezone
    date = datetime.now() - timedelta(days=random.randint(0, 7))
    date = date.replace(hour=random.randint(8, 20), minute=random.randint(0, 59), second=random.randint(0, 59))
    date_str = date.strftime('%Y:%m:%d %H:%M:%S')
    tz_offset = get_timezone_offset()
    date_with_tz = f"{date_str}{tz_offset}"

    gps_iso = format_gps_iso6709(lat, lon, alt)

    # Generate unique content identifier
    content_id = str(uuid.uuid4()).upper()

    # Realistic camera settings
    iso_speed = random.choice([32, 50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800])
    shutter_speed = random.choice(['1/30', '1/60', '1/120', '1/250', '1/500', '1/1000', '1/2000'])
    exposure_time = eval(shutter_speed)  # Convert to decimal

    metadata = {
        'make': dev['make'],
        'model': dev['model'],
        'software': dev['software'],
        'date': date_str,
        'date_with_tz': date_with_tz,
        'tz_offset': tz_offset,
        'gps': gps_iso,
        'lat': lat,
        'lon': lon,
        'alt': alt,
        'content_id': content_id,
        'lens_make': dev['lens_make'],
        'lens_model': dev['lens_model'],
        'focal_length': dev['focal_length'],
        'focal_length_35mm': dev['focal_length_35mm'],
        'aperture': dev['aperture'],
        'max_aperture': dev['max_aperture'],
        'iso': iso_speed,
        'shutter_speed': shutter_speed,
        'exposure_time': exposure_time,
    }

    print(f"\n[Spoofer] ========================================")
    print(f"[Spoofer] Make: {dev['make']}")
    print(f"[Spoofer] Model: {dev['model']}")
    print(f"[Spoofer] Software: {dev['software']}")
    print(f"[Spoofer] Date: {date_with_tz}")
    print(f"[Spoofer] GPS: {gps_iso}")
    print(f"[Spoofer] Lat: {lat:.6f}, Lon: {lon:.6f}, Alt: {alt}m")
    print(f"[Spoofer] Lens: {dev['lens_model']}")
    print(f"[Spoofer] Focal: {dev['focal_length']}mm (35mm eq: {dev['focal_length_35mm']}mm)")
    print(f"[Spoofer] Aperture: f/{dev['aperture']}")
    print(f"[Spoofer] ISO: {iso_speed}, Shutter: {shutter_speed}")
    print(f"[Spoofer] Content ID: {content_id}")
    print(f"[Spoofer] ========================================")

    output_path = input_path + ".spoofed.mov"

    # Try exiftool first (most reliable)
    if os.path.exists(EXIFTOOL):
        print(f"[Spoofer] Using exiftool...")
        success = spoof_video_exiftool(input_path, output_path, metadata)
        if success:
            shutil.move(output_path, input_path)

            # Verify with exiftool - show comprehensive metadata
            print(f"\n[Verify] Checking written metadata...")
            verify = subprocess.run(
                [EXIFTOOL, '-Make', '-Model', '-Software', '-GPSCoordinates',
                 '-LensModel', '-FocalLength', '-FNumber', '-ISO',
                 '-ContentIdentifier', '-CreationDate', input_path],
                capture_output=True, text=True
            )
            print(verify.stdout)

            return True, metadata

    # Fallback to ffmpeg
    if os.path.exists(FFMPEG):
        print(f"[Spoofer] Using ffmpeg...")
        success = spoof_video_ffmpeg(input_path, output_path, metadata)
        if success:
            shutil.move(output_path, input_path)
            return True, metadata

    return False, "No tools available"


class VideoSpoofHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/spoof-video':
            self.handle_spoof_video()
        elif self.path == '/spoof-photo':
            self.handle_spoof_photo()
        else:
            self.send_error(404)

    def handle_spoof_video(self):
        temp_path = None
        try:
            content_type = self.headers['Content-Type']
            if 'multipart/form-data' not in content_type:
                self.send_error(400, 'Expected multipart/form-data')
                return

            form = cgi.FieldStorage(
                fp=self.rfile, headers=self.headers,
                environ={'REQUEST_METHOD': 'POST', 'CONTENT_TYPE': content_type}
            )

            video_data = form['video'].file.read()
            city = form.getvalue('city', 'New York')
            device = form.getvalue('device', 'iPhone 16 Pro')

            print(f"\n{'='*60}")
            print(f"[Server] New request: {city}, {device}")
            print(f"[Server] File size: {len(video_data)} bytes")

            with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
                tmp.write(video_data)
                temp_path = tmp.name

            success, result = spoof_video(temp_path, city, device)

            if not success:
                self.send_error(500, str(result))
                return

            with open(temp_path, 'rb') as f:
                modified_data = f.read()

            self.send_response(200)
            self.send_header('Content-Type', 'video/mp4')
            self.send_header('Content-Length', len(modified_data))
            self.send_header('X-Metadata', json.dumps(result))
            self.end_headers()
            self.wfile.write(modified_data)

            print(f"[Server] Sent {len(modified_data)} bytes")

        except Exception as e:
            import traceback
            traceback.print_exc()
            self.send_error(500, str(e))
        finally:
            if temp_path and os.path.exists(temp_path):
                os.unlink(temp_path)

    def handle_spoof_photo(self):
        temp_path = None
        try:
            content_type = self.headers['Content-Type']
            if 'multipart/form-data' not in content_type:
                self.send_error(400, 'Expected multipart/form-data')
                return

            form = cgi.FieldStorage(
                fp=self.rfile, headers=self.headers,
                environ={'REQUEST_METHOD': 'POST', 'CONTENT_TYPE': content_type}
            )

            photo_data = form['photo'].file.read()
            city = form.getvalue('city', 'New York')
            device = form.getvalue('device', 'iPhone 16 Pro')

            print(f"\n{'='*60}")
            print(f"[Server] Photo spoof request: {city}, {device}")
            print(f"[Server] File size: {len(photo_data)} bytes")

            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                tmp.write(photo_data)
                temp_path = tmp.name

            success, result = spoof_photo(temp_path, city, device)

            if not success:
                self.send_error(500, str(result))
                return

            with open(temp_path, 'rb') as f:
                modified_data = f.read()

            self.send_response(200)
            self.send_header('Content-Type', 'image/jpeg')
            self.send_header('Content-Length', len(modified_data))
            self.send_header('X-Metadata', json.dumps(result))
            self.end_headers()
            self.wfile.write(modified_data)

            print(f"[Server] Sent {len(modified_data)} bytes")

        except Exception as e:
            import traceback
            traceback.print_exc()
            self.send_error(500, str(e))
        finally:
            if temp_path and os.path.exists(temp_path):
                os.unlink(temp_path)


def verify_tools():
    """Verify required tools are available"""
    print("="*60)
    print("MEDIA SPOOFER SERVER - ULTIMATE VERSION")
    print("Video + Photo with COMPLETE iPhone metadata")
    print("="*60)

    tools_ok = False

    if os.path.exists(EXIFTOOL):
        result = subprocess.run([EXIFTOOL, '-ver'], capture_output=True, text=True)
        print(f"✓ exiftool {result.stdout.strip()}")
        tools_ok = True
    else:
        print(f"✗ exiftool not found at {EXIFTOOL}")

    if os.path.exists(FFMPEG):
        result = subprocess.run([FFMPEG, '-version'], capture_output=True, text=True)
        version = result.stdout.split('\n')[0] if result.stdout else 'unknown'
        print(f"✓ {version}")
        tools_ok = True
    else:
        print(f"✗ ffmpeg not found at {FFMPEG}")

    if not tools_ok:
        print("\nERROR: No tools available!")
        print("Run: curl -L https://evermeet.cx/ffmpeg/getrelease/zip -o ~/bin/ffmpeg.zip && unzip ~/bin/ffmpeg.zip -d ~/bin")
        sys.exit(1)

    print("="*60)
    return True


if __name__ == '__main__':
    verify_tools()

    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8888
    print(f'\nServer running on http://localhost:{port}')
    print('Endpoints:')
    print('  POST /spoof-video  - Video metadata injection')
    print('  POST /spoof-photo  - Photo metadata injection')
    print("="*60)

    HTTPServer(('', port), VideoSpoofHandler).serve_forever()
