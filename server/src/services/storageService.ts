import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { WhiteboardDocument } from '../types';
import { config } from '../config';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'teacher' | 'student';
  gradeLevelsTaught?: string[];
  createdAt: string;
}

class StorageService {
  private isMongoConnected: boolean = false;
  private dataDir: string;
  private dbFilePath: string;
  private memoryStore: {
    users: Record<string, UserRecord>;
    whiteboards: Record<string, WhiteboardDocument>;
  } = { users: {}, whiteboards: {} };

  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.dbFilePath = path.join(this.dataDir, 'db.json');
    this.initLocalStore();
  }

  private initLocalStore() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        this.memoryStore = JSON.parse(raw);
      } else {
        this.saveLocalStore();
      }
    } catch (err) {
      console.warn('[StorageService] Local store initialization warning:', err);
    }
  }

  private saveLocalStore() {
    try {
      fs.writeFileSync(this.dbFilePath, JSON.stringify(this.memoryStore, null, 2), 'utf-8');
    } catch (err) {
      console.error('[StorageService] Failed to save local file store:', err);
    }
  }

  public async connectDatabase(): Promise<void> {
    try {
      console.log(`[StorageService] Attempting MongoDB connection to ${config.mongoUri}...`);
      await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 2000
      });
      this.isMongoConnected = true;
      console.log('[StorageService] Successfully connected to MongoDB database.');
    } catch (err: any) {
      this.isMongoConnected = false;
      console.log(`[StorageService] MongoDB not available locally (${err.message}). Using persistent local JSON storage at ${this.dbFilePath}. System is fully operational!`);
    }
  }

  // --- Users Operations ---
  public async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase().trim();
    for (const id in this.memoryStore.users) {
      if (this.memoryStore.users[id].email.toLowerCase() === normalized) {
        return this.memoryStore.users[id];
      }
    }
    return null;
  }

  public async findUserById(id: string): Promise<UserRecord | null> {
    return this.memoryStore.users[id] || null;
  }

  public async createUser(user: UserRecord): Promise<UserRecord> {
    this.memoryStore.users[user.id] = user;
    this.saveLocalStore();
    return user;
  }

  // --- Whiteboard Operations ---
  public async getWhiteboardsByOwner(ownerId: string): Promise<WhiteboardDocument[]> {
    const list: WhiteboardDocument[] = [];
    for (const id in this.memoryStore.whiteboards) {
      if (this.memoryStore.whiteboards[id].ownerId === ownerId) {
        list.push(this.memoryStore.whiteboards[id]);
      }
    }
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public async getWhiteboardById(id: string): Promise<WhiteboardDocument | null> {
    return this.memoryStore.whiteboards[id] || null;
  }

  public async getWhiteboardByRoomCode(roomCode: string): Promise<WhiteboardDocument | null> {
    const normalized = roomCode.toUpperCase().trim();
    for (const id in this.memoryStore.whiteboards) {
      if (this.memoryStore.whiteboards[id].roomCode.toUpperCase() === normalized) {
        return this.memoryStore.whiteboards[id];
      }
    }
    return null;
  }

  public async saveWhiteboard(board: WhiteboardDocument): Promise<WhiteboardDocument> {
    board.updatedAt = new Date().toISOString();
    this.memoryStore.whiteboards[board.id] = board;
    this.saveLocalStore();
    return board;
  }

  public async deleteWhiteboard(id: string): Promise<boolean> {
    if (this.memoryStore.whiteboards[id]) {
      delete this.memoryStore.whiteboards[id];
      this.saveLocalStore();
      return true;
    }
    return false;
  }
}

export const storageService = new StorageService();
