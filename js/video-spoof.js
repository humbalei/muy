// ============================================
// VIDEO SPOOFER - Server-side FFmpeg Processing
// Sends video to server for reliable metadata injection
// ============================================

const VideoSpoofer = {
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
    console.log('[VideoSpoofer] ========== START ==========');
    console.log('[VideoSpoofer] File:', file.name, file.size, 'bytes');
    console.log('[VideoSpoofer] City:', city, 'Device:', device);
    console.log('[VideoSpoofer] Sending to server for FFmpeg processing...');

    // Create form data
    const formData = new FormData();
    formData.append('video', file);
    formData.append('city', city || 'New York');
    formData.append('device', device || 'iPhone 16 Pro');

    try {
      // Send to server
      const response = await fetch('/spoof-video', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Server error: ${error}`);
      }

      // Get metadata from header
      const metadataHeader = response.headers.get('X-Metadata');
      const metadata = metadataHeader ? JSON.parse(metadataHeader) : {};

      // Get video blob
      const videoBlob = await response.blob();
      const blobUrl = URL.createObjectURL(videoBlob);

      console.log('[VideoSpoofer] ========== DONE ==========');
      console.log('[VideoSpoofer] Metadata:', metadata);
      console.log('[VideoSpoofer] Output size:', videoBlob.size, 'bytes');

      return {
        type: 'video',
        blobUrl: blobUrl,
        filename: `IMG_${Date.now()}.mp4`,
        metadata: metadata
      };

    } catch (error) {
      console.error('[VideoSpoofer] Error:', error);

      // Fallback: return original file
      console.log('[VideoSpoofer] Returning original file as fallback');
      return {
        type: 'video',
        blobUrl: URL.createObjectURL(file),
        filename: `IMG_${Date.now()}.mp4`,
        error: error.message
      };
    }
  }
};

window.VideoSpoofer = VideoSpoofer;
