import React, { useState, useEffect } from 'react';
import { InputForm } from './components/InputForm';
import { OutputViewer } from './components/OutputViewer';
import { TranscriptFetchProxy } from './lib/TranscriptFetchProxy';
import { TranscriptPayload } from './types';

function App() {
  const [extractedId, setExtractedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [payload, setPayload] = useState<TranscriptPayload | null>(null);

  // OpenAI API Key Management
  const [apiKey, setApiKey] = useState<string>('');
  const [isKeySaved, setIsKeySaved] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Read saved API key from localStorage on load
  useEffect(() => {
    const savedKey = localStorage.getItem('yte_openai_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setIsKeySaved(true);
    }
  }, []);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      localStorage.setItem('yte_openai_api_key', apiKey.trim());
      setIsKeySaved(true);
      setShowSettings(false);
    }
  };

  const handleDeleteKey = () => {
    localStorage.removeItem('yte_openai_api_key');
    setApiKey('');
    setIsKeySaved(false);
  };

  const handleVideoIdExtracted = async (id: string) => {
    setExtractedId(id);
    setIsLoading(true);
    setApiError(null);
    setPayload(null);

    try {
      const data = await TranscriptFetchProxy.fetchTranscript(id, 'en');
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

    if (errorStr === 'HTTP_429_TOO_MANY_REQUESTS') {
      title = "Rate Limit Exceeded";
      message = "The upstream API gateway is currently overwhelmed. Please try again later.";
      style = "bg-orange-50 border-orange-200 text-orange-800";
    } else if (errorStr === 'HTTP_403_FORBIDDEN') {
      title = "Access Forbidden";
      message = "Proxy firewall rejection. Your local IP may be geo-blocked.";
    } else if (errorStr === 'ERR_NO_CAPTIONS_AVAILABLE') {
      title = "No Captions Available";
      message = "This video stream lacks subtitle definitions. Please try another video.";
      style = "bg-yellow-50 border-yellow-200 text-yellow-800";
    } else if (errorStr === 'ERR_TIMEOUT') {
      title = "Network Timeout";
      message = "The request took too long to execute (exceeded 30s limit). Please check your connection and retry.";
    }

    return (
      <div className={`mt-8 w-full max-w-2xl border rounded-xl p-6 shadow-sm animate-in fade-in zoom-in-95 duration-300 ${style}`}>
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-sm opacity-90">{message}</p>
        <p className="mt-4 font-mono text-xs opacity-70">Diagnostic Code: {errorStr}</p>
      </div>
    );
  };

  const getMaskedKey = () => {
    if (!apiKey) return '';
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
            <path fillRule="evenodd" d="M11.822 5.292a1 1 0 01-1.42 1.42l-1.5-1.5a1 1 0 010-1.42l1.5-1.5a1 1 0 111.42 1.42L11.23 4.5h2.27a3 3 0 013 3v2.27a1 1 0 11-2 0V7.5a1 1 0 00-1-1h-2.27l.59.592zM2 10a1 1 0 011-1h2.27l-.59-.592a1 1 0 111.42-1.42l1.5 1.5a1 1 0 010 1.42l-1.5 1.5a1 1 0 01-1.42-1.42l.59-.592H3a1 1 0 00-1 1v2.27a1 1 0 11-2 0V10z" clipRule="evenodd" />
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
          <span>AI Settings</span>
        </button>
      </div>

      {/* Settings Panel Modal/Dropdown */}
      {showSettings && (
        <div className="w-full max-w-lg mt-12 bg-white border border-slate-200 rounded-xl p-6 shadow-lg animate-in slide-in-from-top-4 duration-300 z-50">
          <h3 className="font-bold text-slate-800 text-lg mb-3">OpenAI API Key Configuration</h3>
          <p className="text-slate-600 text-sm mb-4 leading-relaxed">
            Your key is saved <strong>locally</strong> in your browser's LocalStorage. All AI operations are executed directly via client-side fetch calls to OpenAI.
          </p>

          {isKeySaved ? (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
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
      )}

      {/* Header Section */}
      <div className="text-center mb-12 mt-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          YouTube Transcript Extractor
        </h1>
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
