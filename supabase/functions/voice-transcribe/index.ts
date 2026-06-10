/**
 * voice-transcribe Edge Function
 *
 * Accepts base64-encoded audio from the client, calls OpenAI Whisper
 * server-side (key stored as a Supabase secret), and returns the transcript.
 *
 * The OpenAI key never reaches the client bundle.
 *
 * Request body: { audioBase64: string, mimeType?: string }
 * Response:     { transcript: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validate JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonError('Missing authorization header', 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return jsonError('Invalid or expired token', 401)
    }

    // 2. Parse request
    const { audioBase64, mimeType = 'audio/m4a' } = await req.json()
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return jsonError('Missing required field: audioBase64', 400)
    }

    // 3. Decode base64 → binary
    const binaryString = atob(audioBase64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const audioBlob = new Blob([bytes], { type: mimeType })

    // 4. Call Whisper API
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      return jsonError('AI service not configured', 503)
    }

    const extension = mimeType === 'audio/mpeg' ? 'mp3'
      : mimeType === 'audio/wav' ? 'wav'
      : mimeType === 'audio/webm' ? 'webm'
      : 'm4a'

    const formData = new FormData()
    formData.append('file', audioBlob, `recording.${extension}`)
    formData.append('model', 'whisper-1')
    formData.append('language', 'en')
    formData.append('response_format', 'text')

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}` },
      body: formData,
    })

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text()
      console.error('Whisper API error:', whisperResponse.status, errorText)
      return jsonError('Transcription service error', 502)
    }

    const transcript = await whisperResponse.text()

    return new Response(
      JSON.stringify({ transcript }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('voice-transcribe error:', error)
    return jsonError(error.message || 'Internal server error', 500)
  }
})

function jsonError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
