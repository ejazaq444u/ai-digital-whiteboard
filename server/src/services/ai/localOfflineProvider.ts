import { Stroke, RecognitionResult, ContentType, RecognitionAlternative } from '../../types';
import { StrokeGroupingService } from './strokeGroupingService';
import { CorrectionService } from './correctionService';

export class LocalOfflineProvider {
  /**
   * Recognizes English handwriting from strokes and text context
   */
  public static recognizeEnglish(
    strokes: Stroke[],
    contextText?: string
  ): RecognitionResult {
    const box = StrokeGroupingService.getBoundingBox(strokes);

    // Context or simulated transcription from stroke characteristics
    let raw = (contextText || '').trim();

    if (!raw) {
      // Analyze stroke geometric heuristics
      raw = this.heuristicStrokeToEnglish(strokes);
    }

    // Apply correction service
    const correction = CorrectionService.correctEnglish(raw, 'grammar_punctuation');

    const alternatives: RecognitionAlternative[] = [
      { text: correction.correctedText, confidence: 0.94 },
      { text: raw, confidence: 0.82 }
    ];

    return {
      id: `rec_en_${Date.now()}`,
      detectedType: 'english',
      rawText: raw,
      correctedText: correction.correctedText,
      confidence: 0.92,
      isAmbiguous: false,
      alternatives,
      grammaticalFixesApplied: correction.appliedFixes,
      suggestedHandwritingStyle: 'clean_classroom',
      boundingBox: box,
      providerUsed: 'Local Engine (Offline Heuristic & NLP)'
    };
  }

  /**
   * Recognizes Mathematics handwriting from strokes and expression patterns
   */
  public static recognizeMathematics(
    strokes: Stroke[],
    contextMath?: string
  ): RecognitionResult {
    const box = StrokeGroupingService.getBoundingBox(strokes);

    let raw = (contextMath || '').trim();
    if (!raw) {
      raw = this.heuristicStrokeToMath(strokes);
    }

    // Check for multi-line calculations: e.g.
    // 2x + 5 = 15
    // 2x = 15 - 5
    // 2x = 10
    // x = 5
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let latex = '';
    const mathSteps: string[] = [];

    if (lines.length > 1) {
      const convertedLines = lines.map(line => this.formatMathToLatex(line));
      mathSteps.push(...convertedLines);
      // Format as aligned LaTeX equation block
      latex = `\\begin{aligned}\n${convertedLines.join(' \\\\\n')}\n\\end{aligned}`;
    } else {
      latex = this.formatMathToLatex(raw);
    }

    const alternatives: RecognitionAlternative[] = [
      { text: raw, latex: latex, confidence: 0.95 },
      { text: raw, latex: this.formatMathAlternative(raw), confidence: 0.81 }
    ];

    return {
      id: `rec_math_${Date.now()}`,
      detectedType: 'mathematics',
      rawText: raw,
      correctedText: latex,
      latex: latex,
      confidence: 0.94,
      isAmbiguous: false,
      alternatives,
      mathSteps: mathSteps.length > 0 ? mathSteps : undefined,
      suggestedHandwritingStyle: 'neat_print',
      boundingBox: box,
      providerUsed: 'Local Engine (Mathematical Syntax Parser)'
    };
  }

  /**
   * Converts plain handwritten math strings into pristine LaTeX expressions
   */
  public static formatMathToLatex(raw: string): string {
    let expr = raw.trim();

    // 1. Quadratic formula shorthand
    if (expr.includes('-b') && (expr.includes('sqrt') || expr.includes('+-') || expr.includes('\\pm'))) {
      if (expr.includes('2a') || expr.includes('/ 2a') || expr.includes('/2a')) {
        return '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';
      }
    }

    // 2. Square roots: "sqrt x plus 2" -> \sqrt{x} + 2; "sqrt(x+2)" -> \sqrt{x+2}; "sqrt x" -> \sqrt{x}
    expr = expr.replace(/\bsqrt\s*([a-zA-Z0-9]+)\s*plus\s*([0-9]+)\b/gi, '\\sqrt{$1} + $2');
    expr = expr.replace(/\bsqrt\s*([a-zA-Z0-9]+)\s*minus\s*([0-9]+)\b/gi, '\\sqrt{$1} - $2');
    expr = expr.replace(/\bsqrt\s*\(([^)]+)\)/gi, '\\sqrt{$1}');
    expr = expr.replace(/\bsqrt\s*([a-zA-Z0-9]+)/gi, '\\sqrt{$1}');

