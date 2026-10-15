import React, { useState, useEffect } from 'react';
import { useWhiteboard } from '../../context/WhiteboardContext';
import { renderLatexToString } from '../../utils/latexRenderer';
import { HandwritingFontStyle } from '../../types/whiteboard';
import {
  Check,
  X,
  Edit3,
  RotateCcw,
  Sparkles,
  Sigma,
  BookOpen,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';

export const CorrectionPreviewModal: React.FC = () => {
  const {
    pendingSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    processStrokesForRecognition,
    aiSettings
  } = useWhiteboard();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedContent, setEditedContent] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<HandwritingFontStyle>('clean_classroom');
  const [countdown, setCountdown] = useState<number>(100);

  useEffect(() => {
    if (pendingSuggestion) {
      const res = pendingSuggestion.result;
      const initialText = res.detectedType === 'mathematics' ? (res.latex || res.correctedText) : res.correctedText;
      setEditedContent(initialText);
      setSelectedStyle(res.suggestedHandwritingStyle || 'clean_classroom');
      setIsEditing(false);

      // If Auto-fix is active, animate countdown
      if (aiSettings.mode === 'AUTO-FIX' && res.confidence >= 0.75 && !res.isAmbiguous) {
        setCountdown(100);
        const interval = setInterval(() => {
          setCountdown((prev) => Math.max(0, prev - 7));
        }, 100);
        return () => clearInterval(interval);
      }
    }
  }, [pendingSuggestion, aiSettings.mode]);

  if (!pendingSuggestion) return null;

  const { result, strokes } = pendingSuggestion;
  const isMath = result.detectedType === 'mathematics';
  const confidencePercent = Math.round(result.confidence * 100);

  const handleAccept = () => {
    acceptSuggestion(pendingSuggestion, editedContent, selectedStyle);
  };

  const handleTryAgain = () => {
    processStrokesForRecognition(strokes, result.detectedType);
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[94%] sm:w-[540px] animate-in slide-in-from-bottom-4 duration-200">
      <div className="bg-slate-800/95 backdrop-blur-xl border border-sky-500/50 rounded-2xl shadow-2xl overflow-hidden text-slate-100 ring-4 ring-sky-500/10">
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            {isMath ? (
              <span className="flex items-center space-x-1.5 px-2.5 py-0.5 bg-sky-500/20 text-sky-400 text-xs font-bold rounded-md border border-sky-500/30">
                <Sigma className="w-3.5 h-3.5" />
                <span>Mathematics Detected</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-md border border-emerald-500/30">
                <BookOpen className="w-3.5 h-3.5" />
                <span>English Sentence Detected</span>
              </span>
            )}
            <span className="text-xs text-slate-400 font-mono">
              Confidence: <strong className="text-slate-200">{confidencePercent}%</strong>
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={rejectSuggestion}
              className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-700/60 transition-colors"
              title="Dismiss / Keep original handwriting"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Auto-Fix Countdown Bar */}
        {aiSettings.mode === 'AUTO-FIX' && countdown > 0 && (
          <div className="w-full bg-slate-700 h-1">
            <div
              className="bg-sky-400 h-1 transition-all duration-100 ease-linear"
              style={{ width: `${countdown}%` }}
            />
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 space-y-3">
          {/* Ambiguity Alert if any */}
          {result.isAmbiguous && (
            <div className="flex items-start space-x-2 p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-lg text-xs text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Ambiguity Detected:</strong> Writing could have multiple interpretations. Please review or edit before accepting.
              </div>
            </div>
          )}

          {/* Grammar & Spelling Fixes Applied */}
          {result.grammaticalFixesApplied && result.grammaticalFixesApplied.length > 0 && (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                Improvements & Corrections:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.grammaticalFixesApplied.map((fix, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[11px] rounded-md font-medium"
                  >
                    {fix}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Corrected Content Render Preview */}
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700 min-h-[58px] flex flex-col justify-center">
            {isEditing ? (
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full bg-slate-800 text-slate-100 border border-slate-600 rounded-lg p-2.5 text-sm font-mono focus:ring-1 focus:ring-sky-500 outline-none resize-none"
                rows={3}
                placeholder={isMath ? "Edit LaTeX formula..." : "Edit English text..."}
              />
            ) : isMath ? (
              <div
                className="text-center text-lg text-slate-100 overflow-x-auto py-1"
                dangerouslySetInnerHTML={{ __html: renderLatexToString(editedContent, true) }}
              />
            ) : (
              <div className="text-xl text-sky-200 font-classroom py-1">
                {editedContent}
              </div>
            )}
          </div>

          {/* Handwriting Style Selector for English */}
          {!isMath && (
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-700/60">
              <span className="text-slate-400">Handwriting Style:</span>
              <div className="flex space-x-1.5">
                {[
                  { id: 'clean_classroom', label: 'Classroom' },
                  { id: 'neat_student', label: 'Student' },
                  { id: 'simple_cursive', label: 'Cursive' },
                  { id: 'neat_print', label: 'Print' }
                ].map(st => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStyle(st.id as HandwritingFontStyle)}
                    className={`px-2 py-1 rounded text-xs transition-all ${
                      selectedStyle === st.id
                        ? 'bg-sky-500/30 text-sky-200 border border-sky-500/50 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Alternatives dropdown if provided */}
          {result.alternatives && result.alternatives.length > 1 && (
            <div className="pt-1 flex items-center space-x-2 text-xs text-slate-400">
              <span>Alternative reading:</span>
              <button
                onClick={() => setEditedContent(result.alternatives[1].latex || result.alternatives[1].text)}
                className="text-sky-400 underline hover:text-sky-300 font-mono"
              >
                {result.alternatives[1].latex || result.alternatives[1].text}
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 bg-slate-900/80 border-t border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-1 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>{isEditing ? 'Preview' : 'Edit Formula'}</span>
            </button>
            <button
              onClick={handleTryAgain}
              className="flex items-center space-x-1 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Try Again</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={rejectSuggestion}
              className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-rose-300 bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-800/60 rounded-lg transition-colors"
            >
              Keep Original
            </button>
            <button
              onClick={handleAccept}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-sky-500/20 transition-all scale-100 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Accept & Convert</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
