/**
 * Cloudflare Pages Function - Video Spoofer Proxy
 * POST /spoof-video
 *
 * Proxies requests to Render.com service that runs ExifTool (works on iPhone!)
 */

export async function onRequestPost(context) {
  // Render.com URL - set via environment variable
  const EXIFTOOL_URL = context.env.EXIFTOOL_SPOOFER_URL ||
    'https://mori-spoofer.onrender.com/spoof-video';

  try {
    const formData = await context.request.formData();

    if (!formData.get('video')) {
      return new Response(JSON.stringify({ error: 'No video provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('[Cloudflare Proxy] Forwarding to Render ExifTool service...');

    // Forward to Render.com ExifTool service
    const response = await fetch(EXIFTOOL_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ExifTool service error: ${response.status} - ${error}`);
    }

    // Get video blob
    const videoBlob = await response.blob();

    console.log('[Cloudflare Proxy] Video spoofed successfully');

    return new Response(videoBlob, {
      headers: {
        'Content-Type': 'video/quicktime',
        'Content-Disposition': `attachment; filename="IMG_${Date.now()}.mov"`,
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    console.error('[Cloudflare Proxy] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    }
  });
}
