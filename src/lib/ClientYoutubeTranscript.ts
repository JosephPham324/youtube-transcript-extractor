const RE_YOUTUBE = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)';
const RE_XML_TRANSCRIPT = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;


export interface ClientTranscriptSegment {
  text: string;
  start: number;     // absolute offset in seconds
  duration: number;  // display slice length in seconds
}

export class ClientYoutubeTranscript {
  public static retrieveVideoId(videoId: string): string {
    if (videoId.length === 11) {
      return videoId;
    }
    const matchId = videoId.match(RE_YOUTUBE);
    if (matchId && matchId.length) {
      return matchId[1];
    }
    throw new Error('Impossible to retrieve Youtube video ID.');
  }

  /**
   * Fetches the transcript directly from the client browser.
   * Note: We bypass the InnerTube API (which uses POST JSON and triggers preflight OPTIONS checks)
   * and go straight to the WebPage HTML scraper (which uses simple GET requests with zero preflights).
   * This makes CORS extensions work perfectly out of the box with no complex setup!
   */
  public static async fetchTranscript(videoId: string, lang: string = 'en'): Promise<ClientTranscriptSegment[]> {
    const identifier = this.retrieveVideoId(videoId);
    return this.fetchViaWebPage(identifier, lang);
  }

  /**
   * Fetches transcript by scraping YouTube's watch page HTML.
   */
  private static async fetchViaWebPage(identifier: string, lang: string): Promise<ClientTranscriptSegment[]> {
    const response = await fetch(`https://www.youtube.com/watch?v=${identifier}`, {
      headers: {
        'Accept-Language': lang,
        'User-Agent': USER_AGENT,
      },
    });
    const body = await response.text();
    if (body.includes('class="g-recaptcha"')) {
      throw new Error('TOO_MANY_REQUESTS');
    }
    if (!body.includes('"playabilityStatus":')) {
      throw new Error('VIDEO_UNAVAILABLE');
    }
    const playerResponse = this.parseInlineJson(body, 'ytInitialPlayerResponse');
    const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(captionTracks) || captionTracks.length === 0) {
      throw new Error('TRANSCRIPT_DISABLED');
    }
    return this.fetchTranscriptFromTracks(captionTracks, lang);
  }

  /**
   * Extracts a JSON object assigned to a global variable in inline script tags.
   */
  private static parseInlineJson(html: string, globalName: string): any {
    const startToken = `var ${globalName} = `;
    const startIndex = html.indexOf(startToken);
    if (startIndex === -1) return null;
    const jsonStart = startIndex + startToken.length;
    let depth = 0;
    for (let i = jsonStart; i < html.length; i++) {
      if (html[i] === '{') depth++;
      else if (html[i] === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(html.slice(jsonStart, i + 1));
          } catch {
            return null;
          }
        }
      }
    }
    return null;
  }

  /**
   * Given caption tracks, selects the right one, fetches, and parses the transcript XML.
   */
  private static async fetchTranscriptFromTracks(captionTracks: any[], lang: string): Promise<ClientTranscriptSegment[]> {
    const hasDesiredLang = captionTracks.some((track) => track.languageCode === lang);
    const track = hasDesiredLang
      ? captionTracks.find((track) => track.languageCode === lang)
      : captionTracks[0];

    const transcriptURL = track.baseUrl;
    try {
      const url = new URL(transcriptURL);
      if (!url.hostname.endsWith('.youtube.com')) {
        throw new Error('TRANSCRIPT_NOT_AVAILABLE');
      }
    } catch {
      throw new Error('TRANSCRIPT_NOT_AVAILABLE');
    }

    const response = await fetch(transcriptURL, {
      headers: {
        'Accept-Language': lang,
        'User-Agent': USER_AGENT,
      },
    });
    if (!response.ok) {
      throw new Error('TRANSCRIPT_NOT_AVAILABLE');
    }
    const body = await response.text();
    return this.parseTranscriptXml(body);
  }

  /**
   * Parses the transcript XML, supporting srv3 format (<p t="ms">) and classic format (<text start="s" dur="s">).
   */
  private static parseTranscriptXml(xml: string): ClientTranscriptSegment[] {
    const results: ClientTranscriptSegment[] = [];
    // Try srv3 format first: <p t="ms" d="ms"><s>word</s>...</p>
    const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
    let match;
    while ((match = pRegex.exec(xml)) !== null) {
      const startMs = parseInt(match[1], 10);
      const durMs = parseInt(match[2], 10);
      const inner = match[3];
      let text = '';
      const sRegex = /<s[^>]*>([^<]*)<\/s>/g;
      let sMatch;
      while ((sMatch = sRegex.exec(inner)) !== null) {
        text += sMatch[1];
      }
      if (!text) {
        text = inner.replace(/<[^>]+>/g, '');
      }
      text = this.decodeEntities(text).trim();
      if (text) {
        results.push({
          text,
          start: startMs / 1000.0,
          duration: durMs / 1000.0,
        });
      }
    }
    if (results.length > 0) return results;

    // Fall back to classic format: <text start="s" dur="s">content</text>
    const classicResults = [...xml.matchAll(RE_XML_TRANSCRIPT)];
    return classicResults.map((result) => ({
      text: this.decodeEntities(result[3]),
      start: parseFloat(result[1]),
      duration: parseFloat(result[2]),
    }));
  }

  /**
   * Decodes common HTML entities.
   */
  private static decodeEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
  }
}
