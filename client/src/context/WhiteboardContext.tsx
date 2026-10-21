import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  WhiteboardDocument,
  WhiteboardPage,
  WhiteboardObject,
  Stroke,
  ToolType,
  ContentType,
  BoardTheme,
  AiCorrectionMode,
  WhiteboardAiSettings,
  PendingSuggestion,
  RecognitionResult,
  HandwritingFontStyle
} from '../types/whiteboard';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { ClientLocalAiParser } from '../utils/localAiParser';

interface WhiteboardContextType {
  board: WhiteboardDocument | null;
  setBoard: React.Dispatch<React.SetStateAction<WhiteboardDocument | null>>;
  activePage: WhiteboardPage | null;
  activePageIndex: number;
  // Theme
  boardTheme: BoardTheme;
  setBoardTheme: (theme: BoardTheme) => void;
  // Tools & Styling
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  color: string;
  setColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  selectedShapeType: 'rectangle' | 'circle' | 'triangle' | 'star' | 'line' | 'arrow' | 'coordinate_plane';
  setSelectedShapeType: (shape: 'rectangle' | 'circle' | 'triangle' | 'star' | 'line' | 'arrow' | 'coordinate_plane') => void;
  // Canvas Viewport
  zoom: number;
  setZoom: (zoom: number) => void;
  panOffset: { x: number; y: number };
  setPanOffset: (offset: { x: number; y: number }) => void;
  resetView: () => void;
  // Selection
  selectedObjectId: string | null;
  setSelectedObjectId: (id: string | null) => void;
  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // AI Handwriting Recognition & Correction
  aiSettings: WhiteboardAiSettings;
  updateAiSettings: (settings: Partial<WhiteboardAiSettings>) => void;
  aiStatus: 'idle' | 'writing' | 'recognizing' | 'ready' | 'auto_fixed' | 'uncertain' | 'offline';
  pendingSuggestion: PendingSuggestion | null;
  processStrokesForRecognition: (strokes: Stroke[], hintType?: ContentType, imageBase64?: string) => Promise<void>;
  acceptSuggestion: (suggestion: PendingSuggestion, overrideText?: string, style?: HandwritingFontStyle) => void;
  rejectSuggestion: () => void;
  restoreOriginalStrokes: (objectId: string) => void;
  // Page operations
  addPage: (title?: string) => void;
  deletePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  renamePage: (pageId: string, title: string) => void;
  changeBackgroundType: (type: 'blank' | 'ruled' | 'dotted' | 'grid' | 'coordinate_plane') => void;
  switchPage: (index: number) => void;
  // Object CRUD
  addObject: (obj: WhiteboardObject) => void;
  updateObject: (obj: WhiteboardObject) => void;
  deleteObject: (id: string) => void;
  saveBoard: () => Promise<void>;
  isSaving: boolean;
  lastSavedAt: string | null;
}

const defaultAiSettings: WhiteboardAiSettings = {
  mode: 'SUGGEST',
  englishEnabled: true,
  mathEnabled: true,
  englishCorrectionLevel: 'grammar_punctuation',
  mathOutputStyle: 'neat_notation',
  defaultHandwritingStyle: 'clean_classroom',
  threshold: 'balanced',
  autoFixDelayMs: 1500,
  autoDetectType: true
};

const WhiteboardContext = createContext<WhiteboardContextType | undefined>(undefined);

