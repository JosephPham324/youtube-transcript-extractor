import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { YoutubeTranscript } from 'youtube-transcript'
import { HttpsProxyAgent } from 'https-proxy-agent'
import fetch from 'node-fetch'

function transcriptApiPlugin(): Plugin {
  return {
    name: 'transcript-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/v1/transcript', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let bodyStr = '';
        req.on('data', chunk => {
          bodyStr += chunk;
        });

        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json');
          try {
            const body = bodyStr ? JSON.parse(bodyStr) : {};
            const { videoId, preferredLanguage, proxyUrl } = body;

            if (!videoId) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing videoId' }));
              return;
            }

            const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
            async function proxyFetch(url: string, init?: any) {
              const options = { ...init };
              if (proxyAgent) {
                options.agent = proxyAgent;
              }
              return fetch(url, options);
            }

            const transcriptData = await YoutubeTranscript.fetchTranscript(videoId, {
              lang: preferredLanguage || 'en',
              fetch: proxyFetch as any
            });

            const segments = transcriptData.map((item) => ({
              text: item.text,
              start: item.offset / 1000.0,
              duration: item.duration / 1000.0
            }));

            const payload = {
              videoId,
              languageCode: preferredLanguage || 'en',
              segments
            };

            res.statusCode = 200;
            res.end(JSON.stringify(payload));
          } catch (libraryError: any) {
            console.error('[Dev API] Library failed to extract:', libraryError);
            if (libraryError.message && libraryError.message.includes('Too many requests')) {
              res.statusCode = 429;
              res.end(JSON.stringify({ error: 'HTTP_429_TOO_MANY_REQUESTS' }));
              return;
            }
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'ERR_NO_CAPTIONS_AVAILABLE' }));
          }
        });
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), transcriptApiPlugin()],
})

