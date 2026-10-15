import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'ai-whiteboard-super-secure-jwt-secret-key-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-whiteboard',
  // AI Handwriting Recognition API keys
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
  mathpixAppId: process.env.MATHPIX_APP_ID || '',
  mathpixAppKey: process.env.MATHPIX_APP_KEY || '',
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development'
};
