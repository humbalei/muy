// ============================================
// PHOTO SPOOFER - Server-side Version
// Uses exiftool for 100% reliable EXIF metadata
// ============================================

const PhotoSpoofer = {
  devices: [
    "iPhone 16 Pro",
    "iPhone 16 Pro Max",
    "iPhone 17 Pro",
    "iPhone 17 Pro Max"
  ],

  cities: [
    "New York", "Los Angeles", "Miami", "Chicago", "London",
    "Prague", "Paris", "Berlin", "Tokyo", "Sydney",
    "Dubai", "Toronto", "Amsterdam", "Barcelona", "Rome",
    "Vienna", "Singapore", "Hong Kong", "Seoul", "Mumbai"
  ],

  async spoof(file, city, device) {
    console.log('[PhotoSpoofer] ========================================');
    console.log('[PhotoSpoofer] File:', file.name, '(' + (file.size / 1024 / 1024).toFixed(2) + ' MB)');
    console.log('[PhotoSpoofer] City:', city);
    console.log('[PhotoSpoofer] Device:', device);
    console.log('[PhotoSpoofer] Sending to server (exiftool)...');

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('city', city || 'New York');
    formData.append('device', device || 'iPhone 16 Pro');

    try {
      const startTime = Date.now();

      const response = await fetch('/spoof-photo', {
        method: 'POST',
        body: formData
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Server error (${response.status}): ${error}`);
      }

      // Get metadata from response header
      const metadataHeader = response.headers.get('X-Metadata');
      const metadata = metadataHeader ? JSON.parse(metadataHeader) : {};

      // Get the spoofed photo
      const photoBlob = await response.blob();
      const blobUrl = URL.createObjectURL(photoBlob);

      console.log('[PhotoSpoofer] ========================================');
      console.log('[PhotoSpoofer] SUCCESS in', elapsed, 'seconds');
      console.log('[PhotoSpoofer] Make:', metadata.make);
      console.log('[PhotoSpoofer] Model:', metadata.model);
      console.log('[PhotoSpoofer] Lat:', metadata.lat?.toFixed(6));
      console.log('[PhotoSpoofer] Lon:', metadata.lon?.toFixed(6));
      console.log('[PhotoSpoofer] Output:', (photoBlob.size / 1024 / 1024).toFixed(2), 'MB');
      console.log('[PhotoSpoofer] ========================================');

      return {
        type: 'image',
        blobUrl: blobUrl,
        filename: `IMG_${Date.now()}.jpg`,
        metadata: metadata
      };

    } catch (error) {
      console.error('[PhotoSpoofer] ERROR:', error.message);
      console.log('[PhotoSpoofer] Falling back to browser-side...');

      // Return null to signal fallback needed
      return null;
    }
  }
};

window.PhotoSpoofer = PhotoSpoofer;
