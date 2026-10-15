import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { LiveParticipant, Stroke, WhiteboardObject } from '../types/whiteboard';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  participants: LiveParticipant[];
  joinRoom: (roomCode: string, name?: string, role?: 'teacher' | 'student') => void;
  leaveRoom: () => void;
  emitDrawStroke: (data: { roomCode: string; point: { x: number; y: number; pressure?: number }; strokeId: string; color: string; width: number; isStart?: boolean }) => void;
  emitCommitStroke: (roomCode: string, pageId: string, stroke: Stroke) => void;
  emitCreateObject: (roomCode: string, pageId: string, object: WhiteboardObject, removeStrokeIds?: string[]) => void;
  emitUpdateObject: (roomCode: string, pageId: string, object: WhiteboardObject) => void;
  emitDeleteObject: (roomCode: string, pageId: string, objectId: string) => void;
  emitRestoreOriginalStrokes: (roomCode: string, pageId: string, objectId: string, originalStrokes: Stroke[]) => void;
  emitLaserPointer: (roomCode: string, x: number, y: number, active: boolean) => void;
  emitCursorMove: (roomCode: string, x: number, y: number) => void;
  emitChangePage: (roomCode: string, activePageIndex: number) => void;
  emitUpdatePermissions: (roomCode: string, permissions: any) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);

  useEffect(() => {
    const s = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => {
      setIsConnected(true);
      console.log('[Socket] Connected to server:', s.id);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
      console.log('[Socket] Disconnected from server');
    });

    s.on('participants_updated', (list: LiveParticipant[]) => {
      setParticipants(list);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const joinRoom = (roomCode: string, name?: string, role?: 'teacher' | 'student') => {
    if (!socket) return;
    const userName = name || user?.name || (role === 'teacher' ? 'Teacher' : 'Student');
    const userRole = role || user?.role || 'student';
    const userId = user?.id || `anon_${Date.now()}`;

    setCurrentRoomCode(roomCode);
    socket.emit('join_room', {
      roomCode,
      userId,
      name: userName,
      role: userRole
    });
  };

  const leaveRoom = () => {
    if (!socket || !currentRoomCode) return;
    socket.emit('leave_room', { roomCode: currentRoomCode });
    setCurrentRoomCode(null);
    setParticipants([]);
  };

  const emitDrawStroke = (data: { roomCode: string; point: { x: number; y: number; pressure?: number }; strokeId: string; color: string; width: number; isStart?: boolean }) => {
    if (!socket || !isConnected) return;
    socket.emit('draw_stroke_stream', data);
  };

  const emitCommitStroke = (roomCode: string, pageId: string, stroke: Stroke) => {
    if (!socket || !isConnected) return;
    socket.emit('commit_stroke', { roomCode, pageId, stroke });
  };

  const emitCreateObject = (roomCode: string, pageId: string, object: WhiteboardObject, removeStrokeIds?: string[]) => {
    if (!socket || !isConnected) return;
    socket.emit('create_object', { roomCode, pageId, object, removeStrokeIds });
  };

  const emitUpdateObject = (roomCode: string, pageId: string, object: WhiteboardObject) => {
    if (!socket || !isConnected) return;
    socket.emit('update_object', { roomCode, pageId, object });
  };

  const emitDeleteObject = (roomCode: string, pageId: string, objectId: string) => {
    if (!socket || !isConnected) return;
    socket.emit('delete_object', { roomCode, pageId, objectId });
  };

  const emitRestoreOriginalStrokes = (roomCode: string, pageId: string, objectId: string, originalStrokes: Stroke[]) => {
    if (!socket || !isConnected) return;
    socket.emit('restore_original_strokes', { roomCode, pageId, objectId, originalStrokes });
  };

  const emitLaserPointer = (roomCode: string, x: number, y: number, active: boolean) => {
    if (!socket || !isConnected) return;
    socket.emit('laser_pointer', { roomCode, x, y, active });
  };

  const emitCursorMove = (roomCode: string, x: number, y: number) => {
    if (!socket || !isConnected) return;
    socket.emit('cursor_move', { roomCode, x, y });
  };

  const emitChangePage = (roomCode: string, activePageIndex: number) => {
    if (!socket || !isConnected) return;
    socket.emit('change_page', { roomCode, activePageIndex });
  };

  const emitUpdatePermissions = (roomCode: string, permissions: any) => {
    if (!socket || !isConnected) return;
    socket.emit('update_permissions', { roomCode, permissions });
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        participants,
        joinRoom,
        leaveRoom,
        emitDrawStroke,
        emitCommitStroke,
        emitCreateObject,
        emitUpdateObject,
        emitDeleteObject,
        emitRestoreOriginalStrokes,
        emitLaserPointer,
        emitCursorMove,
        emitChangePage,
        emitUpdatePermissions
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
