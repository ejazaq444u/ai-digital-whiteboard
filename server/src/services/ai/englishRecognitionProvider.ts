import { Stroke, RecognitionRequest, RecognitionResult } from '../../types';
import { VisionAiProvider } from './visionAiProvider';
import { LocalOfflineProvider } from './localOfflineProvider';
import { CorrectionService } from './correctionService';

export class EnglishRecognitionProvider {
  public static async recognize(req: RecognitionRequest): Promise<RecognitionResult> {
    const { strokes, imageBase64, contextSentence, settings } = req;
    const correctionLevel = settings?.englishCorrectionLevel || 'grammar_punctuation';

    // 1. Try Gemini Vision if configured and image is provided
    if (VisionAiProvider.isGeminiConfigured() && imageBase64) {
      const geminiResult = await VisionAiProvider.recognizeWithGemini(strokes, imageBase64, 'english');
      if (geminiResult) {
        // Run correction service rules on top if requested
        const refined = CorrectionService.correctEnglish(geminiResult.rawText || geminiResult.correctedText, correctionLevel);
        geminiResult.correctedText = refined.correctedText;
        if (refined.appliedFixes.length > 0) {
          geminiResult.grammaticalFixesApplied = [
            ...(geminiResult.grammaticalFixesApplied || []),
            ...refined.appliedFixes
          ];
        }
        return geminiResult;
      }
    }

    // 2. Try OpenAI Vision if configured
    if (VisionAiProvider.isOpenAiConfigured() && imageBase64) {
      const openAiResult = await VisionAiProvider.recognizeWithOpenAi(strokes, imageBase64, 'english');
      if (openAiResult) {
        const refined = CorrectionService.correctEnglish(openAiResult.rawText || openAiResult.correctedText, correctionLevel);
        openAiResult.correctedText = refined.correctedText;
        return openAiResult;
      }
    }

    // 3. Fallback to Local Offline NLP & Heuristic Provider
    const localResult = LocalOfflineProvider.recognizeEnglish(strokes, contextSentence);
    const refined = CorrectionService.correctEnglish(localResult.rawText, correctionLevel);
    localResult.correctedText = refined.correctedText;
    localResult.grammaticalFixesApplied = refined.appliedFixes;
    return localResult;
  }
}
