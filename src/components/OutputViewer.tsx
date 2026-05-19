import React, { useState, useMemo } from 'react';
import { TranscriptPayload } from '../types';
import { FormatterEngine } from '../lib/FormatterEngine';
import { AiService } from '../lib/AiService';

type Tab = 'Markdown' | 'HTML' | 'SRT' | 'AI_Clean' | 'AI_Summary';

interface OutputViewerProps {
  payload: TranscriptPayload;
  apiKey: string;
}

export const OutputViewer: React.FC<OutputViewerProps> = ({ payload, apiKey }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Markdown');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Client-side cache for AI-generated results to avoid redundant API charges
  const [aiCleanedText, setAiCleanedText] = useState<string | null>(null);
  const [aiSummaryText, setAiSummaryText] = useState<string | null>(null);

  // Normal format conversions
  const standardContent = useMemo(() => {
    switch (activeTab) {
      case 'Markdown':
        return FormatterEngine.toMarkdown(payload);
      case 'HTML':
        return FormatterEngine.toHtml(payload);
      case 'SRT':
        return FormatterEngine.toSrt(payload);
      default:
        return '';
    }
  }, [payload, activeTab]);

  // Determine what to display based on the active tab
  const displayedContent = useMemo(() => {
    if (activeTab === 'AI_Clean') {
      return aiCleanedText || '';
    }
    if (activeTab === 'AI_Summary') {
      return aiSummaryText || '';
    }
    return standardContent;
  }, [activeTab, standardContent, aiCleanedText, aiSummaryText]);

  // Handles requesting the OpenAI API for the active AI tab
  const handleAiRefinement = async (tab: 'AI_Clean' | 'AI_Summary') => {
    setActiveTab(tab);
    setAiError(null);

    // If we already have the generated result in local state, bypass fetch
    if (tab === 'AI_Clean' && aiCleanedText) return;
    if (tab === 'AI_Summary' && aiSummaryText) return;

    if (!apiKey) {
      setAiError('OpenAI API Key Required: Please add your key in the settings panel at the top of the page.');
      return;
    }

    setIsLoading(true);
    const rawMarkdownText = FormatterEngine.toMarkdown(payload);

    try {
      if (tab === 'AI_Clean') {
        const cleaned = await AiService.purgeFiller(rawMarkdownText, apiKey);
        setAiCleanedText(cleaned);
      } else {
        const summary = await AiService.generateSummary(rawMarkdownText, apiKey);
        setAiSummaryText(summary);
      }
    } catch (err: any) {
      setAiError(err.message || 'Failed to complete AI processing');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!displayedContent || isLoading) return;
    try {
      await navigator.clipboard.writeText(displayedContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200 bg-slate-50 px-4 sm:px-6">
        <div className="flex flex-wrap gap-1 py-3 justify-center sm:justify-start">
          {(['Markdown', 'HTML', 'SRT'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setAiError(null);
              }}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
          
          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          {/* AI Tab Controls */}
          <button
            onClick={() => handleAiRefinement('AI_Clean')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 flex items-center space-x-1.5 ${
              activeTab === 'AI_Clean'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <span>✨ AI Clean</span>
          </button>

          <button
            onClick={() => handleAiRefinement('AI_Summary')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 flex items-center space-x-1.5 ${
              activeTab === 'AI_Summary'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            <span>📝 AI Summary</span>
          </button>
        </div>
        
        <div className="py-3 sm:py-0">
          <button
            onClick={handleCopy}
            disabled={isLoading || !displayedContent}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-lg text-sm font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            {copySuccess ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-600">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                  <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content Viewer Panel */}
      <div className="bg-white p-6 h-[500px] overflow-y-auto relative">
        {isLoading ? (
          <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center space-y-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 font-medium text-sm tracking-wide">OpenAI GPT-4o-mini Refining Text...</p>
          </div>
        ) : aiError ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-full text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.63-1.515 2.63H3.72c-1.345 0-2.188-1.463-1.515-2.63l6.28-10.875zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <h4 className="font-bold text-slate-800 text-lg">AI Execution Failed</h4>
            <p className="text-sm text-slate-600 leading-relaxed">{aiError}</p>
          </div>
        ) : (
          <pre className="font-mono text-sm text-slate-800 whitespace-pre-wrap break-words">
            {displayedContent}
          </pre>
        )}
      </div>
    </div>
  );
};
