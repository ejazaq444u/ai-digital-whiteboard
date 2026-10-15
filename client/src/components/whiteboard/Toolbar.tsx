import React, { useState } from 'react';
import { useWhiteboard } from '../../context/WhiteboardContext';
import { ToolType } from '../../types/whiteboard';
import {
  MousePointer,
  PenTool,
  Highlighter,
  Eraser,
  Type,
  Square,
  Circle,
  Triangle,
  Star,
  ArrowRight,
  Minus,
  Sigma,
  StickyNote,
  Compass,
  FileText,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Undo2,
  Redo2,
  Grid,
  Radio,
  Image as ImageIcon,
  Palette,
  Sun,
  Moon
} from 'lucide-react';

interface ToolbarProps {
  onOpenMathEditor: () => void;
  onOpenUploadModal: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onOpenMathEditor, onOpenUploadModal }) => {
  const {
    tool,
    setTool,
    color,
    setColor,
    strokeWidth,
    setStrokeWidth,
    selectedShapeType,
    setSelectedShapeType,
    boardTheme,
    setBoardTheme,
    zoom,
    setZoom,
    resetView,
    undo,
    redo,
    canUndo,
    canRedo,
    activePage,
    changeBackgroundType,
    addObject
  } = useWhiteboard();

  const [isShapesOpen, setIsShapesOpen] = useState<boolean>(false);
  const [isGridOpen, setIsGridOpen] = useState<boolean>(false);

  const colors = [
    { label: 'Cyan', hex: '#38bdf8' },
    { label: 'Emerald', hex: '#34d399' },
    { label: 'Amber', hex: '#fbbf24' },
    { label: 'Rose', hex: '#f43f5e' },
    { label: 'Purple', hex: '#a78bfa' },
    { label: 'White', hex: '#f8fafc' },
    { label: 'Dark', hex: '#1e293b' }
  ];

  const handleSelectShape = (shape: any) => {
    setSelectedShapeType(shape);
    setTool('shape');
    setIsShapesOpen(false);
    // Add shape to canvas center
    addObject({
      id: `shape_${Date.now()}`,
      type: 'shape',
      shapeType: shape,
      x: 300,
      y: 200,
      width: shape === 'line' || shape === 'arrow' ? 180 : 140,
      height: shape === 'line' || shape === 'arrow' ? 60 : 100,
      strokeColor: color,
      strokeWidth: 3,
      fillColor: 'transparent',
      revision: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  };

  const handleAddStickyNote = () => {
    addObject({
      id: `sticky_${Date.now()}`,
      type: 'sticky',
      x: 350,
      y: 200,
      width: 220,
      height: 160,
      text: 'Teacher Note:\nImportant mathematical formula or theorem definition...',
      fontSize: 16,
      stickyColor: '#fef08a',
      color: '#713f12',
      revision: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  };

  const handleAddText = () => {
    addObject({
      id: `text_${Date.now()}`,
      type: 'text',
      x: 300,
      y: 220,
      text: 'Theorem 1: In any right-angled triangle...',
      fontSize: 26,
      fontFamily: '"Caveat", cursive',
      color: color,
      handwritingStyle: 'clean_classroom',
      revision: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  };

  return (
    <div className="flex items-center space-x-1.5 bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/80 shadow-2xl">
      {/* Undo / Redo */}
      <div className="flex items-center space-x-0.5 border-r border-slate-700 pr-2">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className={`p-2 rounded-xl transition-colors ${canUndo ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'}`}
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className={`p-2 rounded-xl transition-colors ${canRedo ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'}`}
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Select Tool */}
      <button
        onClick={() => setTool('select')}
        title="Select & Move Objects"
        className={`p-2 rounded-xl transition-all ${tool === 'select' ? 'bg-sky-500 text-slate-900 font-bold shadow-md shadow-sky-500/20' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
      >
        <MousePointer className="w-4 h-4" />
      </button>

      {/* Pen */}
      <button
        onClick={() => setTool('pen')}
        title="Pen (Natural Classroom Writing)"
        className={`p-2 rounded-xl transition-all ${tool === 'pen' ? 'bg-sky-500 text-slate-900 font-bold shadow-md shadow-sky-500/20' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
      >
        <PenTool className="w-4 h-4" />
      </button>

      {/* Pencil */}
      <button
        onClick={() => setTool('pencil')}
        title="Pencil (Fine lines)"
        className={`p-2 rounded-xl transition-all ${tool === 'pencil' ? 'bg-sky-500 text-slate-900 font-bold shadow-md shadow-sky-500/20' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
      >
        <span className="text-sm font-serif">✏️</span>
      </button>

      {/* Highlighter */}
      <button
        onClick={() => setTool('highlighter')}
        title="Highlighter"
        className={`p-2 rounded-xl transition-all ${tool === 'highlighter' ? 'bg-sky-500 text-slate-900 font-bold shadow-md shadow-sky-500/20' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
      >
        <Highlighter className="w-4 h-4" />
      </button>

      {/* Text Tool */}
      <button
        onClick={handleAddText}
        title="Add Neat Handwriting Text"
        className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
      >
        <Type className="w-4 h-4" />
      </button>

      {/* Shapes Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsShapesOpen(!isShapesOpen)}
          title="Geometric Shapes"
          className={`p-2 rounded-xl transition-all ${tool === 'shape' ? 'bg-sky-500 text-slate-900 font-bold shadow-md shadow-sky-500/20' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
        >
          <Square className="w-4 h-4" />
        </button>

        {isShapesOpen && (
          <div className="absolute top-12 left-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 grid grid-cols-3 gap-1 w-44 z-50 animate-in fade-in zoom-in-95">
            {[
              { id: 'rectangle', label: 'Rectangle', icon: <Square className="w-4 h-4" /> },
              { id: 'circle', label: 'Circle', icon: <Circle className="w-4 h-4" /> },
              { id: 'triangle', label: 'Triangle', icon: <Triangle className="w-4 h-4" /> },
              { id: 'arrow', label: 'Arrow', icon: <ArrowRight className="w-4 h-4" /> },
              { id: 'line', label: 'Line', icon: <Minus className="w-4 h-4" /> },
              { id: 'coordinate_plane', label: 'Axes', icon: <span className="font-mono text-xs">XY</span> }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => handleSelectShape(item.id)}
                className="p-2 flex flex-col items-center justify-center rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white text-[10px]"
              >
                {item.icon}
                <span className="mt-1">{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mathematics LaTeX Equation Tool */}
      <button
        onClick={onOpenMathEditor}
        title="Mathematics Equation Editor (KaTeX)"
        className="p-2 rounded-xl text-sky-400 hover:text-sky-300 hover:bg-sky-500/20 border border-sky-500/40 transition-colors"
      >
        <Sigma className="w-4 h-4" />
      </button>

      {/* Sticky Note */}
      <button
        onClick={handleAddStickyNote}
        title="Add Sticky Note"
        className="p-2 rounded-xl text-amber-300 hover:text-amber-200 hover:bg-slate-700 transition-colors"
      >
        <StickyNote className="w-4 h-4" />
      </button>

      {/* Upload PDF & Images */}
      <button
        onClick={onOpenUploadModal}
        title="Upload PDF / Image Annotation"
        className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
      >
        <ImageIcon className="w-4 h-4" />
      </button>

      {/* Laser Pointer */}
      <button
        onClick={() => setTool('laser')}
        title="Laser Pointer (Live Teaching Demonstration)"
        className={`p-2 rounded-xl transition-all ${tool === 'laser' ? 'bg-rose-500 text-white font-bold shadow-md shadow-rose-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
      >
        <Radio className="w-4 h-4 text-rose-400" />
      </button>

      {/* Pan / Move */}
      <button
        onClick={() => setTool('pan')}
        title="Pan Whiteboard (or hold Space)"
        className={`p-2 rounded-xl transition-all ${tool === 'pan' ? 'bg-sky-500 text-slate-900 font-bold shadow-md shadow-sky-500/20' : 'text-slate-300 hover:text-white hover:bg-slate-700'}`}
      >
        <Move className="w-4 h-4" />
      </button>

      <div className="h-5 w-px bg-slate-700 mx-1" />

      {/* Color Palette */}
      <div className="flex items-center space-x-1">
        {colors.map(c => (
          <button
            key={c.hex}
            onClick={() => setColor(c.hex)}
            className={`w-5 h-5 rounded-full border transition-transform ${color === c.hex ? 'scale-125 border-white ring-2 ring-sky-400' : 'border-transparent hover:scale-110'}`}
            style={{ backgroundColor: c.hex }}
            title={c.label}
          />
        ))}
      </div>

      {/* Stroke Width Slider */}
      <div className="flex items-center space-x-2 pl-2 border-l border-slate-700">
        <input
          type="range"
          min="1"
          max="20"
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(parseInt(e.target.value, 10))}
          className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
          title={`Stroke Width: ${strokeWidth}px`}
        />
        <span className="text-[11px] font-mono text-slate-400 w-5">{strokeWidth}p</span>
      </div>

      <div className="h-5 w-px bg-slate-700 mx-1" />

      {/* 1-Click Whiteboard Theme Switcher (Dark Mode vs Classic Whiteboard) */}
      <button
        onClick={() => setBoardTheme(boardTheme === 'light' ? 'dark' : 'light')}
        title={boardTheme === 'light' ? 'Switch to Dark Slate Board' : 'Switch to Classic Whiteboard (White Mode)'}
        className={`p-2 rounded-xl transition-all ${
          boardTheme === 'light'
            ? 'bg-amber-400 text-slate-900 font-bold shadow-md shadow-amber-400/20'
            : 'text-slate-300 hover:text-white hover:bg-slate-700'
        }`}
      >
        {boardTheme === 'light' ? <Sun className="w-4 h-4 text-slate-900" /> : <Moon className="w-4 h-4 text-sky-400" />}
      </button>

      {/* Grid & Theme Selector */}
      <div className="relative">
        <button
          onClick={() => setIsGridOpen(!isGridOpen)}
          title="Canvas Background & Paper Themes"
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <Grid className="w-4 h-4" />
        </button>
        {isGridOpen && (
          <div className="absolute top-12 left-0 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2.5 w-60 z-50 animate-in fade-in zoom-in-95 space-y-2 text-xs">
            {/* Board Theme */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Board Color Theme</span>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { id: 'dark', label: 'Dark Board', icon: '🌙' },
                  { id: 'light', label: 'Whiteboard', icon: '☀️' },
                  { id: 'chalkboard', label: 'Chalkboard', icon: '🌲' },
                  { id: 'cream', label: 'Warm Paper', icon: '📜' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setBoardTheme(t.id as any); }}
                    className={`px-2 py-1.5 rounded-lg text-left transition-colors flex items-center space-x-1.5 ${
                      boardTheme === t.id
                        ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40'
                        : 'text-slate-300 hover:bg-slate-700/60'
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-700" />

            {/* Grid Pattern */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Grid Pattern</span>
              {[
                { id: 'grid', label: 'Square Math Grid' },
                { id: 'coordinate_plane', label: 'Coordinate Plane (X-Y)' },
                { id: 'ruled', label: 'Ruled Lined Sheet' },
                { id: 'dotted', label: 'Dotted Grid' },
                { id: 'blank', label: 'Blank Board' }
              ].map(b => (
                <button
                  key={b.id}
                  onClick={() => { changeBackgroundType(b.id as any); setIsGridOpen(false); }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors ${
                    activePage?.backgroundType === b.id
                      ? 'bg-sky-500/20 text-sky-300 font-bold'
                      : 'text-slate-300 hover:bg-slate-700/60'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Zoom In / Out / Reset */}
      <div className="flex items-center space-x-1 pl-1">
        <button
          onClick={() => setZoom(Math.max(0.3, zoom - 0.15))}
          title="Zoom Out"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={resetView}
          title="Reset Zoom to 100%"
          className="text-[11px] font-mono text-slate-300 px-1 hover:text-sky-400"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => setZoom(Math.min(3.5, zoom + 0.15))}
          title="Zoom In"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
