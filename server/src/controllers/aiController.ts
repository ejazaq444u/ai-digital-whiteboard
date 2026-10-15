import { Request, Response } from 'express';
import { HandwritingRecognitionService } from '../services/ai/handwritingRecognitionService';
import { CorrectionService } from '../services/ai/correctionService';
import { LocalOfflineProvider } from '../services/ai/localOfflineProvider';
import { MathpixProvider } from '../services/ai/mathpixProvider';
import { VisionAiProvider } from '../services/ai/visionAiProvider';
import { config } from '../config';
import { RecognitionRequest } from '../types';

export class AiController {
  public static async recognize(req: Request, res: Response): Promise<void> {
    try {
      const recognitionReq: RecognitionRequest = req.body;

      if (!recognitionReq.strokes || recognitionReq.strokes.length === 0) {
        res.status(400).json({ error: 'At least one pen stroke is required for recognition.' });
        return;
      }

      const result = await HandwritingRecognitionService.processHandwriting(recognitionReq);
      res.json({ result });
    } catch (err: any) {
      console.error('[AiController.recognize] Error:', err);
      res.status(500).json({
        error: 'Handwriting recognition failed.',
        details: err.message
      });
    }
  }

  public static async correctText(req: Request, res: Response): Promise<void> {
    try {
      const { text, type = 'english', level = 'grammar_punctuation' } = req.body;

      if (!text) {
        res.status(400).json({ error: 'Text string is required.' });
        return;
      }

      if (type === 'mathematics') {
        const latex = LocalOfflineProvider.formatMathToLatex(text);
        res.json({
          original: text,
          latex,
          correctedText: latex
        });
        return;
      }

      const outcome = CorrectionService.correctEnglish(text, level);
      res.json({
        original: text,
        correctedText: outcome.correctedText,
        appliedFixes: outcome.appliedFixes,
        hasChanges: outcome.hasChanges
      });
    } catch (err: any) {
      console.error('[AiController.correctText] Error:', err);
      res.status(500).json({ error: 'Correction failed.' });
    }
  }

  public static async getProviderStatus(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        providers: {
          mathpix: {
            name: 'Mathpix Mathematical OCR',
            configured: MathpixProvider.isConfigured(),
            status: MathpixProvider.isConfigured() ? 'Ready' : 'API Keys Not Set (Using Local Engine)'
          },
          gemini: {
            name: 'Google Gemini 2.5 Flash Vision',
            configured: VisionAiProvider.isGeminiConfigured(),
            status: VisionAiProvider.isGeminiConfigured() ? 'Ready' : 'API Key Not Set'
          },
          openai: {
            name: 'OpenAI GPT-4o Vision',
            configured: VisionAiProvider.isOpenAiConfigured(),
            status: VisionAiProvider.isOpenAiConfigured() ? 'Ready' : 'API Key Not Set'
          },
          localOffline: {
            name: 'Local Offline Mathematical & Grammar Engine',
            configured: true,
            status: 'Active (Always Available)'
          }
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve AI provider status.' });
    }
  }

  public static async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { geminiApiKey, openAiApiKey, mathpixAppId, mathpixAppKey } = req.body;

      if (geminiApiKey !== undefined) config.geminiApiKey = geminiApiKey;
      if (openAiApiKey !== undefined) config.openAiApiKey = openAiApiKey;
      if (mathpixAppId !== undefined) config.mathpixAppId = mathpixAppId;
      if (mathpixAppKey !== undefined) config.mathpixAppKey = mathpixAppKey;

      res.json({
        message: 'AI Provider settings updated successfully.',
        status: {
          mathpixConfigured: MathpixProvider.isConfigured(),
          geminiConfigured: VisionAiProvider.isGeminiConfigured(),
          openAiConfigured: VisionAiProvider.isOpenAiConfigured()
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to update AI keys.' });
    }
  }
}