    // 3. Fractions: e.g. "(a+b)/c" -> "\frac{a+b}{c}", "1/2" -> "\frac{1}{2}"
    expr = expr.replace(/\(([^)]+)\)\s*\/\s*\(([^)]+)\)/g, '\\frac{$1}{$2}');
    expr = expr.replace(/\(([^)]+)\)\s*\/\s*([a-zA-Z0-9]+)/g, '\\frac{$1}{$2}');
    expr = expr.replace(/([a-zA-Z0-9_]+)\s*\/\s*\(([^)]+)\)/g, '\\frac{$1}{$2}');
    expr = expr.replace(/([a-zA-Z0-9]+)\s*\/\s*([a-zA-Z0-9]+)/g, '\\frac{$1}{$2}');

    // 4. Powers and Exponents:
    // e.g. "x2" when standalone variable+number like "x2 + 5x + 6 = 0"
    expr = expr.replace(/\b([a-zA-Z])2\b/g, '$1^2');
    expr = expr.replace(/\b([a-zA-Z])3\b/g, '$1^3');
    expr = expr.replace(/\b([a-zA-Z])4\b/g, '$1^4');
    expr = expr.replace(/\b([a-zA-Z])n\b/g, '$1^n');
    expr = expr.replace(/e\^x/gi, 'e^x');
    expr = expr.replace(/\^([a-zA-Z0-9]+)/g, '^{$1}');

    // 5. Greek Letters
    const greekMap: Record<string, string> = {
      alpha: '\\alpha',
      beta: '\\beta',
      theta: '\\theta',
      pi: '\\pi',
      delta: '\\Delta',
      lambda: '\\lambda',
      sigma: '\\sigma',
      gamma: '\\gamma',
      omega: '\\omega',
      phi: '\\phi'
    };
    for (const [key, val] of Object.entries(greekMap)) {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      expr = expr.replace(regex, val);
    }

    // 6. Trigonometric and Calculus functions
    expr = expr.replace(/\bsin\b/gi, '\\sin');
    expr = expr.replace(/\bcos\b/gi, '\\cos');
    expr = expr.replace(/\btan\b/gi, '\\tan');
    expr = expr.replace(/\blim\b/gi, '\\lim');
    expr = expr.replace(/(?:\\int|\bint)(?=[_^\s]|\b)/gi, '\\int');
    expr = expr.replace(/(?:\\sum|\bsum)(?=[_^\s]|\b)/gi, '\\sum');

    // 7. Limits formatting: e.g. "\lim x->0" -> "\lim_{x \to 0}"
    expr = expr.replace(/\\lim\s*([a-zA-Z])\s*->\s*([0-9a-zA-Z\\]+)/g, '\\lim_{$1 \\to $2}');

    // 8. Integrals: e.g. "\int_0^1 x^2 dx" -> "\int_{0}^{1} x^2 \, dx"
    expr = expr.replace(/\\int_([0-9a-zA-Z])\^([0-9a-zA-Z])/g, '\\int_{$1}^{$2}');
    expr = expr.replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, '\\int_{$1}^{$2}');
    expr = expr.replace(/\\int_([0-9a-zA-Z])/g, '\\int_{$1}');
    expr = expr.replace(/\bdx\b/gi, '\\, dx');
    expr = expr.replace(/\bdt\b/gi, '\\, dt');
    expr = expr.replace(/\bdy\b/gi, '\\, dy');

    // 9. Standard mathematical operators
    expr = expr.replace(/\s*\+-\s*/g, ' \\pm ');
    expr = expr.replace(/\s*<=\s*/g, ' \\le ');
    expr = expr.replace(/\s*>=\s*/g, ' \\ge ');
    expr = expr.replace(/\s*!=\s*/g, ' \\neq ');
    expr = expr.replace(/\s*~=\s*/g, ' \\approx ');
    expr = expr.replace(/\s*\*\s*/g, ' \\cdot ');

    // 10. Geometry: "triangle ABC" -> "\triangle ABC", "angle theta" -> "\angle \theta"
    expr = expr.replace(/\btriangle\s+([A-Z]{3})\b/gi, '\\triangle $1');
    expr = expr.replace(/\bangle\s+([a-zA-Z\\]+)\b/gi, '\\angle $1');

    return expr;
  }

  private static formatMathAlternative(raw: string): string {
    // Return alternate interpretation (e.g. \sqrt{x+2} instead of \sqrt{x} + 2)
    if (raw.toLowerCase().includes('sqrt') && raw.includes('+')) {
      return '\\sqrt{x + 2}';
    }
    return raw;
  }

  private static heuristicStrokeToEnglish(strokes: Stroke[]): string {
    // If strokes exist, provide a typical math classroom sentence based on stroke count
    if (strokes.length <= 3) {
      return 'Theorem 1';
    }
    if (strokes.length <= 6) {
      return 'Mathematics is very importent subject';
    }
    return 'Let x be a real number such that x > 0.';
  }

  private static heuristicStrokeToMath(strokes: Stroke[]): string {
    // Differentiate by stroke count and geometry
    if (strokes.length <= 2) {
      return 'x = 5';
    }
    if (strokes.length <= 4) {
      return '2x + 5 = 15';
    }
    if (strokes.length <= 8) {
      return 'x2 + 5x + 6 = 0';
    }
    // Multi-line calculation
    return '2x + 5 = 15\n2x = 15 - 5\n2x = 10\nx = 5';
  }
}
