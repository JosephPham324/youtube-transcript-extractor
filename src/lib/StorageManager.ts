import { TranscriptPayload, CacheWrapper } from '../types';

export class StorageManager {
  private static readonly CACHE_PREFIX = 'yte_cache_';
  // 30 days in milliseconds
  private static readonly EVICTION_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

  /**
   * Generates the cache key for a given video ID
   */
  private static getKey(videoId: string): string {
    return `${this.CACHE_PREFIX}${videoId}`;
  }

  /**
   * Saves a transcript payload to local storage with the current timestamp
   */
  public static saveTranscript(payload: TranscriptPayload): void {
    try {
      const key = this.getKey(payload.videoId);
      const wrapper: CacheWrapper = {
        timestampCached: Date.now(),
        payload
      };
      localStorage.setItem(key, JSON.stringify(wrapper));
    } catch (error) {
      console.error('Failed to save transcript to local storage', error);
    }
  }

  /**
   * Retrieves a transcript payload from local storage if it exists and hasn't expired.
   * Returns null if not found, expired, or on parsing error.
   */
  public static getTranscript(videoId: string): TranscriptPayload | null {
    try {
      const key = this.getKey(videoId);
      const item = localStorage.getItem(key);
      
      if (!item) {
        return null;
      }

      const wrapper: CacheWrapper = JSON.parse(item);
      const age = Date.now() - wrapper.timestampCached;

      if (age > this.EVICTION_THRESHOLD_MS) {
        // Evict expired cache
        localStorage.removeItem(key);
        return null;
      }

      return wrapper.payload;
    } catch (error) {
      console.error('Failed to retrieve transcript from local storage', error);
      return null;
    }
  }
}
