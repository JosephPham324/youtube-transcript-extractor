import React, { useState } from 'react';
import { UrlParserModule } from '../lib/UrlParserModule';

interface InputFormProps {
  onVideoIdExtracted: (videoId: string) => void;
}

export const InputForm: React.FC<InputFormProps> = ({ onVideoIdExtracted }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const videoId = UrlParserModule.parseVideoId(url);
      onVideoIdExtracted(videoId);
    } catch (err: any) {
      if (err.message === 'ERR_INVALID_URL') {
        setError('ERR_INVALID_URL: Please enter a valid YouTube URL');
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
        <label htmlFor="youtube-url" className="text-sm font-medium text-slate-700">
          YouTube Video URL
        </label>
        <div className="relative">
          <input
            id="youtube-url"
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            className={`w-full px-5 py-4 bg-white border ${
              error ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-600'
            } rounded-xl shadow-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ease-in-out`}
          />
          <button
            type="submit"
            className="absolute right-2 top-2 bottom-2 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            Extract
          </button>
        </div>
        
        {/* Error State Presentation */}
        {error && (
          <div className="flex items-center space-x-2 text-red-600 text-sm font-medium mt-1 animate-in fade-in slide-in-from-top-2 duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </form>
    </div>
  );
};
