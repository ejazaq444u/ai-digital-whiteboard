import { RecognitionRequest, RecognitionResult, ContentType } from '../../types';
import { StrokeGroupingService } from './strokeGroupingService';
import { EnglishRecognitionProvider } from './englishRecognitionProvider';
import { MathRecognitionProvider } from './mathRecognitionProvider';
import { ConfidenceService } from './confidenceService';

export class HandwritingRecognitionService {
  /**
   * Main entry point for handwriting recognition requests
   */
  public static async processHandwriting(req: RecognitionRequest): Promise<RecognitionResult> {
    const startTime = Date.now();
    const { strokes, hintType, settings } = req;

    if (!strokes || strokes.length === 0) {
      throw new Error('No strokes provided for handwriting recognition.');
    }

    // Determine content type (mathematics vs english)
    let contentType: ContentType = hintType || 'unknown';

    if (contentType === 'unknown' || settings?.autoDetectType !== false) {
      if (!hintType) {
        contentType = StrokeGroupingService.detectContentTypeHeuristic(strokes);
      } else {
        contentType = hintType;
      }
    }

    let result: RecognitionResult;

    if (contentType === 'mathematics') {
      result = await MathRecognitionProvider.recognize(req);
    } else {
      result = await EnglishRecognitionProvider.recognize(req);
    }

    // Check ambiguity
    const ambiguityCheck = ConfidenceService.evaluateAmbiguity(result.rawText, result.alternatives);
    if (ambiguityCheck.isAmbiguous) {
      result.isAmbiguous = true;
    }

    // Adjust handwriting font recommendation
    if (settings?.defaultHandwritingStyle) {
      result.suggestedHandwritingStyle = settings.defaultHandwritingStyle;
    }

    const duration = Date.now() - startTime;
    console.log(`[HandwritingRecognitionService] Processed ${strokes.length} strokes as [${result.detectedType}] in ${duration}ms using ${result.providerUsed}`);

    return result;
  }
}
