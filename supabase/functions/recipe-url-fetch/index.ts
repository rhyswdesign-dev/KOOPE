/**
 * recipe-url-fetch Edge Function
 *
 * Phase 0.10 fix: RecipeURLImportScreen used to hand the pasted URL straight
 * to AIRecipeFormatScreen as `recipeUrl`, a param that screen never reads —
 * so pasting a URL silently landed on a blank manual-entry form. This
 * function does the actual work: fetch the page server-side (avoids client
 * CORS and keeps any future scraping-service key off the client), extract
 * a recipe via schema.org `Recipe` JSON-LD first, falling back to a plain-
 * text scrape of the page body.
 *
 * Server-side fetch also means the target site never sees the user's IP
 * directly, and lets us keep a real User-Agent + timeout without shipping
 * either into the app bundle.
 *
 * Request body:
 *   { url: string }
 *
 * Response: { extractedText: string, title: string | null, imageUrl: string | null }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FETCH_TIMEOUT_MS = 10_000
const MAX_HTML_BYTES = 3_000_000 // 3MB — plenty for a recipe page, guards against huge/streaming responses
const MAX_EXTRACTED_TEXT_CHARS = 20_000

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validate JWT — any signed-in user can import a recipe URL, no tier gate
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return jsonError('Unauthorized', 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return jsonError('Invalid or expired token', 401)
    }

    // 2. Parse + validate request
    const body = await req.json().catch(() => null)
    const rawUrl = body?.url
    if (!rawUrl || typeof rawUrl !== 'string') {
      return jsonError('Missing required field: url', 400)
    }

    let target: URL
    try {
      target = new URL(rawUrl)
    } catch {
      return jsonError('Invalid URL', 400)
    }

    const blockReason = rejectUnsafeUrl(target)
    if (blockReason) {
      return jsonError(blockReason, 400)
    }

    // 3. Fetch the page server-side with a timeout and a real UA (many
    // recipe sites block requests with no/blank User-Agent).
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    let html: string
    try {
      const response = await fetch(target.toString(), {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KoopeRecipeBot/1.0; +https://koope.app)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      })

      if (!response.ok) {
        return jsonError(`Could not fetch that page (HTTP ${response.status})`, 502)
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('text/html') && !contentType.includes('xml') && contentType !== '') {
        return jsonError('That link does not point to a web page KOOPE can read', 415)
      }

      // Cap how much we read to avoid a huge/streaming response tying up the function
      const buf = await response.arrayBuffer()
      const bytes = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf
      html = new TextDecoder('utf-8').decode(bytes)
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        return jsonError('That page took too long to respond', 504)
      }
      console.error('recipe-url-fetch: fetch failed', err)
      return jsonError('Could not reach that URL', 502)
    } finally {
      clearTimeout(timeout)
    }

    // 4. Extract — schema.org Recipe JSON-LD first, plain-text fallback
    const jsonLdRecipe = extractJsonLdRecipe(html)
    const ogImage = extractMetaContent(html, 'og:image')
    const title = jsonLdRecipe?.title ?? extractTitle(html)
    const imageUrl = jsonLdRecipe?.imageUrl ?? ogImage ?? null
    const extractedText = (jsonLdRecipe?.text ?? extractPlainText(html)).slice(0, MAX_EXTRACTED_TEXT_CHARS)

    if (!extractedText.trim()) {
      return jsonError('Could not find a recipe on that page', 422)
    }

    return new Response(
      JSON.stringify({ extractedText, title, imageUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('recipe-url-fetch error:', error)
    return jsonError((error as Error)?.message || 'Internal server error', 500)
  }
})

function jsonError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/**
 * Basic SSRF guardrails: only plain http(s) to a public-looking hostname.
 * Not exhaustive DNS-rebinding protection, but blocks the obvious
 * loopback/link-local/metadata-endpoint targets a pasted URL could contain.
 */