export const WhiteboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const {
    socket,
    emitCommitStroke,
    emitCreateObject,
    emitUpdateObject,
    emitDeleteObject,
    emitRestoreOriginalStrokes,
    emitChangePage
  } = useSocket();

  const [board, setBoard] = useState<WhiteboardDocument | null>(null);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  // Theme
  const [boardTheme, setBoardThemeState] = useState<BoardTheme>(() => {
    return (localStorage.getItem('board_theme') as BoardTheme) || 'dark';
  });

  const setBoardTheme = (theme: BoardTheme) => {
    setBoardThemeState(theme);
    localStorage.setItem('board_theme', theme);
    if ((theme === 'light' || theme === 'cream') && (color === '#f8fafc' || color === '#38bdf8')) {
      setColor('#0f172a');
    } else if ((theme === 'dark' || theme === 'chalkboard') && (color === '#0f172a' || color === '#1e293b')) {
      setColor('#38bdf8');
    }
  };

  // Tools & Styling
  const [tool, setTool] = useState<ToolType>('pen');
  const [color, setColor] = useState<string>(() => {
    const savedTheme = localStorage.getItem('board_theme');
    return (savedTheme === 'light' || savedTheme === 'cream') ? '#0f172a' : '#38bdf8';
  });
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [selectedShapeType, setSelectedShapeType] = useState<'rectangle' | 'circle' | 'triangle' | 'star' | 'line' | 'arrow' | 'coordinate_plane'>('rectangle');

  // Canvas Viewport
  const [zoom, setZoom] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Selected Object
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  // Undo / Redo history
  const [undoStack, setUndoStack] = useState<WhiteboardObject[][]>([]);
  const [redoStack, setRedoStack] = useState<WhiteboardObject[][]>([]);

  // AI Recognition State
  const [aiSettings, setAiSettings] = useState<WhiteboardAiSettings>(defaultAiSettings);
  const [aiStatus, setAiStatus] = useState<'idle' | 'writing' | 'recognizing' | 'ready' | 'auto_fixed' | 'uncertain' | 'offline'>('idle');
  const [pendingSuggestion, setPendingSuggestion] = useState<PendingSuggestion | null>(null);
  const autoFixTimerRef = useRef<any>(null);

  // Persistence
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Active Page accessor
  const activePage = board?.pages[activePageIndex] || null;

  // Sync settings when board loads
  useEffect(() => {
    if (board?.settings) {
      setAiSettings(board.settings);
    }
    if (board?.activePageIndex !== undefined) {
      setActivePageIndex(board.activePageIndex);
    }
  }, [board?.id]);

  // Socket event listeners for peer updates
  useEffect(() => {
    if (!socket) return;

    const handleRoomJoined = (data: { roomCode: string; board: WhiteboardDocument }) => {
      if (data.board) {
        setBoard(data.board);
        if (data.board.activePageIndex !== undefined) {
          setActivePageIndex(data.board.activePageIndex);
        }
      }
    };

    const handlePeerCommitStroke = (data: { pageId: string; stroke: Stroke }) => {
      setBoard(prev => {
        if (!prev) return prev;
        const pages = prev.pages.map(page => {
          if (page.id === data.pageId) {
            const strokeObj: WhiteboardObject = {
              id: data.stroke.id,
              type: 'stroke',
              x: data.stroke.boundingBox?.minX || 0,
              y: data.stroke.boundingBox?.minY || 0,
              strokeData: data.stroke,
              revision: 1,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            return { ...page, objects: [...page.objects, strokeObj] };
          }
          return page;
        });
        return { ...prev, pages };
      });
    };

    const handlePeerCreateObject = (data: { pageId: string; object: WhiteboardObject; removeStrokeIds?: string[] }) => {
      setBoard(prev => {
        if (!prev) return prev;
        const pages = prev.pages.map(page => {
          if (page.id === data.pageId) {
            let filtered = page.objects;
            if (data.removeStrokeIds && data.removeStrokeIds.length > 0) {
              filtered = filtered.filter(o => !data.removeStrokeIds!.includes(o.id));
            }
            return { ...page, objects: [...filtered, data.object] };
          }
          return page;
        });
        return { ...prev, pages };
      });
    };

    const handlePeerUpdateObject = (data: { pageId: string; object: WhiteboardObject }) => {
      setBoard(prev => {
        if (!prev) return prev;
        const pages = prev.pages.map(page => {
          if (page.id === data.pageId) {
            const updated = page.objects.map(o => o.id === data.object.id ? data.object : o);
            return { ...page, objects: updated };
          }
          return page;
        });
        return { ...prev, pages };
      });
    };

    const handlePeerDeleteObject = (data: { pageId: string; objectId: string }) => {
      setBoard(prev => {
        if (!prev) return prev;
        const pages = prev.pages.map(page => {
          if (page.id === data.pageId) {
            return { ...page, objects: page.objects.filter(o => o.id !== data.objectId) };
          }
          return page;
        });
        return { ...prev, pages };
      });
    };

    const handlePeerRestoreOriginalStrokes = (data: { pageId: string; objectId: string; originalStrokes: Stroke[] }) => {
      setBoard(prev => {
        if (!prev) return prev;
        const pages = prev.pages.map(page => {
          if (page.id === data.pageId) {
            const withoutObj = page.objects.filter(o => o.id !== data.objectId);
            const restoredObjs: WhiteboardObject[] = data.originalStrokes.map(s => ({
              id: s.id,
              type: 'stroke',
              x: s.boundingBox?.minX || 0,
              y: s.boundingBox?.minY || 0,
              strokeData: s,
              revision: 1,
              createdAt: Date.now(),
              updatedAt: Date.now()
            }));
            return { ...page, objects: [...withoutObj, ...restoredObjs] };
          }
          return page;
        });
        return { ...prev, pages };
      });
    };

    const handlePeerChangePage = (data: { activePageIndex: number }) => {
      setActivePageIndex(data.activePageIndex);
    };

    socket.on('room_joined', handleRoomJoined);
    socket.on('peer_commit_stroke', handlePeerCommitStroke);
    socket.on('peer_create_object', handlePeerCreateObject);
    socket.on('peer_update_object', handlePeerUpdateObject);
    socket.on('peer_delete_object', handlePeerDeleteObject);
    socket.on('peer_restore_original_strokes', handlePeerRestoreOriginalStrokes);
    socket.on('peer_change_page', handlePeerChangePage);

    return () => {
      socket.off('room_joined', handleRoomJoined);
      socket.off('peer_commit_stroke', handlePeerCommitStroke);
      socket.off('peer_create_object', handlePeerCreateObject);
      socket.off('peer_update_object', handlePeerUpdateObject);
      socket.off('peer_delete_object', handlePeerDeleteObject);
      socket.off('peer_restore_original_strokes', handlePeerRestoreOriginalStrokes);
      socket.off('peer_change_page', handlePeerChangePage);
    };
  }, [socket]);

  // Snapshot active page state for undo history
  const pushToUndoStack = () => {
    if (!activePage) return;
    setUndoStack(prev => [...prev.slice(-30), [...activePage.objects]]);
    setRedoStack([]);
  };

  const undo = () => {
    if (undoStack.length === 0 || !activePage) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, prev.length - 1));
    setRedoStack(prev => [...prev, [...activePage.objects]]);

    setBoard(prev => {
      if (!prev) return prev;
      const pages = [...prev.pages];
      pages[activePageIndex] = { ...pages[activePageIndex], objects: previous };
      return { ...prev, pages };
    });
  };

  const redo = () => {
    if (redoStack.length === 0 || !activePage) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, prev.length - 1));
    setUndoStack(prev => [...prev, [...activePage.objects]]);

    setBoard(prev => {
      if (!prev) return prev;
      const pages = [...prev.pages];
      pages[activePageIndex] = { ...pages[activePageIndex], objects: next };
      return { ...prev, pages };
    });
  };

  const resetView = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  const updateAiSettings = (newSettings: Partial<WhiteboardAiSettings>) => {
    setAiSettings(prev => {
      const merged = { ...prev, ...newSettings };
      if (board) {
        setBoard(b => b ? { ...b, settings: merged } : b);
      }
      return merged;
    });
  };

  // AI Recognition & Correction Workflow
  const processStrokesForRecognition = async (
    strokes: Stroke[],
    hintType?: ContentType,
    imageBase64?: string
  ) => {
    if (aiSettings.mode === 'OFF' || strokes.length === 0) return;

    setAiStatus('recognizing');

    let res: RecognitionResult | null = null;

    try {
      const response = await fetch('/api/ai/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strokes,
          imageBase64,
          hintType,
          settings: aiSettings
        })
      });

      if (response.ok) {
        const data = await response.json();
        res = data.result;
      }
    } catch (err) {
      console.warn('[AI Server not reached, using client-side local recognition]:', err);
    }

    // Fallback to client-side local parser (for Hostinger or offline static deployment)
    if (!res) {
      res = ClientLocalAiParser.parseStrokes(strokes, aiSettings);
    }

    if (!res) {
      setAiStatus('uncertain');
      return;
    }

    const suggestion: PendingSuggestion = {
      result: res,
      strokes: strokes
    };

    setPendingSuggestion(suggestion);

      // Check if eligible for AUTO-FIX
      const thresholdScore = aiSettings.threshold === 'conservative' ? 0.88 : aiSettings.threshold === 'aggressive' ? 0.65 : 0.78;
      const canAutoFix = aiSettings.mode === 'AUTO-FIX' && res.confidence >= thresholdScore && !res.isAmbiguous;

      if (canAutoFix) {
        setAiStatus('auto_fixed');
        // Auto-fix after delay while showing countdown
        if (autoFixTimerRef.current) clearTimeout(autoFixTimerRef.current);
        autoFixTimerRef.current = setTimeout(() => {
          acceptSuggestion(suggestion);
        }, aiSettings.autoFixDelayMs || 1500);
      } else {
        setAiStatus('ready');
      }
  };

  // Accept Suggestion Non-destructively
  const acceptSuggestion = (
    suggestion: PendingSuggestion,
    overrideText?: string,
    style?: HandwritingFontStyle
  ) => {
    if (autoFixTimerRef.current) {
      clearTimeout(autoFixTimerRef.current);
      autoFixTimerRef.current = null;
    }

    if (!activePage || !board) return;

    pushToUndoStack();

    const { result, strokes } = suggestion;
    const chosenStyle = style || result.suggestedHandwritingStyle || aiSettings.defaultHandwritingStyle;
    const removeStrokeIds = strokes.map(s => s.id);

    const isMath = result.detectedType === 'mathematics';
    const textContent = overrideText || (isMath ? result.latex || result.correctedText : result.correctedText);

    // Create neat converted object
    const convertedObject: WhiteboardObject = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: isMath ? 'math' : 'text',
      x: result.boundingBox.minX,
      y: result.boundingBox.minY,
      width: Math.max(result.boundingBox.width, 160),
      height: Math.max(result.boundingBox.height, 45),
      text: isMath ? undefined : textContent,
      latex: isMath ? textContent : undefined,
      fontFamily: isMath ? undefined : getHandwritingFontFamily(chosenStyle),
      fontSize: 24,
      color: strokes[0]?.color || color,
      // Metadata preserving original raw strokes!
      isConverted: true,
      originalStrokes: strokes,
      confidence: result.confidence,
      conversionType: result.detectedType,
      rawRecognizedText: result.rawText,
      handwritingStyle: chosenStyle,
      revision: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Update active page
    setBoard(prev => {
      if (!prev) return prev;
      const pages = prev.pages.map(page => {
        if (page.id === activePage.id) {
          const remaining = page.objects.filter(o => !removeStrokeIds.includes(o.id));
          return { ...page, objects: [...remaining, convertedObject] };
        }
        return page;
      });
      return { ...prev, pages };
    });

    // Notify room via socket
    emitCreateObject(board.roomCode, activePage.id, convertedObject, removeStrokeIds);

    setPendingSuggestion(null);
    setAiStatus('idle');
  };

  const rejectSuggestion = () => {
    if (autoFixTimerRef.current) {
      clearTimeout(autoFixTimerRef.current);
      autoFixTimerRef.current = null;
    }
    setPendingSuggestion(null);
    setAiStatus('idle');
  };

  // Restore Original Handwriting (Section 8 requirement)
  const restoreOriginalStrokes = (objectId: string) => {
    if (!activePage || !board) return;
    const targetObj = activePage.objects.find(o => o.id === objectId);
    if (!targetObj || !targetObj.originalStrokes || targetObj.originalStrokes.length === 0) return;

    pushToUndoStack();

    const originalStrokes = targetObj.originalStrokes;

    setBoard(prev => {
      if (!prev) return prev;
      const pages = prev.pages.map(page => {
        if (page.id === activePage.id) {
          const withoutObj = page.objects.filter(o => o.id !== objectId);
          const restored = originalStrokes.map(s => ({
            id: s.id,
            type: 'stroke' as const,
            x: s.boundingBox?.minX || 0,
            y: s.boundingBox?.minY || 0,
            strokeData: s,
            revision: 1,
            createdAt: Date.now(),
            updatedAt: Date.now()
          }));
          return { ...page, objects: [...withoutObj, ...restored] };
        }
        return page;
      });
      return { ...prev, pages };
    });

    emitRestoreOriginalStrokes(board.roomCode, activePage.id, objectId, originalStrokes);
  };

  // Page Operations
  const addPage = (title?: string) => {
    if (!board) return;
    const newPage: WhiteboardPage = {
      id: `page_${Date.now()}`,
      title: title || `Page ${board.pages.length + 1}`,
      backgroundType: activePage?.backgroundType || 'grid',
      objects: [],
      order: board.pages.length,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const nextIndex = board.pages.length;
    setBoard(prev => prev ? { ...prev, pages: [...prev.pages, newPage], activePageIndex: nextIndex } : prev);
    setActivePageIndex(nextIndex);
    emitChangePage(board.roomCode, nextIndex);
  };

  const deletePage = (pageId: string) => {
    if (!board || board.pages.length <= 1) return;
    const remaining = board.pages.filter(p => p.id !== pageId);
    const newIndex = Math.min(activePageIndex, remaining.length - 1);
    setBoard(prev => prev ? { ...prev, pages: remaining, activePageIndex: newIndex } : prev);
    setActivePageIndex(newIndex);
    emitChangePage(board.roomCode, newIndex);
  };

  const duplicatePage = (pageId: string) => {
    if (!board) return;
    const target = board.pages.find(p => p.id === pageId);
    if (!target) return;
    const cloned: WhiteboardPage = {
      ...target,
      id: `page_${Date.now()}_copy`,
      title: `${target.title} (Copy)`,
      order: board.pages.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      objects: target.objects.map(o => ({ ...o, id: `${o.id}_copy_${Date.now()}` }))
    };
    const nextIndex = board.pages.length;
    setBoard(prev => prev ? { ...prev, pages: [...prev.pages, cloned], activePageIndex: nextIndex } : prev);
    setActivePageIndex(nextIndex);
    emitChangePage(board.roomCode, nextIndex);
  };

  const renamePage = (pageId: string, title: string) => {
    setBoard(prev => {
      if (!prev) return prev;
      const pages = prev.pages.map(p => p.id === pageId ? { ...p, title } : p);
      return { ...prev, pages };
    });
  };

  const changeBackgroundType = (type: 'blank' | 'ruled' | 'dotted' | 'grid' | 'coordinate_plane') => {
    if (!activePage) return;
    setBoard(prev => {
      if (!prev) return prev;
      const pages = prev.pages.map(p => p.id === activePage.id ? { ...p, backgroundType: type } : p);
      return { ...prev, pages };
    });
  };

  const switchPage = (index: number) => {
    if (!board || index < 0 || index >= board.pages.length) return;
    setActivePageIndex(index);
    emitChangePage(board.roomCode, index);
  };

  // Object Operations
  const addObject = (obj: WhiteboardObject) => {
    if (!activePage || !board) return;
    pushToUndoStack();
    setBoard(prev => {
      if (!prev) return prev;
      const pages = prev.pages.map(p => p.id === activePage.id ? { ...p, objects: [...p.objects, obj] } : p);
      return { ...prev, pages };
    });
    if (obj.type === 'stroke' && obj.strokeData) {
      emitCommitStroke(board.roomCode, activePage.id, obj.strokeData);
    } else {
      emitCreateObject(board.roomCode, activePage.id, obj);
    }
  };

  const updateObject = (obj: WhiteboardObject) => {
    if (!activePage || !board) return;
    setBoard(prev => {
      if (!prev) return prev;
      const pages = prev.pages.map(p => {
        if (p.id === activePage.id) {
          return { ...p, objects: p.objects.map(item => item.id === obj.id ? obj : item) };
        }
        return p;
      });
      return { ...prev, pages };
    });
    emitUpdateObject(board.roomCode, activePage.id, obj);
  };

  const deleteObject = (id: string) => {
    if (!activePage || !board) return;
    pushToUndoStack();
    setBoard(prev => {
      if (!prev) return prev;
      const pages = prev.pages.map(p => {
        if (p.id === activePage.id) {
          return { ...p, objects: p.objects.filter(item => item.id !== id) };
        }
        return p;
      });
      return { ...prev, pages };
    });
    emitDeleteObject(board.roomCode, activePage.id, id);
    if (selectedObjectId === id) setSelectedObjectId(null);
  };

  // Save Whiteboard to localStorage & backend
  const saveBoard = async () => {
    if (!board) return;
    setIsSaving(true);

    // Save to localStorage immediately (works on Hostinger static hosting!)
    try {
      const saved: WhiteboardDocument[] = JSON.parse(localStorage.getItem('saved_boards') || '[]');
      const index = saved.findIndex(b => b.id === board.id);
      if (index >= 0) {
        saved[index] = board;
      } else {
        saved.unshift(board);
      }
      localStorage.setItem('saved_boards', JSON.stringify(saved));
      setLastSavedAt(new Date().toLocaleTimeString());
    } catch (e) {}

    try {
      const res = await fetch(`/api/whiteboards/${board.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(board)
      });
      if (res.ok) {
        setLastSavedAt(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.warn('Backend unavailable, board saved to local storage');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <WhiteboardContext.Provider
      value={{
        board,
        setBoard,
        activePage,
        activePageIndex,
        boardTheme,
        setBoardTheme,
        tool,
        setTool,
        color,
        setColor,
        strokeWidth,
        setStrokeWidth,
        selectedShapeType,
        setSelectedShapeType,
        zoom,
        setZoom,
        panOffset,
        setPanOffset,
        resetView,
        selectedObjectId,
        setSelectedObjectId,
        undo,
        redo,
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        aiSettings,
        updateAiSettings,
        aiStatus,
        pendingSuggestion,
        processStrokesForRecognition,
        acceptSuggestion,
        rejectSuggestion,
        restoreOriginalStrokes,
        addPage,
        deletePage,
        duplicatePage,
        renamePage,
        changeBackgroundType,
        switchPage,
        addObject,
        updateObject,
        deleteObject,
        saveBoard,
        isSaving,
        lastSavedAt
      }}
    >
      {children}
    </WhiteboardContext.Provider>
  );
};

export function getHandwritingFontFamily(style?: HandwritingFontStyle): string {
  switch (style) {
    case 'neat_student':
      return '"Patrick Hand", cursive';
    case 'clean_classroom':
      return '"Caveat", cursive';
    case 'simple_cursive':
      return '"Cedarville Cursive", cursive';
    case 'neat_print':
      return '"Architects Daughter", cursive';
    default:
      return '"Caveat", cursive';
  }
}

export const useWhiteboard = () => {
  const context = useContext(WhiteboardContext);
  if (!context) throw new Error('useWhiteboard must be used within a WhiteboardProvider');
  return context;
};
