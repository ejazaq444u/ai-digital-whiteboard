import { Stroke, RecognitionRequest, RecognitionResult } from '../../types';
import { MathpixProvider } from './mathpixProvider';
import { VisionAiProvider } from './visionAiProvider';
import { LocalOfflineProvider } from './localOfflineProvider';

export class MathRecognitionProvider {
  public static async recognize(req: RecognitionRequest): Promise<RecognitionResult> {
    const { strokes, imageBase64, contextSentence, settings } = req;

    // 1. Mathpix API is gold standard for handwritten equations
    if (MathpixProvider.isConfigured()) {
      const mathpixResult = await MathpixProvider.recognize(strokes, imageBase64);
      if (mathpixResult && mathpixResult.latex) {
        return mathpixResult;
      }
    }

    // 2. Try Gemini Vision multimodal
    if (VisionAiProvider.isGeminiConfigured() && imageBase64) {
      const geminiResult = await VisionAiProvider.recognizeWithGemini(strokes, imageBase64, 'mathematics');
      if (geminiResult && (geminiResult.latex || geminiResult.correctedText)) {
        return geminiResult;
      }
    }

    // 3. Try OpenAI Vision
    if (VisionAiProvider.isOpenAiConfigured() && imageBase64) {
      const openAiResult = await VisionAiProvider.recognizeWithOpenAi(strokes, imageBase64, 'mathematics');
      if (openAiResult && (openAiResult.latex || openAiResult.correctedText)) {
        return openAiResult;
      }
    }

    // 4. Robust Local Offline Mathematical Provider
    return LocalOfflineProvider.recognizeMathematics(strokes, contextSentence);
  }
}
