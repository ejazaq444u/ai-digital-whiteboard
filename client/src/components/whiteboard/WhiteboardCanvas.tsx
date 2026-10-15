import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useWhiteboard, getHandwritingFontFamily } from '../../context/WhiteboardContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { Stroke, Point, WhiteboardObject } from '../../types/whiteboard';
import { drawSmoothStroke, computeBoundingBox } from '../../utils/strokeSmoothing';
import { renderLatexToString } from '../../utils/latexRenderer';

export const WhiteboardCanvas: React.FC = () => {
  const { user } = useAuth();
  const {
    board,
    activePage,
    boardTheme,
    tool,
    color,
    strokeWidth,
    selectedShapeType,
    zoom,
    setZoom,
    panOffset,
    setPanOffset,
    selectedObjectId,
    setSelectedObjectId,
    addObject,
    updateObject,
    deleteObject,
    restoreOriginalStrokes,
    processStrokesForRecognition,
    aiSettings
  } = useWhiteboard();

  const {
    emitDrawStroke,
    emitCommitStroke,
    emitLaserPointer,
    emitCursorMove,
    socket
  } = useSocket();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Drawing state
  const isDrawingRef = useRef<boolean>(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const strokeBatchRef = useRef<Stroke[]>([]);
  const batchTimerRef = useRef<any>(null);

  // Pan state
  const isPanningRef = useRef<boolean>(false);
  const lastPanPointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Laser state
  const laserTrailRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const peerLasersRef = useRef<Map<string, { x: number; y: number; time: number }>>(new Map());

  // Peer strokes in progress
  const peerStrokesRef = useRef<Map<string, { points: Point[]; color: string; width: number }>>(new Map());

  // Dragging/moving selected object
  const isDraggingObjRef = useRef<boolean>(false);
  const dragStartPointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragObjOriginalPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; objectId: string } | null>(null);

  // Resize canvas to container
  const updateCanvasDimensions = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const container = containerRef.current;
    canvasRef.current.width = container.clientWidth * window.devicePixelRatio;
    canvasRef.current.height = container.clientHeight * window.devicePixelRatio;
    renderCanvas();
  }, [activePage, zoom, panOffset, selectedObjectId, boardTheme]);

  useEffect(() => {
    window.addEventListener('resize', updateCanvasDimensions);
    updateCanvasDimensions();
    return () => window.removeEventListener('resize', updateCanvasDimensions);
  }, [updateCanvasDimensions]);

  // Convert screen coordinates to canvas world coordinates
  const screenToWorld = (screenX: number, screenY: number): { x: number; y: number } => {
    if (!canvasRef.current || !containerRef.current) return { x: screenX, y: screenY };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (screenX - rect.left - panOffset.x) / zoom;
    const y = (screenY - rect.top - panOffset.y) / zoom;
    return { x, y };
  };

  // Render Background Patterns
  const renderBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const bgType = activePage?.backgroundType || 'grid';

    // Theme Palette Configuration
    let bgColor = '#0f172a'; // dark default
    let minorLineColor = '#1e293b';
    let majorLineColor = '#334155';
    let ruledLineColor = '#334155';
    let marginLineColor = '#f43f5e33';
    let dotColor = '#475569';
    let axisColor = '#38bdf8';
    let axisTextColor = '#38bdf8';

    if (boardTheme === 'light') {
      bgColor = '#ffffff'; // Crisp dry-erase whiteboard
      minorLineColor = '#f1f5f9';
      majorLineColor = '#cbd5e1';
      ruledLineColor = '#93c5fd';
      marginLineColor = '#f87171';
      dotColor = '#94a3b8';
      axisColor = '#0284c7';
      axisTextColor = '#0369a1';
    } else if (boardTheme === 'chalkboard') {
      bgColor = '#143828'; // Traditional university green chalkboard
      minorLineColor = '#1b4d34';
      majorLineColor = '#2f6a4b';
      ruledLineColor = '#24583d';
      marginLineColor = '#fbbf2455';
      dotColor = '#3d815e';
      axisColor = '#fef08a';
      axisTextColor = '#fef08a';
    } else if (boardTheme === 'cream') {
      bgColor = '#fdfbf7'; // Warm ivory / notebook paper
      minorLineColor = '#edeae1';
      majorLineColor = '#d6d1c4';
      ruledLineColor = '#cbd5e1';
      marginLineColor = '#f87171';
      dotColor = '#b8b5aa';
      axisColor = '#475569';
      axisTextColor = '#334155';
    }

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    const worldWidth = width / zoom + 2000;
    const worldHeight = height / zoom + 2000;
    const startX = -panOffset.x / zoom - 500;
    const startY = -panOffset.y / zoom - 500;

    if (bgType === 'ruled') {
      // Notebook ruled lines
      ctx.strokeStyle = ruledLineColor;
      ctx.lineWidth = 1;
      const lineSpacing = 36;
      const firstLine = Math.floor(startY / lineSpacing) * lineSpacing;
      for (let y = firstLine; y < startY + worldHeight; y += lineSpacing) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + worldWidth, y);
        ctx.stroke();
      }
      // Margin line
      ctx.strokeStyle = marginLineColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(100, startY);
      ctx.lineTo(100, startY + worldHeight);
      ctx.stroke();
    } else if (bgType === 'dotted') {
      // Dotted grid
      ctx.fillStyle = dotColor;
      const dotSpacing = 28;
      const startDotX = Math.floor(startX / dotSpacing) * dotSpacing;
      const startDotY = Math.floor(startY / dotSpacing) * dotSpacing;
      for (let x = startDotX; x < startX + worldWidth; x += dotSpacing) {
        for (let y = startDotY; y < startY + worldHeight; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (bgType === 'grid') {
      // Square math grid paper
      ctx.strokeStyle = minorLineColor;
      ctx.lineWidth = 1;
      const minor = 20;
      const major = 100;
      const firstX = Math.floor(startX / minor) * minor;
      const firstY = Math.floor(startY / minor) * minor;

      // Minor lines
      ctx.beginPath();
      for (let x = firstX; x < startX + worldWidth; x += minor) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, startY + worldHeight);
      }
      for (let y = firstY; y < startY + worldHeight; y += minor) {
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + worldWidth, y);
      }
      ctx.stroke();

      // Major lines
      ctx.strokeStyle = majorLineColor;
      ctx.lineWidth = 1.5;
      const majorX = Math.floor(startX / major) * major;
      const majorY = Math.floor(startY / major) * major;
      ctx.beginPath();
      for (let x = majorX; x < startX + worldWidth; x += major) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, startY + worldHeight);
      }
      for (let y = majorY; y < startY + worldHeight; y += major) {
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + worldWidth, y);
      }
      ctx.stroke();
    } else if (bgType === 'coordinate_plane') {
      // Coordinate plane with centered axes and tick labels
      ctx.strokeStyle = minorLineColor;
      ctx.lineWidth = 1;
      const step = 40;
      const startStepX = Math.floor(startX / step) * step;
      const startStepY = Math.floor(startY / step) * step;
      ctx.beginPath();
      for (let x = startStepX; x < startX + worldWidth; x += step) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, startY + worldHeight);
      }
      for (let y = startStepY; y < startY + worldHeight; y += step) {
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + worldWidth, y);
      }
      ctx.stroke();

      // Main X and Y Axes
      ctx.strokeStyle = axisColor;
      ctx.lineWidth = 2.5;
      // X axis
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX + worldWidth, 0);
      // Y axis
      ctx.moveTo(0, startY);
      ctx.lineTo(0, startY + worldHeight);
      ctx.stroke();

      // Labels and arrows
      ctx.fillStyle = axisTextColor;
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('X', startX + worldWidth - 40, -10);
      ctx.fillText('Y', 10, startY + 40);
      ctx.fillText('(0,0)', 5, 15);
    }

    ctx.restore();
  };

  // Main Render Loop
  const renderCanvas = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Background
    renderBackground(ctx, containerRef.current.clientWidth, containerRef.current.clientHeight);

    // 2. World transformation
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    // Render committed objects
    if (activePage?.objects) {
      for (const obj of activePage.objects) {
        renderObject(ctx, obj);
      }
    }

    // Render peer drawing in progress
    peerStrokesRef.current.forEach((stroke) => {
      drawSmoothStroke(ctx, stroke.points, stroke.color, stroke.width);
    });

    // Render currently drawn stroke
    if (currentStrokeRef.current) {
      drawSmoothStroke(
        ctx,
        currentStrokeRef.current.points,
        currentStrokeRef.current.color,
        currentStrokeRef.current.width,
        currentStrokeRef.current.tool
      );
    }

    // Render laser pointer trails
    renderLaserTrails(ctx);

    ctx.restore(); // restore world transform
    ctx.restore(); // restore dpr
  }, [activePage, zoom, panOffset, selectedObjectId, boardTheme]);

  // Render individual whiteboard object
  const renderObject = (ctx: CanvasRenderingContext2D, obj: WhiteboardObject) => {
    const isSelected = selectedObjectId === obj.id;

    ctx.save();

    if (obj.type === 'stroke' && obj.strokeData) {
      drawSmoothStroke(
        ctx,
        obj.strokeData.points,
        obj.strokeData.color,
        obj.strokeData.width,
        obj.strokeData.tool
      );
    } else if (obj.type === 'text') {
      // Neat Handwriting or Classroom Text
      ctx.font = `${obj.fontSize || 24}px ${obj.fontFamily || '"Caveat", cursive'}`;
      ctx.fillStyle = obj.color || '#f8fafc';
      ctx.textBaseline = 'top';

      const lines = (obj.text || '').split('\n');
      const lineHeight = (obj.fontSize || 24) * 1.35;
      lines.forEach((line, i) => {
        ctx.fillText(line, obj.x, obj.y + i * lineHeight);
      });

      // Small badge if converted
      if (obj.isConverted) {
        ctx.fillStyle = '#10b98133'; // emerald tint
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(obj.x - 4, obj.y - 4, (obj.width || 120) + 8, (lines.length * lineHeight) + 8, 4);
        ctx.stroke();
      }
    } else if (obj.type === 'math') {
      // Mathematics block - Crisp rendered KaTeX notation card
      const width = obj.width || 240;
      const height = obj.height || 64;

      // Card container background
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = isSelected ? '#38bdf8' : '#334155';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.roundRect(obj.x, obj.y, width, height, 8);
      ctx.fill();
      ctx.stroke();

      // Math badge
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(obj.x + 8, obj.y - 10, 48, 18, 4);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText('MATH', obj.x + 16, obj.y + 3);

      // Render math text / LaTeX preview string
      ctx.fillStyle = obj.color || '#f8fafc';
      ctx.font = 'italic 18px "KaTeX_Main", "Times New Roman", serif';
      ctx.textBaseline = 'middle';
      const cleanLatex = (obj.latex || obj.mathExpression || '').replace(/\\begin\{aligned\}|\\end\{aligned\}|\\\\/g, ' ');
      ctx.fillText(cleanLatex, obj.x + 16, obj.y + height / 2 + 2);
    } else if (obj.type === 'shape') {
      // Shapes: rect, circle, triangle, star, line, arrow
      ctx.fillStyle = obj.fillColor || 'transparent';
      ctx.strokeStyle = obj.strokeColor || obj.color || '#38bdf8';
      ctx.lineWidth = obj.strokeWidth || 3;

      const w = obj.width || 120;
      const h = obj.height || 80;

      if (obj.shapeType === 'rectangle') {
        ctx.beginPath();
        ctx.roundRect(obj.x, obj.y, w, h, 6);
        if (obj.fillColor) ctx.fill();
        ctx.stroke();
      } else if (obj.shapeType === 'circle') {
        ctx.beginPath();
        ctx.ellipse(obj.x + w / 2, obj.y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
        if (obj.fillColor) ctx.fill();
        ctx.stroke();
      } else if (obj.shapeType === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(obj.x + w / 2, obj.y);
        ctx.lineTo(obj.x + w, obj.y + h);
        ctx.lineTo(obj.x, obj.y + h);
        ctx.closePath();
        if (obj.fillColor) ctx.fill();
        ctx.stroke();
      } else if (obj.shapeType === 'arrow' || obj.shapeType === 'line') {
        ctx.beginPath();
        ctx.moveTo(obj.x, obj.y);
        ctx.lineTo(obj.x + w, obj.y + h);
        ctx.stroke();
        if (obj.shapeType === 'arrow') {
          // Arrowhead
          const angle = Math.atan2(h, w);
          const arrowLen = 14;
          ctx.beginPath();
          ctx.moveTo(obj.x + w, obj.y + h);
          ctx.lineTo(obj.x + w - arrowLen * Math.cos(angle - Math.PI / 6), obj.y + h - arrowLen * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(obj.x + w, obj.y + h);
          ctx.lineTo(obj.x + w - arrowLen * Math.cos(angle + Math.PI / 6), obj.y + h - arrowLen * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        }
      }
    } else if (obj.type === 'sticky') {
      // Sticky note
      const w = obj.width || 200;
      const h = obj.height || 160;
      ctx.fillStyle = obj.stickyColor || '#fef08a'; // yellow
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.roundRect(obj.x, obj.y, w, h, 6);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Note text
      ctx.fillStyle = obj.color || '#713f12';
      ctx.font = '15px "Patrick Hand", cursive';
      ctx.textBaseline = 'top';
      const lines = (obj.text || '').split('\n');
      lines.forEach((l, idx) => {
        ctx.fillText(l, obj.x + 12, obj.y + 12 + idx * 22);
      });
    }

    // Selection outline & handles
    if (isSelected) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      const w = obj.width || 100;
      const h = obj.height || 40;
      ctx.strokeRect(obj.x - 4, obj.y - 4, w + 8, h + 8);
      ctx.setLineDash([]);
      // Resize handle
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(obj.x + w + 2, obj.y + h + 2, 8, 8);
    }

    ctx.restore();
  };

  // Render Laser Pointer trails
  const renderLaserTrails = (ctx: CanvasRenderingContext2D) => {
    const now = Date.now();
    // Filter old laser points (> 900ms)
    laserTrailRef.current = laserTrailRef.current.filter(p => now - p.time < 900);

    if (laserTrailRef.current.length > 0) {
      ctx.save();
      for (let i = 0; i < laserTrailRef.current.length; i++) {
        const pt = laserTrailRef.current[i];
        const age = (now - pt.time) / 900;
        const radius = Math.max(2, (1 - age) * 8);
        const alpha = Math.max(0, 1 - age);

        ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  // Pointer Event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Left click only or stylus/touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const { x, y } = screenToWorld(e.clientX, e.clientY);

    if (tool === 'pan' || isSpacePressedRef.current || (e.buttons === 4)) {
      isPanningRef.current = true;
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (tool === 'laser') {
      laserTrailRef.current.push({ x, y, time: Date.now() });
      if (board) emitLaserPointer(board.roomCode, x, y, true);
      renderCanvas();
      return;
    }

    if (tool === 'select') {
      // Check hit test on objects
      const hitObj = findObjectAt(x, y);
      if (hitObj) {
        setSelectedObjectId(hitObj.id);
        isDraggingObjRef.current = true;
        dragStartPointRef.current = { x, y };
        dragObjOriginalPosRef.current = { x: hitObj.x, y: hitObj.y };
      } else {
        setSelectedObjectId(null);
      }
      renderCanvas();
      return;
    }

    if (['pen', 'pencil', 'highlighter'].includes(tool)) {
      isDrawingRef.current = true;
      const newStroke: Stroke = {
        id: `str_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        points: [{ x, y, pressure: e.pressure || 0.5, time: Date.now() }],
        color,
        width: strokeWidth,
        tool: tool as any,
        createdAt: Date.now()
      };
      currentStrokeRef.current = newStroke;

      if (board) {
        emitDrawStroke({
          roomCode: board.roomCode,
          point: { x, y, pressure: e.pressure },
          strokeId: newStroke.id,
          color,
          width: strokeWidth,
          isStart: true
        });
      }
      renderCanvas();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { x, y } = screenToWorld(e.clientX, e.clientY);

    // Live cursor tracking
    if (board && Math.random() < 0.25) {
      emitCursorMove(board.roomCode, x, y);
    }

    if (isPanningRef.current) {
      const dx = e.clientX - lastPanPointRef.current.x;
      const dy = e.clientY - lastPanPointRef.current.y;
      setPanOffset({ x: panOffset.x + dx, y: panOffset.y + dy });
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (tool === 'laser' && (e.buttons > 0 || e.pointerType === 'pen')) {
      laserTrailRef.current.push({ x, y, time: Date.now() });
      if (board) emitLaserPointer(board.roomCode, x, y, true);
      renderCanvas();
      return;
    }

    if (isDraggingObjRef.current && selectedObjectId && activePage) {
      const dx = x - dragStartPointRef.current.x;
      const dy = y - dragStartPointRef.current.y;
      const target = activePage.objects.find(o => o.id === selectedObjectId);
      if (target) {
        target.x = dragObjOriginalPosRef.current.x + dx;
        target.y = dragObjOriginalPosRef.current.y + dy;
        updateObject({ ...target });
      }
      return;
    }

    if (isDrawingRef.current && currentStrokeRef.current) {
      const pt: Point = { x, y, pressure: e.pressure || 0.5, time: Date.now() };
      currentStrokeRef.current.points.push(pt);

      if (board) {
        emitDrawStroke({
          roomCode: board.roomCode,
          point: pt,
          strokeId: currentStrokeRef.current.id,
          color,
          width: strokeWidth
        });
      }
      renderCanvas();
    }
  };

  const handlePointerUp = () => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (isDraggingObjRef.current) {
      isDraggingObjRef.current = false;
      return;
    }

    if (isDrawingRef.current && currentStrokeRef.current) {
      isDrawingRef.current = false;
      const completedStroke = currentStrokeRef.current;
      completedStroke.boundingBox = computeBoundingBox(completedStroke.points);

      // Save committed stroke as object
      const strokeObj: WhiteboardObject = {
        id: completedStroke.id,
        type: 'stroke',
        x: completedStroke.boundingBox.minX,
        y: completedStroke.boundingBox.minY,
        strokeData: completedStroke,
        revision: 1,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      addObject(strokeObj);

      if (board && activePage) {
        emitCommitStroke(board.roomCode, activePage.id, completedStroke);
      }

      currentStrokeRef.current = null;

      // Group strokes and schedule AI Handwriting Recognition if enabled
      if (aiSettings.mode !== 'OFF') {
        strokeBatchRef.current.push(completedStroke);

        if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
        // Debounce: trigger recognition after pause in natural writing (e.g. 1.2s pause)
        batchTimerRef.current = setTimeout(() => {
          if (strokeBatchRef.current.length > 0) {
            const strokesToProcess = [...strokeBatchRef.current];
            strokeBatchRef.current = [];
            processStrokesForRecognition(strokesToProcess);
          }
        }, 1200);
      }

      renderCanvas();
    }
  };

  // Hit testing for selection
  const findObjectAt = (x: number, y: number): WhiteboardObject | null => {
    if (!activePage?.objects) return null;
    // Iterate in reverse for topmost object
    for (let i = activePage.objects.length - 1; i >= 0; i--) {
      const obj = activePage.objects[i];
      const w = obj.width || 120;
      const h = obj.height || 40;
      if (x >= obj.x && x <= obj.x + w && y >= obj.y && y <= obj.y + h) {
        return obj;
      }
    }
    return null;
  };

  // Zoom with mouse wheel
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.25), 4.0);
      setZoom(newZoom);
    } else {
      // Pan
      setPanOffset({
        x: panOffset.x - e.deltaX,
        y: panOffset.y - e.deltaY
      });
    }
  };

  // Keyboard listeners for Spacebar Pan
  const isSpacePressedRef = useRef<boolean>(false);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        isSpacePressedRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Right-click context menu (Restore original handwriting, delete, duplicate)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    const hit = findObjectAt(x, y);
    if (hit) {
      setSelectedObjectId(hit.id);
      setContextMenu({ x: e.clientX, y: e.clientY, objectId: hit.id });
    } else {
      setContextMenu(null);
    }
  };

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full w-full overflow-hidden bg-slate-900 select-none cursor-crosshair"
      onContextMenu={handleContextMenu}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      />

      {/* Context Menu for Converted Elements */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg shadow-2xl py-1.5 w-60 text-sm animate-in fade-in zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={() => setContextMenu(null)}
        >
          {activePage?.objects.find(o => o.id === contextMenu.objectId)?.isConverted && (
            <button
              onClick={() => restoreOriginalStrokes(contextMenu.objectId)}
              className="w-full text-left px-3.5 py-2 hover:bg-slate-700 text-amber-400 flex items-center space-x-2 font-medium"
            >
              <span>↺</span>
              <span>Restore Original Handwriting</span>
            </button>
          )}
          <button
            onClick={() => deleteObject(contextMenu.objectId)}
            className="w-full text-left px-3.5 py-2 hover:bg-slate-700 text-rose-400 flex items-center space-x-2"
          >
            <span>🗑</span>
            <span>Delete Object</span>
          </button>
        </div>
      )}
    </div>
  );
};
