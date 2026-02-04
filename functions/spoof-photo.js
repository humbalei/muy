/**
 * Cloudflare Pages Function - Photo Spoofer
 * POST /spoof-photo
 */

import { generateMetadata, injectPhotoMetadata } from './_shared/spoofer.js';

export async function onRequestPost(context) {
  try {
    const formData = await context.request.formData();
    const photo = formData.get('photo');
    const city = formData.get('city') || 'New York';
    const device = formData.get('device') || 'iPhone 16 Pro';

    if (!photo) {
      return new Response(JSON.stringify({ error: 'No photo provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const metadata = generateMetadata(city, device);
    const photoData = await photo.arrayBuffer();
    const spoofedPhoto = injectPhotoMetadata(photoData, metadata);

    return new Response(spoofedPhoto, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="IMG_${Date.now()}.jpg"`,
        'X-Metadata': JSON.stringify(metadata),
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    console.error('Photo spoof error:', error);
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
