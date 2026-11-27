/**
 * AniSaturn scraping, client side: the episode page embeds the real stream in
 * `<iframe id="watch-iframe" src="https://play.saturncdn.net/embed/…">`.
 * The app fetches the page, extracts that URL and shows only the player.
 */
const ANISATURN_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

const EMBED_HOST = /(^|\.)saturncdn\.net$/i;
const ANISATURN_PAGE = /^https:\/\/(?:www\.)?animesaturn\.net\//i;

function decodeEmbedValue(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/\\u0026/g, '&')
    .replace(/\\\//g, '/');
}

/** Extract and validate the player URL from the episode HTML. */
export function extractEmbedUrl(html: string): string | null {
  const patterns = [
    /<iframe[^>]*\bid=["']watch-iframe["'][^>]*\bsrc=["']([^"']+)["']/i,
    /<iframe[^>]*\bsrc=["']([^"']*play\.saturncdn\.net\/embed\/[^"']+)["']/i,
    /"initialVideoUrl"\s*:\s*"([^"]+)"/i,
    /&quot;initialVideoUrl&quot;\s*:\s*&quot;([^&]+)&quot;/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (!match?.[1]) {continue;}

    const decoded = decodeEmbedValue(match[1]);
    const normalized = decoded.startsWith('//') ? `https:${decoded}` : decoded;
    const host = /^https:\/\/([^/]+)\/embed\//i.exec(normalized);

    if (host && EMBED_HOST.test(host[1])) {
      return normalized;
    }
  }

  return null;
}

export async function resolveEpisodeEmbed(pageUrl: string): Promise<string> {
  if (!ANISATURN_PAGE.test(pageUrl)) {
    throw new Error('Link episodio non valido.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(pageUrl, {
      headers: {Accept: 'text/html', 'User-Agent': ANISATURN_USER_AGENT},
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`AniSaturn ha risposto ${response.status}.`);
    }

    const embedUrl = extractEmbedUrl(await response.text());
    if (!embedUrl) {
      throw new Error("Player non trovato nella pagina dell'episodio.");
    }

    return embedUrl;
  } catch (error) {
    if ((error as Error | null)?.name === 'AbortError') {
      throw new Error('AniSaturn non ha risposto in tempo.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
