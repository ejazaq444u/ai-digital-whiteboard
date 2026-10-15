import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AuthController } from '../controllers/authController';
import { WhiteboardController } from '../controllers/whiteboardController';
import { AiController } from '../controllers/aiController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Configure file upload storage
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (PNG, JPG, SVG, WebP) and PDF documents are allowed.'));
    }
  }
});

// --- Auth Routes ---
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.get('/auth/me', authMiddleware, AuthController.me);

// --- Whiteboard Routes ---
router.get('/whiteboards', authMiddleware, WhiteboardController.list);
router.post('/whiteboards', authMiddleware, WhiteboardController.create);
router.get('/whiteboards/room/:roomCode', WhiteboardController.getByRoomCode); // Public join with room code
router.get('/whiteboards/:id', WhiteboardController.getById);
router.put('/whiteboards/:id', WhiteboardController.update);
router.delete('/whiteboards/:id', authMiddleware, WhiteboardController.delete);
router.post('/whiteboards/:id/duplicate', authMiddleware, WhiteboardController.duplicate);

// --- AI Handwriting & Mathematics Routes ---
router.post('/ai/recognize', AiController.recognize);
router.post('/ai/correct-text', AiController.correctText);
router.get('/ai/status', AiController.getProviderStatus);
router.post('/ai/configure-keys', AiController.updateConfig);

// --- Upload Route ---
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded.' });
    return;
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
});

export default router;
