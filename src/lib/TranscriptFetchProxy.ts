import { StorageManager } from './StorageManager';
import { SanitizationEngine } from './SanitizationEngine';
import { TranscriptPayload } from '../types';

export class TranscriptFetchProxy {
  private static readonly ENDPOINT = '/api/v1/transcript';
  private static readonly TIMEOUT_MS = 300000;

  /**
   * Orchestrates the retrieval of a transcript.
   * 1. Checks LocalStorage cache.
   * 2. If miss, queries the serverless proxy.
   * 3. Saves to cache on success.
   */
  public static async fetchTranscript(videoId: string, preferredLanguage: string = 'en'): Promise<TranscriptPayload> {
    // 1. Check Index in Cache
    const cached = StorageManager.getTranscript(videoId);
    if (cached) {
      console.log(`[TranscriptFetchProxy] Cache hit for ${videoId}`);
      return cached;
    }

    console.log(`[TranscriptFetchProxy] Cache miss for ${videoId}. Fetching from Live Serverless API...`);

    // 2. Fetch from Serverless Proxy with Timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(this.ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, preferredLanguage }),
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

      // 2.5 Sanitize payload before caching or returning
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
