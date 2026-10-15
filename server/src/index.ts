import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { storageService } from './services/storageService';
import apiRouter from './routes/api';
import { CollaborationHandler } from './socket/collaborationHandler';
import { WhiteboardDocument } from './types';

const app = express();
const server = http.createServer(app);

// Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Setup middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static uploads
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// Mount API routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve frontend client production build if present
const clientDistPath = path.join(__dirname, '../../client/dist');
if (require('fs').existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Setup Socket.io real-time collaboration
new CollaborationHandler(io);

// Seed default educational demonstration whiteboards if store is empty
async function seedDefaultWhiteboards() {
  const existing = await storageService.getWhiteboardByRoomCode('MATH-1001');
  if (!existing) {
    const demoBoard: WhiteboardDocument = {
      id: 'wb_demo_calculus_algebra',
      title: 'Class 12 & A-Level: Calculus & Quadratic Equations',
      ownerId: 'usr_demo_teacher',
      roomCode: 'MATH-1001',
      gradeLevel: 'A Level',
      pages: [
        {
          id: 'page_demo_1',
          title: '1. Quadratic Formula & Derivation',
          backgroundType: 'grid',
          order: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          objects: [
            {
              id: 'obj_header_1',
              type: 'text',
              x: 80,
              y: 50,
              text: 'Quadratic Equations & Standard Form',
              fontSize: 28,
              fontFamily: '"Caveat", cursive',
              color: '#38bdf8',
              handwritingStyle: 'clean_classroom',
              isConverted: true,
              confidence: 0.98,
              revision: 1,
              createdAt: Date.now(),
              updatedAt: Date.now()
            },
            {
              id: 'obj_math_1',
              type: 'math',
              x: 80,
              y: 130,
              latex: 'ax^2 + bx + c = 0 \\implies x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
              mathExpression: 'ax^2 + bx + c = 0',
              fontSize: 24,
              color: '#f8fafc',
              isConverted: true,
              confidence: 0.96,
              conversionType: 'mathematics',
              revision: 1,
              createdAt: Date.now(),
              updatedAt: Date.now()
            },
            {
              id: 'obj_math_step_2',
              type: 'math',
              x: 80,
              y: 220,
              latex: '\\begin{aligned} 2x + 5 &= 15 \\\\ 2x &= 15 - 5 \\\\ 2x &= 10 \\\\ x &= 5 \\end{aligned}',
              fontSize: 22,
              color: '#34d399',
              isConverted: true,
              confidence: 0.97,
              conversionType: 'mathematics',
              revision: 1,
              createdAt: Date.now(),
              updatedAt: Date.now()
            },
            {
              id: 'obj_sticky_note',
              type: 'sticky',
              x: 650,
              y: 120,
              width: 220,
              height: 160,
              text: 'Note for O/A Levels:\nAlways state discriminant:\nΔ = b² - 4ac\n• Δ > 0: two real roots\n• Δ = 0: repeated root\n• Δ < 0: no real roots',
              fontSize: 16,
              stickyColor: '#fef08a',
              color: '#713f12',
              revision: 1,
              createdAt: Date.now(),
              updatedAt: Date.now()
            }
          ]
        },
        {
          id: 'page_demo_2',
          title: '2. Integration & Calculus Fundamentals',
          backgroundType: 'coordinate_plane',
          order: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          objects: [
            {
              id: 'obj_math_calc_1',
              type: 'math',
              x: 100,
              y: 80,
              latex: '\\int_{0}^{1} x^2 \\, dx = \\left[ \\frac{x^3}{3} \\right]_0^1 = \\frac{1}{3}',
              fontSize: 24,
              color: '#a78bfa',
              isConverted: true,
              confidence: 0.95,
              revision: 1,
              createdAt: Date.now(),
              updatedAt: Date.now()
            },
            {
              id: 'obj_math_calc_2',
              type: 'math',
              x: 100,
              y: 190,
              latex: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1',
              fontSize: 24,
              color: '#38bdf8',
              isConverted: true,
              confidence: 0.98,
              revision: 1,
              createdAt: Date.now(),
              updatedAt: Date.now()
            }
          ]
        }
      ],
      activePageIndex: 0,
      permissions: {
        allowStudentDrawing: true,
        allowStudentText: true,
        allowStudentErase: false,
        isLocked: false
      },
      settings: {
        mode: 'SUGGEST',
        englishEnabled: true,
        mathEnabled: true,
        englishCorrectionLevel: 'grammar_punctuation',
        mathOutputStyle: 'neat_notation',
        defaultHandwritingStyle: 'clean_classroom',
        threshold: 'balanced',
        autoFixDelayMs: 1500,
        autoDetectType: true
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await storageService.saveWhiteboard(demoBoard);
    console.log('[Server] Seeded demo mathematics whiteboard (Room: MATH-1001)');
  }
}

// Start Server
async function startServer() {
  await storageService.connectDatabase();
  await seedDefaultWhiteboards();

  server.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(`AI DIGITAL WHITEBOARD BACKEND RUNNING ON PORT ${config.port}`);
    console.log(`REST API: http://localhost:${config.port}/api`);
    console.log(`Socket.IO Collaboration: Active`);
    console.log(`=======================================================`);
  });
}

startServer().catch(err => {
  console.error('[Fatal Error] Failed to start server:', err);
});
