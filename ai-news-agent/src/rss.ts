export interface Article {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  source: string;
}

// Curated feeds most relevant to building AI-powered consumer apps
const FEEDS = [
  { url: 'https://www.anthropic.com/rss.xml', source: 'Anthropic' },
  { url: 'https://openai.com/blog/rss.xml', source: 'OpenAI Blog' },
  { url: 'https://developers.cloudflare.com/changelog/rss.xml', source: 'Cloudflare' },
  { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', source: 'TechCrunch AI' },
  { url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', source: 'The Verge AI' },
  { url: 'https://venturebeat.com/category/ai/feed/', source: 'VentureBeat AI' },
  { url: 'https://huggingface.co/blog/feed.xml', source: 'Hugging Face' },
  { url: 'https://simonwillison.net/atom/everything/', source: 'Simon Willison' },
  { url: 'https://newsletter.pragmaticengineer.com/feed', source: 'Pragmatic Engineer' },
];

function isWithinLastWeek(dateStr: string): boolean {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return true; // include if we can't parse the date
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return date >= weekAgo;
}

function extractCdata(xml: string, tag: string): string {
  const cdata = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'));
  if (cdata?.[1]) return cdata[1].trim();
  const plain = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return (plain?.[1] ?? '').replace(/<[^>]+>/g, '').trim().substring(0, 600);
}

function extractLink(item: string): string {
  // Atom: <link href="..."/>
  const atomHref = item.match(/<link[^>]+href="([^"]+)"/);
  if (atomHref?.[1]) return atomHref[1];
  // RSS: <link>https://...</link>
  const rssLink = item.match(/<link>([^<]+)<\/link>/);
  return rssLink?.[1]?.trim() ?? '';
}

async function fetchFeed(feedUrl: string, source: string): Promise<Article[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'AI-News-Digest/1.0' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const articles: Article[] = [];

    // Matches both RSS <item> and Atom <entry>
    const itemRx = /<item[^>]*>([\s\S]*?)<\/item>|<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    let m: RegExpExecArray | null;

    while ((m = itemRx.exec(xml)) !== null) {
      const item = m[1] ?? m[2] ?? '';
      const title = extractCdata(item, 'title');
      const description =
        extractCdata(item, 'description') ||
        extractCdata(item, 'summary') ||
        extractCdata(item, 'content');
      const pubDate =
        extractCdata(item, 'pubDate') ||
        extractCdata(item, 'published') ||
        extractCdata(item, 'updated');
      const link = extractLink(item);

      if (title && isWithinLastWeek(pubDate)) {
        articles.push({ title, description, link, pubDate, source });
      }
    }

    return articles.slice(0, 12);
  } catch (e) {
    console.error(`Feed fetch failed: ${feedUrl}`, e);
    return [];
  }
}

export async function fetchAINews(): Promise<Article[]> {
  const results = await Promise.allSettled(FEEDS.map(f => fetchFeed(f.url, f.source)));

  const articles = results
    .filter((r): r is PromiseFulfilledResult<Article[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // Newest first
  return articles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
}
