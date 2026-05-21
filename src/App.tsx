import React, { useState, useEffect } from "react";
import { InputForm } from "./components/InputForm";
import { OutputViewer } from "./components/OutputViewer";
import { TranscriptFetchProxy } from "./lib/TranscriptFetchProxy";
import { TranscriptPayload } from "./types";

function App() {
  // const [extractedId, setExtractedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [payload, setPayload] = useState<TranscriptPayload | null>(null);

  // OpenAI API Key & Proxy Configuration Management
  const [apiKey, setApiKey] = useState<string>("");
  const [isKeySaved, setIsKeySaved] = useState<boolean>(false);
  const [proxyUrl, setProxyUrl] = useState<string>("");
  const [isProxySaved, setIsProxySaved] = useState<boolean>(false);
  const [fetchFromBrowser, setFetchFromBrowser] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Read saved configurations from localStorage on load
  useEffect(() => {
    const savedKey = localStorage.getItem("yte_openai_api_key");
    if (savedKey) {
      setApiKey(savedKey);
      setIsKeySaved(true);
    }
    const savedProxy = localStorage.getItem("yte_youtube_proxy");
    if (savedProxy) {
      setProxyUrl(savedProxy);
      setIsProxySaved(true);
    }
    const savedBrowserFetch = localStorage.getItem("yte_fetch_from_browser");
    if (savedBrowserFetch === "true") {
      setFetchFromBrowser(true);
    }
  }, []);

  const handleToggleBrowserFetch = (checked: boolean) => {
    setFetchFromBrowser(checked);
    localStorage.setItem("yte_fetch_from_browser", String(checked));
  };

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem("yte_openai_api_key", apiKey.trim());
      setIsKeySaved(true);
    }
  };

  const handleDeleteKey = () => {
    localStorage.removeItem("yte_openai_api_key");
    setApiKey("");
    setIsKeySaved(false);
  };

  const handleSaveProxy = (e: React.FormEvent) => {
    e.preventDefault();
    if (proxyUrl.trim()) {
      localStorage.setItem("yte_youtube_proxy", proxyUrl.trim());
      setIsProxySaved(true);
    }
  };

  const handleDeleteProxy = () => {
    localStorage.removeItem("yte_youtube_proxy");
    setProxyUrl("");
    setIsProxySaved(false);
  };

  const getMaskedProxy = () => {
    if (!proxyUrl) return "";
    try {
      const url = new URL(proxyUrl);
      const username = url.username ? "•••••" : "";
      const password = url.password ? "•••••" : "";
      const auth = username ? `${username}:${password}@` : "";
      return `${url.protocol}//${auth}${url.hostname}${url.port ? `:${url.port}` : ""}`;
    } catch {
      // If not fully valid URL parsing, return simple mask
      return "••••••••••••";
    }
  };

  const handleVideoIdExtracted = async (id: string) => {
    // setExtractedId(id);
    setIsLoading(true);
    setApiError(null);
    setPayload(null);

    try {
      const data = await TranscriptFetchProxy.fetchTranscript(id, "en");
      setPayload(data);
    } catch (error: any) {
      setApiError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Maps SDD specific error codes to user-friendly UI alerts
  const renderDiagnosticError = (errorStr: string) => {
    let title = "Extraction Failed";
    let message = "An unknown error occurred during retrieval.";
    let style = "bg-red-50 border-red-200 text-red-800";

    if (errorStr === "HTTP_429_TOO_MANY_REQUESTS") {
      title = "Rate Limit Exceeded";
      message = "The upstream API gateway is currently overwhelmed. Please try again later.";
      style = "bg-orange-50 border-orange-200 text-orange-800";
    } else if (errorStr === "HTTP_403_FORBIDDEN") {
      title = "Access Forbidden";
      message = "Proxy firewall rejection. Your local IP may be geo-blocked.";
    } else if (errorStr === "ERR_NO_CAPTIONS_AVAILABLE") {
      title = "No Captions Available";
      message = "This video stream lacks subtitle definitions. Please try another video.";
      style = "bg-yellow-50 border-yellow-200 text-yellow-800";
    } else if (errorStr === "ERR_TIMEOUT") {
      title = "Network Timeout";
      message = "The request took too long to execute (exceeded 30s limit). Please check your connection and retry.";
    } else if (errorStr === "ERR_CORS_BLOCKED") {
      title = "CORS Connection Blocked";
      message = "Direct browser extraction requires a CORS-bypassing browser extension. Please install one (e.g. 'Allow CORS: Access-Control-Allow-Origin') and turn it on, or disable 'Direct Browser Extraction' in Settings.";
      style = "bg-purple-50 border-purple-200 text-purple-800";
    }

    return (
      <div className={`mt-8 w-full max-w-2xl border rounded-xl p-6 shadow-sm animate-in fade-in zoom-in-95 duration-300 ${style}`}>
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-sm opacity-90">{message}</p>
        {errorStr === "ERR_CORS_BLOCKED" && (
          <div className="mt-4 p-3 bg-white/50 border border-purple-200 rounded-lg text-xs leading-relaxed">
            <span className="font-semibold block mb-1">Quick Fix Steps:</span>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Install the free Chrome extension <a href="https://chromewebstore.google.com/detail/allow-cors-access-contro/lhbhongadgcmdgcljocpfbefolapgha" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-purple-800 hover:text-purple-950">Allow CORS</a>.</li>
              <li>Click the extension icon and toggle it <span className="font-bold text-purple-900">ON</span> (it will turn orange/active).</li>
              <li>Paste your YouTube URL again!</li>
            </ol>
          </div>
        )}
        <p className="mt-4 font-mono text-xs opacity-70">Diagnostic Code: {errorStr}</p>
      </div>
    );
  };

  const getMaskedKey = () => {
    if (!apiKey) return "";
    return `••••••••••••${apiKey.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pt-10 px-4 sm:px-6 lg:px-8 pb-20 relative">
      {/* Settings Panel Toggle */}
      <div className="absolute top-4 right-4 sm:right-8">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium shadow-sm transition-all duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-500">
            <path
              fillRule="evenodd"
              d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106a1.532 1.532 0 01-.947 2.287c-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
              clipRule="evenodd"
            />
          </svg>
          <span>Settings</span>
        </button>
      </div>

      {/* Settings Panel Modal/Dropdown */}
      {showSettings && (
        <div className="w-full max-w-lg mt-12 bg-white border border-slate-200 rounded-xl p-6 shadow-lg animate-in slide-in-from-top-4 duration-300 z-50">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="font-bold text-slate-800 text-lg">System Settings</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>

          {/* Section 1: OpenAI Key */}
          <div className="mb-6">
            <h4 className="font-semibold text-slate-800 text-sm mb-1.5 flex items-center gap-1.5">
              <span>OpenAI API Key (AI Refining)</span>
            </h4>
            <p className="text-slate-500 text-xs mb-3 leading-relaxed">
              Saved strictly in your browser's LocalStorage. Enables verbal filler purging and structured summarization.
            </p>

            {isKeySaved ? (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-mono text-sm text-slate-700">{getMaskedKey()}</span>
                <button
                  onClick={handleDeleteKey}
                  className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-semibold transition-colors duration-200"
                >
                  Delete Key
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveKey} className="flex gap-2">
                <input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors duration-200"
                >
                  Save
                </button>
              </form>
            )}
          </div>

          {/* Section 2: Direct Browser Extraction */}
          <div className="mb-6 border-b border-slate-100 pb-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-800 text-sm mb-1">
                  Direct Browser Extraction (Free)
                </h4>
                <p className="text-slate-500 text-xs leading-relaxed max-w-[280px]">
                  Scrape transcripts directly using your browser's local IP. Zero server or proxy costs!
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={fetchFromBrowser}
                  onChange={(e) => handleToggleBrowserFetch(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {fetchFromBrowser && (
              <div className="mt-3 p-3 bg-purple-50 border border-purple-100 rounded-lg text-purple-950 text-xs flex flex-col gap-1.5 leading-relaxed">
                <span className="font-medium flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-purple-600">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                  </svg>
                  Requires a CORS Extension
                 </span>
                 <span>
                   Install a free extension like <a href="https://chromewebstore.google.com/detail/allow-cors-access-contro/lhbhongadgcmdgcljocpfbefolapgha" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-purple-800">Allow CORS</a> and toggle it **ON** to bypass YouTube's browser restrictions.
                 </span>
              </div>
            )}
          </div>

          {/* Section 3: Residential Proxy */}
          <div className={fetchFromBrowser ? "opacity-50 pointer-events-none" : ""}>
            <h4 className="font-semibold text-slate-800 text-sm mb-1.5 flex items-center gap-1.5">
              <span>YouTube Extraction Proxy (Vercel Support)</span>
              {fetchFromBrowser && <span className="bg-slate-200 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">Bypassed</span>}
            </h4>
            <p className="text-slate-500 text-xs mb-3 leading-relaxed">
              {fetchFromBrowser 
                ? "Proxy requests are currently bypassed since Direct Browser Extraction is enabled." 
                : "Optional. Bypasses YouTube's datacenter blocks on cloud hostings like Vercel. Stored locally in your browser and sent on-demand."
              }
            </p>

            {isProxySaved ? (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-mono text-xs text-slate-600 break-all select-all">{getMaskedProxy()}</span>
                <button
                  onClick={handleDeleteProxy}
                  className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-semibold transition-colors duration-200"
                >
                  Delete Proxy
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveProxy} className="flex gap-2">
                <input
                  type="password"
                  placeholder="http://username:password@host:port"
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors duration-200"
                >
                  Save
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="text-center mb-12 mt-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">YouTube Transcript Extractor</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Instantly convert any YouTube video into readable, formatted markdown or SRT subtitles. Just paste the URL below.
        </p>
      </div>

      {/* Input Section */}
      <div className="w-full">
        <InputForm onVideoIdExtracted={handleVideoIdExtracted} />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="mt-12 flex flex-col items-center justify-center space-y-4 animate-pulse">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium tracking-wide text-sm uppercase">Querying Edge Proxy...</p>
        </div>
      )}

      {/* Error Diagnostics State */}
      {apiError && !isLoading && renderDiagnosticError(apiError)}

      {/* Output Viewer Component */}
      {payload && !isLoading && <OutputViewer payload={payload} apiKey={apiKey} />}
    </div>
  );
}

export default App;
