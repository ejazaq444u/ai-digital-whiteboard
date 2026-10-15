import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { storageService } from '../services/storageService';
import { WhiteboardDocument, WhiteboardPage, WhiteboardAiSettings } from '../types';

export class WhiteboardController {
  private static generateRoomCode(): string {
    const letters = 'MATH';
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${letters}-${num}`;
  }

  public static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const ownerId = req.user?.id || 'public';
      const boards = await storageService.getWhiteboardsByOwner(ownerId);
      res.json({ whiteboards: boards });
    } catch (err: any) {
      console.error('[WhiteboardController.list] Error:', err);
      res.status(500).json({ error: 'Failed to retrieve whiteboards.' });
    }
  }

  public static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const ownerId = req.user?.id || 'usr_demo_teacher';
      const { title = 'Untitled Mathematics Lesson', gradeLevel = 'Class 10', initialPageTitle = 'Page 1' } = req.body;

      const boardId = `wb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const roomCode = WhiteboardController.generateRoomCode();

      const defaultSettings: WhiteboardAiSettings = {
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

      const initialPage: WhiteboardPage = {
        id: `page_${Date.now()}_1`,
        title: initialPageTitle,
        backgroundType: 'grid',
        objects: [],
        order: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const newBoard: WhiteboardDocument = {
        id: boardId,
        title,
        ownerId,
        roomCode,
        gradeLevel,
        pages: [initialPage],
        activePageIndex: 0,
        permissions: {
          allowStudentDrawing: false,
          allowStudentText: false,
          allowStudentErase: false,
          isLocked: false
        },
        settings: defaultSettings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await storageService.saveWhiteboard(newBoard);
      res.status(201).json({ whiteboard: newBoard });
    } catch (err: any) {
      console.error('[WhiteboardController.create] Error:', err);
      res.status(500).json({ error: 'Failed to create whiteboard.' });
    }
  }

  public static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const board = await storageService.getWhiteboardById(id);
      if (!board) {
        res.status(404).json({ error: 'Whiteboard not found.' });
        return;
      }
      res.json({ whiteboard: board });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch whiteboard.' });
    }
  }

  public static async getByRoomCode(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { roomCode } = req.params;
      const board = await storageService.getWhiteboardByRoomCode(roomCode);
      if (!board) {
        res.status(404).json({ error: 'Whiteboard session not found with code: ' + roomCode });
        return;
      }
      res.json({ whiteboard: board });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve session.' });
    }
  }

  public static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const existing = await storageService.getWhiteboardById(id);
      if (!existing) {
        res.status(404).json({ error: 'Whiteboard not found.' });
        return;
      }

      // Check ownership if authenticated
      if (req.user && existing.ownerId !== req.user.id && existing.ownerId !== 'public' && existing.ownerId !== 'usr_demo_teacher') {
        res.status(403).json({ error: 'Unauthorized to modify this whiteboard.' });
        return;
      }

      const updated = {
        ...existing,
        ...req.body,
        id: existing.id, // Immutable
        ownerId: existing.ownerId,
        updatedAt: new Date().toISOString()
      };

      await storageService.saveWhiteboard(updated);
      res.json({ whiteboard: updated });
    } catch (err: any) {
      console.error('[WhiteboardController.update] Error:', err);
      res.status(500).json({ error: 'Failed to update whiteboard.' });
    }
  }

  public static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const existing = await storageService.getWhiteboardById(id);
      if (!existing) {
        res.status(404).json({ error: 'Whiteboard not found.' });
        return;
      }

      await storageService.deleteWhiteboard(id);
      res.json({ message: 'Whiteboard deleted successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to delete whiteboard.' });
    }
  }

  public static async duplicate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const existing = await storageService.getWhiteboardById(id);
      if (!existing) {
        res.status(404).json({ error: 'Whiteboard not found.' });
        return;
      }

      const newId = `wb_${Date.now()}_copy`;
      const duplicated: WhiteboardDocument = {
        ...existing,
        id: newId,
        title: `${existing.title} (Copy)`,
        roomCode: WhiteboardController.generateRoomCode(),
        ownerId: req.user?.id || existing.ownerId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await storageService.saveWhiteboard(duplicated);
      res.status(201).json({ whiteboard: duplicated });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to duplicate whiteboard.' });
    }
  }
}
