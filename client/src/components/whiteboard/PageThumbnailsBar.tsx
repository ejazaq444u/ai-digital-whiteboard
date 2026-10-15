import React, { useState } from 'react';
import { useWhiteboard } from '../../context/WhiteboardContext';
import {
  Plus,
  Copy,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Layers,
  FileCheck
} from 'lucide-react';

export const PageThumbnailsBar: React.FC = () => {
  const {
    board,
    activePageIndex,
    switchPage,
    addPage,
    duplicatePage,
    deletePage,
    renamePage
  } = useWhiteboard();

  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');

  if (!board) return null;

  const handleStartRename = (pageId: string, currentTitle: string) => {
    setEditingPageId(pageId);
    setEditTitle(currentTitle);
  };

  const handleFinishRename = (pageId: string) => {
    if (editTitle.trim()) {
      renamePage(pageId, editTitle.trim());
    }
    setEditingPageId(null);
  };

  return (
    <div className="fixed bottom-4 left-6 z-30 flex items-end">
      {/* Drawer Container */}
      <div className={`bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden ${isOpen ? 'p-3 w-80' : 'p-2 w-auto'}`}>
        <div className="flex items-center justify-between pb-2 border-b border-slate-700/60 mb-2">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-sky-400" />
            {isOpen && (
              <span className="text-xs font-bold text-slate-200">
                Lesson Pages ({board.pages.length})
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1">
            {isOpen && (
              <button
                onClick={() => addPage()}
                className="p-1 hover:bg-slate-700 text-sky-400 rounded-md transition-colors"
                title="Add New Whiteboard Page"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md transition-colors"
              title={isOpen ? 'Collapse Pages' : 'Expand Pages'}
            >
              {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Page List */}
        {isOpen && (
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {board.pages.map((page, idx) => {
              const isActive = idx === activePageIndex;
              return (
                <div
                  key={page.id}
                  onClick={() => switchPage(idx)}
                  className={`group flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${
                    isActive
                      ? 'bg-sky-500/20 border-sky-500 text-sky-200 font-semibold shadow-sm'
                      : 'bg-slate-900/40 border-slate-700/60 text-slate-300 hover:bg-slate-700/60'
                  }`}
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span className="text-xs font-mono text-slate-400 shrink-0 w-4">
                      {idx + 1}.
                    </span>

                    {editingPageId === page.id ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleFinishRename(page.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleFinishRename(page.id)}
                        autoFocus
                        className="bg-slate-900 text-xs px-2 py-0.5 rounded border border-sky-400 outline-none w-full text-slate-100"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-xs truncate">{page.title}</span>
                    )}
                  </div>

                  {/* Actions on hover */}
                  <div className="hidden group-hover:flex items-center space-x-1 shrink-0 ml-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleStartRename(page.id, page.title)}
                      className="p-1 hover:text-sky-300 text-slate-400"
                      title="Rename Page"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => duplicatePage(page.id)}
                      className="p-1 hover:text-emerald-300 text-slate-400"
                      title="Duplicate Page"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {board.pages.length > 1 && (
                      <button
                        onClick={() => deletePage(page.id)}
                        className="p-1 hover:text-rose-400 text-slate-400"
                        title="Delete Page"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
