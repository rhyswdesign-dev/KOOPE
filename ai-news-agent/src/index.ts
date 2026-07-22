import { fetchAINews } from './rss';
import { summarizeWithClaude } from './claude';
import { sendDigestEmail } from './email';

export interface Env {
  EMAIL: SendEmail;
  ANTHROPIC_API_KEY: string;
  RECIPIENT_EMAIL: string;
  FROM_EMAIL: string;
  FROM_NAME: string;
}

async function runDigest(env: Env): Promise<void> {
  console.log('[ai-news-agent] Fetching feeds...');
  const articles = await fetchAINews();
  console.log(`[ai-news-agent] Got ${articles.length} articles`);

  if (articles.length === 0) {
    console.warn('[ai-news-agent] No articles fetched — skipping email');
    return;
  }

  const digest = await summarizeWithClaude(articles, env.ANTHROPIC_API_KEY);
  console.log(`[ai-news-agent] Digest ready: "${digest.subject}"`);

  await sendDigestEmail(env, digest);
  console.log('[ai-news-agent] Email sent to', env.RECIPIENT_EMAIL);
}

export default {
  // Runs on cron schedule (every Monday 8am UTC)
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runDigest(env));
  },

  // HTTP handler: GET /trigger to fire manually (useful for testing)
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/trigger') {
      ctx.waitUntil(runDigest(env));
      return new Response('Digest triggered — check your inbox in ~30s', { status: 200 });
    }

    return new Response(
      'AI News Agent\n\nGET /trigger — send digest now (for testing)\nCron: every Monday 8:00 UTC',
      { status: 200, headers: { 'Content-Type': 'text/plain' } }
    );
  },
};
