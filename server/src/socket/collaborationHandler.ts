import { Server, Socket } from 'socket.io';
import { storageService } from '../services/storageService';
import { Stroke, WhiteboardObject } from '../types';

interface Participant {
  socketId: string;
  userId: string;
  name: string;
  role: 'teacher' | 'student';
  roomCode: string;
  cursor?: { x: number; y: number };
}

export class CollaborationHandler {
  private io: Server;
  private participants: Map<string, Participant> = new Map(); // socketId -> Participant

  constructor(io: Server) {
    this.io = io;
    this.setupListeners();
  }

  private setupListeners() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[Socket] Client connected: ${socket.id}`);

      // 1. Join Room
      socket.on('join_room', async (data: { roomCode: string; userId: string; name: string; role: 'teacher' | 'student' }) => {
        const { roomCode, userId, name, role } = data;
        const normalizedCode = roomCode.toUpperCase().trim();

        socket.join(normalizedCode);
        const participant: Participant = {
          socketId: socket.id,
          userId,
          name: name || (role === 'teacher' ? 'Teacher' : 'Student'),
          role: role || 'student',
          roomCode: normalizedCode
        };
        this.participants.set(socket.id, participant);

        // Fetch current board
        const board = await storageService.getWhiteboardByRoomCode(normalizedCode);

        // Notify client of successful join with current board
        socket.emit('room_joined', {
          roomCode: normalizedCode,
          participant,
          board
        });

        // Broadcast participant list to room
        this.broadcastRoomParticipants(normalizedCode);
        console.log(`[Socket] ${name} (${role}) joined room ${normalizedCode}`);
      });

      // 2. Real-time Stroke Drawing (streaming points)
      socket.on('draw_stroke_stream', (data: { roomCode: string; point: { x: number; y: number; pressure?: number }; strokeId: string; color: string; width: number; isStart?: boolean }) => {
        socket.to(data.roomCode).emit('peer_draw_stroke_stream', {
          ...data,
          fromSocketId: socket.id
        });
      });

      // 3. Commit Stroke
      socket.on('commit_stroke', async (data: { roomCode: string; pageId: string; stroke: Stroke }) => {
        const { roomCode, pageId, stroke } = data;
        // Broadcast to others
        socket.to(roomCode).emit('peer_commit_stroke', { pageId, stroke });

        // Persist to storage
        const board = await storageService.getWhiteboardByRoomCode(roomCode);
        if (board) {
          const page = board.pages.find(p => p.id === pageId) || board.pages[board.activePageIndex];
          if (page) {
            const strokeObj: WhiteboardObject = {
              id: stroke.id,
              type: 'stroke',
              x: stroke.boundingBox?.minX || 0,
              y: stroke.boundingBox?.minY || 0,
              strokeData: stroke,
              revision: 1,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            page.objects.push(strokeObj);
            page.updatedAt = Date.now();
            await storageService.saveWhiteboard(board);
          }
        }
      });

      // 4. Create Object (Math formula, neat handwriting, shape, sticky note)
      socket.on('create_object', async (data: { roomCode: string; pageId: string; object: WhiteboardObject; removeStrokeIds?: string[] }) => {
        const { roomCode, pageId, object, removeStrokeIds } = data;
        socket.to(roomCode).emit('peer_create_object', { pageId, object, removeStrokeIds });

        const board = await storageService.getWhiteboardByRoomCode(roomCode);
        if (board) {
          const page = board.pages.find(p => p.id === pageId) || board.pages[board.activePageIndex];
          if (page) {
            if (removeStrokeIds && removeStrokeIds.length > 0) {
              page.objects = page.objects.filter(obj => !removeStrokeIds.includes(obj.id));
            }
            page.objects.push(object);
            page.updatedAt = Date.now();
            await storageService.saveWhiteboard(board);
          }
        }
      });

      // 5. Update Object (Move, Resize, Change text/LaTeX)
      socket.on('update_object', async (data: { roomCode: string; pageId: string; object: WhiteboardObject }) => {
        const { roomCode, pageId, object } = data;
        socket.to(roomCode).emit('peer_update_object', { pageId, object });

        const board = await storageService.getWhiteboardByRoomCode(roomCode);
        if (board) {
          const page = board.pages.find(p => p.id === pageId) || board.pages[board.activePageIndex];
          if (page) {
            const idx = page.objects.findIndex(o => o.id === object.id);
            if (idx !== -1) {
              page.objects[idx] = object;
              page.updatedAt = Date.now();
              await storageService.saveWhiteboard(board);
            }
          }
        }
      });

      // 6. Delete Object
      socket.on('delete_object', async (data: { roomCode: string; pageId: string; objectId: string }) => {
        const { roomCode, pageId, objectId } = data;
        socket.to(roomCode).emit('peer_delete_object', { pageId, objectId });

        const board = await storageService.getWhiteboardByRoomCode(roomCode);
        if (board) {
          const page = board.pages.find(p => p.id === pageId) || board.pages[board.activePageIndex];
          if (page) {
            page.objects = page.objects.filter(o => o.id !== objectId);
            page.updatedAt = Date.now();
            await storageService.saveWhiteboard(board);
          }
        }
      });

      // 7. Restore Original Handwriting Strokes
      socket.on('restore_original_strokes', async (data: { roomCode: string; pageId: string; objectId: string; originalStrokes: Stroke[] }) => {
        const { roomCode, pageId, objectId, originalStrokes } = data;
        socket.to(roomCode).emit('peer_restore_original_strokes', { pageId, objectId, originalStrokes });

        const board = await storageService.getWhiteboardByRoomCode(roomCode);
        if (board) {
          const page = board.pages.find(p => p.id === pageId) || board.pages[board.activePageIndex];
          if (page) {
            // Remove the converted object
            page.objects = page.objects.filter(o => o.id !== objectId);
            // Re-insert the original strokes
            for (const s of originalStrokes) {
              page.objects.push({
                id: s.id,
                type: 'stroke',
                x: s.boundingBox?.minX || 0,
                y: s.boundingBox?.minY || 0,
                strokeData: s,
                revision: 1,
                createdAt: Date.now(),
                updatedAt: Date.now()
              });
            }
            page.updatedAt = Date.now();
            await storageService.saveWhiteboard(board);
          }
        }
      });

      // 8. Laser Pointer & Live Cursor
      socket.on('laser_pointer', (data: { roomCode: string; x: number; y: number; active: boolean }) => {
        socket.to(data.roomCode).emit('peer_laser_pointer', {
          socketId: socket.id,
          x: data.x,
          y: data.y,
          active: data.active
        });
      });

      socket.on('cursor_move', (data: { roomCode: string; x: number; y: number }) => {
        const participant = this.participants.get(socket.id);
        if (participant) {
          participant.cursor = { x: data.x, y: data.y };
          socket.to(data.roomCode).emit('peer_cursor_move', {
            socketId: socket.id,
            name: participant.name,
            role: participant.role,
            x: data.x,
            y: data.y
          });
        }
      });

      // 9. Page Navigation & Management
      socket.on('change_page', async (data: { roomCode: string; activePageIndex: number }) => {
        const { roomCode, activePageIndex } = data;
        socket.to(roomCode).emit('peer_change_page', { activePageIndex });

        const board = await storageService.getWhiteboardByRoomCode(roomCode);
        if (board) {
          board.activePageIndex = activePageIndex;
          await storageService.saveWhiteboard(board);
        }
      });

      socket.on('update_pages_structure', async (data: { roomCode: string; pages: any[]; activePageIndex: number }) => {
        const { roomCode, pages, activePageIndex } = data;
        socket.to(roomCode).emit('peer_update_pages_structure', { pages, activePageIndex });

        const board = await storageService.getWhiteboardByRoomCode(roomCode);
        if (board) {
          board.pages = pages;
          board.activePageIndex = activePageIndex;
          await storageService.saveWhiteboard(board);
        }
      });

      // 10. Permission updates (Teacher controls student drawing)
      socket.on('update_permissions', async (data: { roomCode: string; permissions: any }) => {
        const { roomCode, permissions } = data;
        socket.to(roomCode).emit('peer_permissions_updated', permissions);

        const board = await storageService.getWhiteboardByRoomCode(roomCode);
        if (board) {
          board.permissions = permissions;
          await storageService.saveWhiteboard(board);
        }
      });

      // Disconnect
      socket.on('disconnect', () => {
        const participant = this.participants.get(socket.id);
        if (participant) {
          this.participants.delete(socket.id);
          this.broadcastRoomParticipants(participant.roomCode);
          socket.to(participant.roomCode).emit('peer_left', { socketId: socket.id, name: participant.name });
          console.log(`[Socket] ${participant.name} disconnected from room ${participant.roomCode}`);
        }
      });
    });
  }

  private broadcastRoomParticipants(roomCode: string) {
    const inRoom: Participant[] = [];
    this.participants.forEach((p) => {
      if (p.roomCode === roomCode) inRoom.push(p);
    });
    this.io.to(roomCode).emit('participants_updated', inRoom);
  }
}
