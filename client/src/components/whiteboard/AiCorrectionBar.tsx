import React, { useState } from 'react';
import { useWhiteboard } from '../../context/WhiteboardContext';
import {
  AiCorrectionMode,
  EnglishCorrectionLevel,
  MathOutputStyle,
  HandwritingFontStyle,
  RecognitionThreshold
} from '../../types/whiteboard';
import {
  Sparkles,
  Settings2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Zap,
  BookOpen,
  Sigma,
  ChevronDown,
  X
} from 'lucide-react';

export const AiCorrectionBar: React.FC = () => {
  const {
    aiSettings,
    updateAiSettings,
    aiStatus,
    activePage,
    processStrokesForRecognition
  } = useWhiteboard();

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const getStatusBadge = () => {
    switch (aiStatus) {
      case 'recognizing':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-300 text-xs rounded-full animate-pulse border border-amber-500/30">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span className="font-semibold">Recognizing...</span>
          </span>
        );
      case 'ready':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-semibold">Correction Ready</span>
          </span>
        );
      case 'auto_fixed':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-1 bg-sky-500/20 text-sky-300 text-xs rounded-full border border-sky-500/30">
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold">Auto-Fix Active</span>
          </span>
        );
      case 'uncertain':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-1 bg-orange-500/20 text-orange-300 text-xs rounded-full border border-orange-500/30">
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="font-semibold">Recognition Uncertain</span>
          </span>
        );
      case 'offline':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-1 bg-rose-500/20 text-rose-300 text-xs rounded-full border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="font-semibold">Offline</span>
          </span>
        );
      case 'writing':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 bg-slate-700 text-slate-300 text-xs rounded-full">
            <span>Writing...</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 text-slate-400 text-xs rounded-full">
            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
            <span>Standby</span>
          </span>
        );
    }
  };

  const handleManualRecognize = () => {
    if (!activePage) return;
    // Collect recent strokes from active page
    const strokes = activePage.objects
      .filter(o => o.type === 'stroke' && o.strokeData)
      .map(o => o.strokeData!)
      .slice(-10);

    if (strokes.length > 0) {
      processStrokesForRecognition(strokes);
    } else {
      alert('Write some strokes on the whiteboard first using the Pen tool!');
    }
  };

  return (
    <>
      {/* Top Banner Control Bar */}
      <div className="flex items-center space-x-3 bg-slate-800/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/80 shadow-xl">
        {/* Main Branding Pill */}
        <div className="flex items-center space-x-2 border-r border-slate-700 pr-3">
          <div className="p-1.5 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-lg shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs font-bold tracking-wider text-slate-200 uppercase">
              AI Handwriting Correction
            </div>
            <div className="text-[10px] text-slate-400 flex items-center space-x-1">
              <span>Class 9-12 • O/A Level Math</span>
            </div>
          </div>
        </div>

        {/* 3 Modes Switcher (OFF / SUGGEST / AUTO-FIX) */}
        <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-700/60">
          {(['OFF', 'SUGGEST', 'AUTO-FIX'] as AiCorrectionMode[]).map((mode) => {
            const isActive = aiSettings.mode === mode;
            let activeColor = 'bg-slate-700 text-white';
            if (isActive && mode === 'SUGGEST') activeColor = 'bg-amber-600 text-white shadow-sm';
            if (isActive && mode === 'AUTO-FIX') activeColor = 'bg-sky-600 text-white shadow-sm';
            if (isActive && mode === 'OFF') activeColor = 'bg-rose-900/60 text-rose-200 shadow-sm';

            return (
              <button
                key={mode}
                onClick={() => updateAiSettings({ mode })}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  isActive ? activeColor : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            );
          })}
        </div>

        {/* Status Badge */}
        {getStatusBadge()}

        {/* Manual Recognize Now Button */}
        <button
          onClick={handleManualRecognize}
          title="Manually recognize recent strokes"
          className="flex items-center space-x-1.5 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-600/50"
        >
          <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
          <span>Recognize Now</span>
        </button>

        {/* Settings Toggle Button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-1.5 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700/50"
          title="AI Handwriting Settings"
        >
          <Settings2 className="w-4 h-4 text-sky-400" />
        </button>
      </div>

      {/* Slide-over / Modal Settings Panel */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/80">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">AI Handwriting Recognition Settings</h3>
                  <p className="text-xs text-slate-400">Configure separate English and Mathematics pipelines</p>
                </div>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm text-slate-300">
              {/* 1. Global Mode */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recognition Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'OFF', label: 'OFF', desc: 'Keep raw writing' },
                    { id: 'SUGGEST', label: 'SUGGEST', desc: 'Preview before applying' },
                    { id: 'AUTO-FIX', label: 'AUTO-FIX', desc: 'High-confidence auto-apply' }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => updateAiSettings({ mode: m.id as any })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        aiSettings.mode === m.id
                          ? 'bg-sky-500/20 border-sky-500 text-sky-200'
                          : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-bold text-xs">{m.label}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. English Settings */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-slate-100">English Handwriting Pipeline</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiSettings.englishEnabled}
                      onChange={(e) => updateAiSettings({ englishEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-xs text-slate-400">English Correction Level:</label>
                  <select
                    value={aiSettings.englishCorrectionLevel}
                    onChange={(e) => updateAiSettings({ englishCorrectionLevel: e.target.value as EnglishCorrectionLevel })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                  >
                    <option value="recognition_only">Recognize handwriting only (No changes)</option>
                    <option value="spelling">Fix spelling only (e.g. importent → important)</option>
                    <option value="spelling_punctuation">Fix spelling and punctuation</option>
                    <option value="grammar_punctuation">Fix grammar, spelling, and punctuation (Recommended)</option>
                  </select>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-xs text-slate-400">Handwritten Output Font Style:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'clean_classroom', label: 'Clean Classroom', font: 'Caveat' },
                      { id: 'neat_student', label: 'Neat Student', font: 'Patrick Hand' },
                      { id: 'simple_cursive', label: 'Simple Cursive', font: 'Cedarville' },
                      { id: 'neat_print', label: 'Neat Print', font: 'Architects' }
                    ].map(st => (
                      <button
                        key={st.id}
                        onClick={() => updateAiSettings({ defaultHandwritingStyle: st.id as any })}
                        className={`px-3 py-2 text-xs rounded-lg border text-left transition-all ${
                          aiSettings.defaultHandwritingStyle === st.id
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200'
                            : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <span className="font-semibold">{st.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Mathematics Settings */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sigma className="w-4 h-4 text-sky-400" />
                    <span className="font-bold text-slate-100">Mathematics Recognition Pipeline</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiSettings.mathEnabled}
                      onChange={(e) => updateAiSettings({ mathEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                  </label>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-xs text-slate-400">Mathematics Output Style:</label>
                  <select
                    value={aiSettings.mathOutputStyle}
                    onChange={(e) => updateAiSettings({ mathOutputStyle: e.target.value as MathOutputStyle })}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-sky-500 outline-none"
                  >
                    <option value="neat_notation">Neat Mathematical Notation (KaTeX Cards - Recommended)</option>
                    <option value="latex_code">Editable Raw LaTeX Code</option>
                    <option value="original">Keep Original Handwriting</option>
                  </select>
                </div>
              </div>

              {/* 4. Threshold & Sensitivity */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recognition Threshold</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'conservative', label: 'Conservative', desc: '88% confidence' },
                    { id: 'balanced', label: 'Balanced', desc: '78% confidence' },
                    { id: 'aggressive', label: 'More Aggressive', desc: '65% confidence' }
                  ].map(th => (
                    <button
                      key={th.id}
                      onClick={() => updateAiSettings({ threshold: th.id as RecognitionThreshold })}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        aiSettings.threshold === th.id
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200'
                          : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-bold text-xs">{th.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{th.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/80 flex justify-end">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Apply & Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
