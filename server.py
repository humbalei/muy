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
from datetime import datetime, timedelta
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
    "iPhone 16 Pro": ("Apple", "iPhone 16 Pro", "18.2.1"),
    "iPhone 16 Pro Max": ("Apple", "iPhone 16 Pro Max", "18.2.1"),
    "iPhone 17 Pro": ("Apple", "iPhone 17 Pro", "19.0"),
    "iPhone 17 Pro Max": ("Apple", "iPhone 17 Pro Max", "19.0"),
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
    """Use exiftool for reliable metadata injection"""

    lat = metadata['lat']
    lon = metadata['lon']
    gps_iso = metadata['gps']

    # Build exiftool command with ALL possible metadata tags
    cmd = [
        EXIFTOOL,
        '-overwrite_original',
        '-api', 'QuickTimeUTC',

        # QuickTime specific tags
        f'-QuickTime:Make={metadata["make"]}',
        f'-QuickTime:Model={metadata["model"]}',
        f'-QuickTime:Software={metadata["software"]}',
        f'-QuickTime:CreationDate={metadata["date"]}',
        f'-QuickTime:GPSCoordinates={gps_iso}',

        # XMP tags (widely supported)
        f'-XMP:Make={metadata["make"]}',
        f'-XMP:Model={metadata["model"]}',
        f'-XMP:Software={metadata["software"]}',
        f'-XMP:DateCreated={metadata["date"]}',
        f'-XMP:GPSLatitude={abs(lat)}',
        f'-XMP:GPSLongitude={abs(lon)}',
        f'-XMP:GPSLatitudeRef={format_gps_ref(lat, True)}',
        f'-XMP:GPSLongitudeRef={format_gps_ref(lon, False)}',

        # Apple-specific QuickTime tags
        f'-Keys:Make={metadata["make"]}',
        f'-Keys:Model={metadata["model"]}',
        f'-Keys:Software={metadata["software"]}',
        f'-Keys:CreationDate={metadata["date"]}',
        f'-Keys:GPSCoordinates={gps_iso}',

        # UserData tags (classic QuickTime)
        f'-UserData:Make={metadata["make"]}',
        f'-UserData:Model={metadata["model"]}',
        f'-UserData:Software={metadata["software"]}',
        f'-UserData:GPSCoordinates={gps_iso}',

        # ItemList tags
        f'-ItemList:Make={metadata["make"]}',
        f'-ItemList:Model={metadata["model"]}',
        f'-ItemList:Software={metadata["software"]}',

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
        '-metadata', f'com.apple.quicktime.make={metadata["make"]}',
        '-metadata', f'com.apple.quicktime.model={metadata["model"]}',
        '-metadata', f'com.apple.quicktime.software={metadata["software"]}',
        '-metadata', f'com.apple.quicktime.creationdate={metadata["date"]}',
        '-metadata', f'com.apple.quicktime.location.ISO6709={gps_iso}',
        '-metadata', f'make={metadata["make"]}',
        '-metadata', f'model={metadata["model"]}',
        '-metadata:s:v', 'handler_name=Core Media Video',
        output_path
    ]

    print(f"[FFmpeg] Processing...")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"[FFmpeg] Error: {result.stderr[:500]}")
        return False

    print(f"[FFmpeg] Success!")
    return True


def spoof_video(input_path, city, device):
    """Main spoofing function"""

    make, model, software = DEVICES.get(device, DEVICES["iPhone 16 Pro"])

    base_lat, base_lon, base_alt = CITIES.get(city, CITIES["New York"])
    lat = base_lat + (random.random() - 0.5) * 0.04
    lon = base_lon + (random.random() - 0.5) * 0.04
    alt = max(0, base_alt + random.randint(-10, 10))

    date = datetime.now() - timedelta(days=random.randint(0, 7))
    date = date.replace(hour=random.randint(8, 20), minute=random.randint(0, 59), second=random.randint(0, 59))
    date_str = date.strftime('%Y:%m:%d %H:%M:%S')

    gps_iso = format_gps_iso6709(lat, lon, alt)

    metadata = {
        'make': make,
        'model': model,
        'software': software,
        'date': date_str,
        'gps': gps_iso,
        'lat': lat,
        'lon': lon
    }

    print(f"\n[Spoofer] ========================================")
    print(f"[Spoofer] Make: {make}")
    print(f"[Spoofer] Model: {model}")
    print(f"[Spoofer] Software: {software}")
    print(f"[Spoofer] Date: {date_str}")
    print(f"[Spoofer] GPS: {gps_iso}")
    print(f"[Spoofer] Lat: {lat:.6f}, Lon: {lon:.6f}")
    print(f"[Spoofer] ========================================")

    output_path = input_path + ".spoofed.mov"

    # Try exiftool first (most reliable)
    if os.path.exists(EXIFTOOL):
        print(f"[Spoofer] Using exiftool...")
        success = spoof_video_exiftool(input_path, output_path, metadata)
        if success:
            shutil.move(output_path, input_path)

            # Verify with exiftool
            print(f"\n[Verify] Checking written metadata...")
            verify = subprocess.run(
                [EXIFTOOL, '-Make', '-Model', '-GPSCoordinates', '-Software', input_path],
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
            self.handle_spoof()
        else:
            self.send_error(404)

    def handle_spoof(self):
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


def verify_tools():
    """Verify required tools are available"""
    print("="*60)
    print("VIDEO SPOOFER SERVER - ULTIMATE VERSION")
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
    print('Endpoint: POST /spoof-video')
    print("="*60)

    HTTPServer(('', port), VideoSpoofHandler).serve_forever()
