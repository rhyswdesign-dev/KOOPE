/**
 * Vision Analyze Edge Function
 * Proxies Google Cloud Vision API calls so the API key stays server-side.
 * Accepts a base64-encoded image, returns labels + OCR text.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VISION_API_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request
    const { imageBase64 } = await req.json()
    if (!imageBase64) {
      return jsonError('Missing imageBase64', 400)
    }

    // Call Google Vision
    const visionKey = Deno.env.get('GOOGLE_VISION_API_KEY')
    if (!visionKey) {
      return jsonError('Vision API not configured', 503)
    }

    const visionResponse = await fetch(`${VISION_API_ENDPOINT}?key=${visionKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [
            { type: 'TEXT_DETECTION', maxResults: 10 },
            { type: 'LABEL_DETECTION', maxResults: 10 },
          ],
        }],
      }),
    })

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text()
      console.error('Vision API HTTP error:', visionResponse.status, errorText)
      return jsonError(`Vision API error ${visionResponse.status}: ${errorText}`, 502)
    }

    const visionData = await visionResponse.json()
    const response = visionData.responses?.[0]

    if (response?.error) {
      console.error('Vision API returned error:', response.error)
      return jsonError(`Vision API error: ${response.error.message}`, 502)
    }

    const textAnnotations: Array<{ description: string }> = response?.textAnnotations || []
    const labelAnnotations: Array<{ description: string; score: number }> = response?.labelAnnotations || []

    const labels = labelAnnotations.map((l) => l.description.toLowerCase())
    const text = textAnnotations.map((t) => t.description)
    const confidence = labelAnnotations.length > 0
      ? labelAnnotations.reduce((sum, l) => sum + l.score, 0) / labelAnnotations.length
      : 0

    return new Response(
      JSON.stringify({ labels, text, confidence }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('vision-analyze error:', error)
    return jsonError((error as Error).message || 'Internal server error', 500)
  }
})

function jsonError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
