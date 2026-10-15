import React, { useState } from 'react';
import { useWhiteboard } from '../../context/WhiteboardContext';
import { renderLatexToString } from '../../utils/latexRenderer';
import { WhiteboardObject } from '../../types/whiteboard';
import { Sigma, X, Plus, Sparkles, Copy, Check } from 'lucide-react';

interface MathEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLatex?: string;
  targetObjectId?: string;
}

export const MathEditorModal: React.FC<MathEditorModalProps> = ({
  isOpen,
  onClose,
  initialLatex = 'x^2 + 5x + 6 = 0',
  targetObjectId
}) => {
  const { addObject, updateObject, activePage, color } = useWhiteboard();
  const [latex, setLatex] = useState<string>(initialLatex);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const insertSymbol = (symbolSnippet: string) => {
    setLatex(prev => prev + symbolSnippet);
  };

  const handleSave = () => {
    if (!latex.trim() || !activePage) return;

    if (targetObjectId) {
      const obj = activePage.objects.find(o => o.id === targetObjectId);
      if (obj) {
        updateObject({
          ...obj,
          latex,
          mathExpression: latex,
          updatedAt: Date.now()
        });
      }
    } else {
      // Create new math block in center of screen
      const newMathObj: WhiteboardObject = {
        id: `math_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'math',
        x: 200,
        y: 200,
        width: 320,
        height: 80,
        latex,
        mathExpression: latex,
        fontSize: 24,
        color: '#f8fafc',
        revision: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      addObject(newMathObj);
    }

    onClose();
  };

  const handleCopyLatex = () => {
    navigator.clipboard.writeText(latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
              <Sigma className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Manual Mathematics & LaTeX Editor</h3>
              <p className="text-xs text-slate-400">Class 9-12 & O/A Level Math Notation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Quick Symbol Palettes */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Mathematical Quick Symbols
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 text-sm">
              {[
                { label: 'Fraction', code: '\\frac{a}{b}' },
                { label: 'Square Root', code: '\\sqrt{x}' },
                { label: 'nth Root', code: '\\sqrt[n]{x}' },
                { label: 'Exponent', code: 'x^2' },
                { label: 'Subscript', code: 'x_1' },
                { label: 'Quad Formula', code: '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
                { label: 'Integral', code: '\\int_{0}^{1} x^2 \\, dx' },
                { label: 'Summation', code: '\\sum_{i=1}^{n} ' },
                { label: 'Limit', code: '\\lim_{x \\to 0} ' },
                { label: 'Plus/Minus', code: ' \\pm ' },
                { label: 'Alpha α', code: '\\alpha ' },
                { label: 'Beta β', code: '\\beta ' },
                { label: 'Theta θ', code: '\\theta ' },
                { label: 'Pi π', code: '\\pi ' },
                { label: 'Delta Δ', code: '\\Delta ' },
                { label: 'Sin θ', code: '\\sin(\\theta) ' },
                { label: 'Cos θ', code: '\\cos(\\theta) ' },
                { label: 'Matrix', code: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' }
              ].map((sym, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => insertSymbol(sym.code)}
                  className="px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-700 border border-slate-700 hover:border-sky-500 rounded-lg text-xs font-mono text-slate-200 transition-all text-center truncate"
                  title={sym.code}
                >
                  {sym.label}
                </button>
              ))}
            </div>
          </div>

          {/* LaTeX Input Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                LaTeX Expression Input
              </label>
              <button
                onClick={handleCopyLatex}
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center space-x-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy LaTeX'}</span>
              </button>
            </div>
            <textarea
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              rows={3}
              className="w-full bg-slate-900 text-slate-100 border border-slate-700 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-sky-500 outline-none"
              placeholder="e.g. \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"
            />
          </div>

          {/* Live KaTeX Render Preview */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Live KaTeX Rendered Preview
            </label>
            <div className="p-6 bg-slate-900/90 border border-slate-700 rounded-xl min-h-[90px] flex items-center justify-center overflow-x-auto shadow-inner">
              <div
                className="text-2xl text-slate-100"
                dangerouslySetInnerHTML={{ __html: renderLatexToString(latex, true) }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white text-xs font-medium rounded-xl hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-1.5 px-6 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{targetObjectId ? 'Save Changes' : 'Insert Equation onto Whiteboard'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
