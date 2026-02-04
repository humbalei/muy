/**
 * Cloudflare Pages Function - Video Spoofer
 * POST /spoof-video
 */

// Import shared spoofer logic
import { generateMetadata, injectVideoMetadata } from './_shared/spoofer.js';

export async function onRequestPost(context) {
  try {
    const formData = await context.request.formData();
    const video = formData.get('video');
    const city = formData.get('city') || 'New York';
    const device = formData.get('device') || 'iPhone 16 Pro';

    if (!video) {
      return new Response(JSON.stringify({ error: 'No video provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const metadata = generateMetadata(city, device);
    const videoData = await video.arrayBuffer();
    const spoofedVideo = injectVideoMetadata(videoData, metadata);

    return new Response(spoofedVideo, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="IMG_${Date.now()}.mp4"`,
        'X-Metadata': JSON.stringify(metadata),
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    console.error('Video spoof error:', error);
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