function rejectUnsafeUrl(url: URL): string | null {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return 'Only http/https URLs are supported'
  }

  const host = url.hostname.toLowerCase()
  const blockedHosts = ['localhost', '0.0.0.0', '::1', 'metadata.google.internal']
  if (blockedHosts.includes(host)) {
    return 'That URL is not allowed'
  }

  // Literal IPv4 in a private/loopback/link-local range
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4Match) {
    const [a, b] = [parseInt(ipv4Match[1], 10), parseInt(ipv4Match[2], 10)]
    const isPrivate =
      a === 127 || // loopback
      a === 10 || // 10.0.0.0/8
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
      (a === 192 && b === 168) || // 192.168.0.0/16
      (a === 169 && b === 254) // link-local / cloud metadata
    if (isPrivate) return 'That URL is not allowed'
  }

  return null
}

interface JsonLdRecipe {
  title: string | null
  text: string
  imageUrl: string | null
}

/**
 * Find a schema.org Recipe object inside any <script type="application/ld+json">
 * block (JSON-LD is sometimes a single object, sometimes an array, sometimes
 * wrapped in an @graph — handle all three shapes).
 */
function extractJsonLdRecipe(html: string): JsonLdRecipe | null {
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null

  while ((match = scriptRegex.exec(html)) !== null) {
    let parsed: any
    try {
      parsed = JSON.parse(match[1].trim())
    } catch {
      continue
    }

    const candidates: any[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.['@graph'])
        ? parsed['@graph']
        : [parsed]

    for (const node of candidates) {
      const types = Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']]
      if (!types.includes('Recipe')) continue

      const title: string | null = typeof node.name === 'string' ? node.name : null

      const ingredients: string[] = Array.isArray(node.recipeIngredient)
        ? node.recipeIngredient.filter((i: unknown) => typeof i === 'string')
        : []

      const instructions = flattenInstructions(node.recipeInstructions)

      const textParts: string[] = []
      if (node.description && typeof node.description === 'string') textParts.push(node.description)
      if (ingredients.length) textParts.push('Ingredients:\n' + ingredients.map((i) => `- ${i}`).join('\n'))
      if (instructions.length) textParts.push('Instructions:\n' + instructions.map((s, i) => `${i + 1}. ${s}`).join('\n'))

      const text = textParts.join('\n\n').trim()
      if (!text) continue

      let imageUrl: string | null = null
      if (typeof node.image === 'string') imageUrl = node.image
      else if (Array.isArray(node.image) && typeof node.image[0] === 'string') imageUrl = node.image[0]
      else if (typeof node.image?.url === 'string') imageUrl = node.image.url

      return { title, text, imageUrl }
    }
  }

  return null
}

function flattenInstructions(raw: any): string[] {
  if (!raw) return []
  if (typeof raw === 'string') return [raw]
  if (!Array.isArray(raw)) return []

  const out: string[] = []
  for (const step of raw) {
    if (typeof step === 'string') {
      out.push(step)
    } else if (step?.['@type'] === 'HowToSection' && Array.isArray(step.itemListElement)) {
      out.push(...flattenInstructions(step.itemListElement))
    } else if (typeof step?.text === 'string') {
      out.push(step.text)
    }
  }
  return out
}

function extractMetaContent(html: string, property: string): string | null {
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i'
  )
  const match = html.match(regex)
  return match ? decodeHtmlEntities(match[1]) : null
}

function extractTitle(html: string): string | null {
  const ogTitle = extractMetaContent(html, 'og:title')
  if (ogTitle) return ogTitle
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? decodeHtmlEntities(match[1].trim()) : null
}

/**
 * Plain-text fallback when no Recipe JSON-LD is present: strip script/style,
 * strip tags, collapse whitespace. Not structured, but the AI recipe
 * formatter downstream (AIRecipeFormatScreen -> recipe-format function)
 * already handles unstructured recipe text as its "text mode" input.
 */
function extractPlainText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')

  const bodyMatch = withoutScripts.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const body = bodyMatch ? bodyMatch[1] : withoutScripts

  const text = body
    .replace(/<[^>]+>/g, '\n')
    .split('\n')
    .map((line) => decodeHtmlEntities(line).trim())
    .filter(Boolean)
    .join('\n')

  return text
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
