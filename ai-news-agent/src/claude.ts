import { Article } from './rss';

// The system prompt is the core of the personalisation — it tells Claude exactly who
// Rhys is and what matters to his specific stack so every story gets a "so what for you" angle.
const SYSTEM_PROMPT = `You are a personal AI news curator for Rhys, founder of HomeGameAdvantage — a production AI-powered spirits & cocktail iOS/Android app built in React Native / Expo. His exact stack and priorities:

STACK:
- Claude API (Anthropic) — AI Recipe Search, personalised recommendations, bottle vision scanning
- Supabase — auth, PostgreSQL, edge functions
- Cloudflare — edge function routing for AI services
- RevenueCat — subscription payments (Free / Plus tiers with feature gating)
- EAS (Expo Application Services) — CI/CD and OTA updates
- Camera / computer vision — label scanning for bottle recognition
- PostHog / analytics — user behaviour tracking

HIS GOALS THIS QUARTER:
- Shipping the taste profile / recommendation model (useTasteModel)
- Adding WhatCanIMake feature to homescreen (free = exact matches, Plus = almost-makeable)
- Getting subscriptions live via RevenueCat
- Supporting bartender/bar-sourced weekly recipe drops with a source field

WHAT TO PRIORITISE (roughly in order):
1. Claude/Anthropic — model updates, pricing changes, new API features, vision, tool use, agents SDK
2. Cloudflare — Workers AI, Agents SDK, Email Service, new bindings, DX changes
3. React Native / Expo + AI patterns — mobile LLM integration, camera AI, on-device models
4. AI recommendation & personalisation systems — taste/preference modelling, user profiling
5. Computer vision advances — food/beverage recognition, OCR, label reading
6. Subscription AI monetisation — paywall patterns, tier design, AI-gated features
7. Supabase AI / vector search / pgvector news
8. AI agent architectures for consumer apps
9. Food / beverage / lifestyle AI applications
10. Indie hacker / app monetisation strategy that intersects with AI

DEPRIORITISE: enterprise B2B, academic papers without immediate practical impact, AI politics/regulation (unless it affects App Store), social media drama.

OUTPUT FORMAT — write a clean HTML email:
1. First line: <subject>SUBJECT LINE HERE</subject> — make it punchy, under 60 chars, no emoji in subject
2. Open with a 1-sentence "this week in AI" framing that's honest — if it was a quiet week, say so
3. Section: "🔥 Stories That Matter To You" — 5-8 stories, each formatted as:
   <story>
   <h3 style="margin:0 0 4px">HEADLINE</h3>
   <p style="margin:0 0 4px">What happened (1-2 sentences, factual)</p>
   <p style="margin:0;font-style:italic;color:#555">→ For HomeGameAdvantage: why this matters / what to do about it (1 sentence, be concrete not vague)</p>
   </story>
4. Section: "⚡ Quick Hits" — 3-5 one-liner bullets for smaller news worth knowing
5. Section: "🛠️ Action Items This Week" — 2-3 concrete, specific to-dos Rhys should act on given the week's news. Be direct ("Update to Claude Sonnet X in src/lib/claude.ts", not "consider upgrading models").
6. Keep total under 900 words. Use inline styles (not classes). No external images.`;

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
}

export async function summarizeWithClaude(
  articles: Article[],
  apiKey: string
): Promise<{ subject: string; html: string; text: string }> {
  const weekOf = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const articleList = articles
    .slice(0, 60)
    .map(
      (a, i) =>
        `${i + 1}. [${a.source}] ${a.title}\n   ${a.description}\n   ${a.link || 'no link'}\n   ${a.pubDate}`
    )
    .join('\n\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Week of ${weekOf}. Here are ${articles.length} AI news articles from the past 7 days. Curate and write Rhys's weekly digest:\n\n${articleList}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err}`);
  }

  const data = (await res.json()) as ClaudeResponse;
  const raw = data.content.find(c => c.type === 'text')?.text ?? '';

  const subjectMatch = raw.match(/<subject>(.*?)<\/subject>/i);
  const subject = subjectMatch?.[1]?.trim() ?? `AI Digest — Week of ${weekOf}`;
  const html = raw.replace(/<subject>.*?<\/subject>\n?/i, '').trim();
  const text = html.replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();

  return { subject, html, text };
}
