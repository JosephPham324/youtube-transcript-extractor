import { StorageManager } from './StorageManager';
import { SanitizationEngine } from './SanitizationEngine';
import { TranscriptPayload } from '../types';
import { ClientYoutubeTranscript } from './ClientYoutubeTranscript';

export class TranscriptFetchProxy {
  private static readonly ENDPOINT = '/api/v1/transcript';
  private static readonly TIMEOUT_MS = 300000;

  /**
   * Orchestrates the retrieval of a transcript.
   * 1. Checks LocalStorage cache.
   * 2. If miss, queries direct browser scraper (if active) or the serverless proxy.
   * 3. Saves to cache on success.
   */
  public static async fetchTranscript(videoId: string, preferredLanguage: string = 'en'): Promise<TranscriptPayload> {
    // 1. Check Index in Cache
    const cached = StorageManager.getTranscript(videoId);
    if (cached) {
      console.log(`[TranscriptFetchProxy] Cache hit for ${videoId}`);
      return cached;
    }

    console.log(`[TranscriptFetchProxy] Cache miss for ${videoId}.`);

    // 2. Fetch transcript (Direct Browser vs Live Serverless API)
    const useBrowserFetch = localStorage.getItem("yte_fetch_from_browser") === "true";
    if (useBrowserFetch) {
      console.log(`[TranscriptFetchProxy] Fetching directly from browser using local traffic...`);
      try {
        const segments = await ClientYoutubeTranscript.fetchTranscript(videoId, preferredLanguage);
        const payload: TranscriptPayload = {
          videoId,
          languageCode: preferredLanguage,
          segments: SanitizationEngine.sanitize(segments)
        };
        // 3. Update Cache
        StorageManager.saveTranscript(payload);
        return payload;
      } catch (browserError: any) {
        console.error("Direct browser fetch failed:", browserError);
        // Map specific internal browser errors to the UI diagnostic codes
        if (browserError.message === 'TOO_MANY_REQUESTS') {
          throw new Error('HTTP_429_TOO_MANY_REQUESTS');
        }
        if (browserError.message === 'TRANSCRIPT_DISABLED' || browserError.message === 'TRANSCRIPT_NOT_AVAILABLE') {
          throw new Error('ERR_NO_CAPTIONS_AVAILABLE');
        }
        // General error, likely CORS blocked by YouTube
        throw new Error('ERR_CORS_BLOCKED');
      }
    }

    console.log(`[TranscriptFetchProxy] Querying Live Serverless API...`);

    // 2.5 Fetch from Serverless Proxy with Timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.TIMEOUT_MS);

    try {
      // Retrieve the client-managed proxy from local storage if configured
      const proxyUrl = localStorage.getItem("yte_youtube_proxy") || undefined;

      const response = await fetch(this.ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, preferredLanguage, proxyUrl }),
        signal: abortController.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle specific API Error Propagations
        if (response.status === 429) throw new Error('HTTP_429_TOO_MANY_REQUESTS');
        if (response.status === 403) throw new Error('HTTP_403_FORBIDDEN');
        if (response.status === 404) throw new Error('ERR_NO_CAPTIONS_AVAILABLE');
        
        throw new Error(`HTTP_${response.status}`);
      }

      const payload: TranscriptPayload = await response.json();

      // 2.8 Sanitize payload before caching or returning
      payload.segments = SanitizationEngine.sanitize(payload.segments);

      // 3. Update Cache
      StorageManager.saveTranscript(payload);

      return payload;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('ERR_TIMEOUT');
      }
      
      throw error;
    }
  }
}
