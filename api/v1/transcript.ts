import { YoutubeTranscript } from 'youtube-transcript';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

export default async function handler(req: any, res: any) {
  // Set CORS headers if needed, otherwise rely on Vercel's defaults
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Vercel parses req.body automatically for POST JSON payloads
    const { videoId, preferredLanguage, proxyUrl } = req.body || {};

    if (!videoId) {
      return res.status(400).json({ error: 'Missing videoId' });
    }

    try {
      // Construct proxy agent if client passes a proxy URL
      const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

      // Custom fetch wrapper to route egress traffic through the proxy
      async function proxyFetch(url: string, init?: any) {
        const options = { ...init };
        if (proxyAgent) {
          options.agent = proxyAgent;
        }
        return fetch(url, options);
      }

      // 1. Fetch transcript using the library and the custom fetch wrapper
      const transcriptData = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: preferredLanguage || 'en',
        fetch: proxyFetch as any
      });
      
      // 2. Map payload to SDD constraints
      const segments = transcriptData.map((item) => ({
        text: item.text,
        start: item.offset / 1000.0, // Convert ms to seconds
        duration: item.duration / 1000.0 // Convert ms to seconds
      }));

      const payload = {
        videoId,
        languageCode: preferredLanguage || 'en',
        segments
      };

      return res.status(200).json(payload);
      
    } catch (libraryError: any) {
      console.error('Library failed to extract:', libraryError);
      
      // Map library failure to our strict UI diagnostic codes
      if (libraryError.message && libraryError.message.includes('Too many requests')) {
        return res.status(429).json({ error: 'HTTP_429_TOO_MANY_REQUESTS' });
      }

      return res.status(404).json({ error: 'ERR_NO_CAPTIONS_AVAILABLE' });
    }

  } catch (error) {
    console.error('API Handler Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
