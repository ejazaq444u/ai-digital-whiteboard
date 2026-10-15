import { RecognitionThreshold } from '../../types';

export class ConfidenceService {
  public static getThresholdScore(threshold: RecognitionThreshold): number {
    switch (threshold) {
      case 'conservative':
        return 0.88; // Only trigger auto-fix if extremely confident
      case 'aggressive':
        return 0.65; // Auto-fix more readily
      case 'balanced':
      default:
        return 0.78; // Balanced teacher experience
    }
  }

  public static shouldAutoFix(confidence: number, threshold: RecognitionThreshold, isAmbiguous: boolean): boolean {
    if (isAmbiguous) return false;
    const requiredScore = this.getThresholdScore(threshold);
    return confidence >= requiredScore;
  }

  public static evaluateAmbiguity(
    rawText: string,
    alternatives: { text: string; confidence: number }[]
  ): { isAmbiguous: boolean; reason?: string } {
    if (alternatives.length > 1) {
      const topDiff = Math.abs(alternatives[0].confidence - alternatives[1].confidence);
      if (topDiff < 0.12) {
        return {
          isAmbiguous: true,
          reason: `Close match between "${alternatives[0].text}" and "${alternatives[1].text}"`
        };
      }
    }

    // Common handwriting ambiguities in Math and English
    const ambiguousPairs = [
      { pattern: /[0oO]/, desc: 'Zero (0) vs Letter O' },
      { pattern: /[1lI|]/, desc: 'Number 1 vs Letter l vs Absolute Bar |' },
      { pattern: /[2zZ]/, desc: 'Number 2 vs Letter z' },
      { pattern: /[5sS]/, desc: 'Number 5 vs Letter s' },
      { pattern: /[x\u00d7]/, desc: 'Variable x vs Multiplication symbol \u00d7' },
      { pattern: /[uv]/, desc: 'Letter u vs Letter v' }
    ];

    for (const pair of ambiguousPairs) {
      if (pair.pattern.test(rawText) && rawText.length <= 4) {
        return {
          isAmbiguous: true,
          reason: `Potential ambiguity: ${pair.desc}`
        };
      }
    }

    return { isAmbiguous: false };
  }
}
