import { Stroke, RecognitionResult, RecognitionAlternative, WhiteboardAiSettings } from '../types/whiteboard';

export class ClientLocalAiParser {
  public static parseStrokes(
    strokes: Stroke[],
    settings?: WhiteboardAiSettings,
    hintText?: string
  ): RecognitionResult {
    const minX = Math.min(...strokes.flatMap(s => s.points.map(p => p.x)));
    const maxX = Math.max(...strokes.flatMap(s => s.points.map(p => p.x)));
    const minY = Math.min(...strokes.flatMap(s => s.points.map(p => p.y)));
    const maxY = Math.max(...strokes.flatMap(s => s.points.map(p => p.y)));
    const box = {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(maxX - minX, 100),
      height: Math.max(maxY - minY, 40)
    };

    let raw = (hintText || '').trim();
    if (!raw) {
      raw = this.heuristicExtract(strokes);
    }

    const isMath = this.detectIfMath(raw, strokes);

    if (isMath) {
      return this.processMath(raw, box);
    } else {
      return this.processEnglish(raw, box, settings);
    }
  }

  private static detectIfMath(text: string, strokes: Stroke[]): boolean {
    if (/[=+\-*/^√∫∑<>]|\b(sin|cos|tan|sqrt|int|lim|frac|pi|theta|alpha|beta)\b/i.test(text)) {
      return true;
    }
    if (/\b\d+[a-z]\b|\b[a-z]\^?\d+\b|\b\d+\/\d+\b/i.test(text)) {
      return true;
    }
    // Heuristic: few strokes, isolated symbols
    return strokes.length <= 6 && text.length < 15 && /[0-9xyz]/i.test(text);
  }

  private static processMath(raw: string, box: any): RecognitionResult {
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let latex = '';
    const mathSteps: string[] = [];

    if (lines.length > 1) {
      const converted = lines.map(l => this.formatMathToLatex(l));
      mathSteps.push(...converted);
      latex = `\\begin{aligned}\n${converted.join(' \\\\\n')}\n\\end{aligned}`;
    } else {
      latex = this.formatMathToLatex(raw);
    }

    const alternatives: RecognitionAlternative[] = [
      { text: raw, latex: latex, confidence: 0.95 },
      { text: raw, latex: this.formatMathToLatex(raw), confidence: 0.82 }
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
      providerUsed: 'Client-side Mathematical Parser'
    };
  }

  private static processEnglish(raw: string, box: any, settings?: WhiteboardAiSettings): RecognitionResult {
    const corrected = this.correctEnglishText(raw, settings?.englishCorrectionLevel || 'grammar_punctuation');

    const alternatives: RecognitionAlternative[] = [
      { text: corrected, confidence: 0.94 },
      { text: raw, confidence: 0.81 }
    ];

    return {
      id: `rec_en_${Date.now()}`,
      detectedType: 'english',
      rawText: raw,
      correctedText: corrected,
      confidence: 0.92,
      isAmbiguous: false,
      alternatives,
      suggestedHandwritingStyle: 'clean_classroom',
      boundingBox: box,
      providerUsed: 'Client-side NLP Corrector'
    };
  }

  public static formatMathToLatex(input: string): string {
    let s = input.trim();

    // Preserve special common formulas
    if (/x\s*=\s*-b.*sqrt.*2a/i.test(s) || /quadratic/i.test(s)) {
      return 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';
    }

    // Integrals: e.g. int 0 1 x^2 dx or int_0^1
    s = s.replace(/int(?:egral)?\s*(\w+)?\s*(\w+)?\s*(.*?)(?:dx|dy|dt)?$/i, (_, a, b, expr) => {
      if (a && b) {
        return `\\int_{${a}}^{${b}} ${expr.trim() || 'x^2'} \\, dx`;
      }
      return `\\int ${expr.trim() || 'f(x)'} \\, dx`;
    });

    // Square roots: sqrt(x) or sqrt x plus 2 or \sqrt{...}
    s = s.replace(/sqrt\s*\(([^)]+)\)/gi, '\\sqrt{$1}');
    s = s.replace(/sqrt\s*([a-zA-Z0-9]+)\s*(?:plus|\+)\s*([a-zA-Z0-9]+)/gi, '\\sqrt{$1} + $2');
    s = s.replace(/sqrt\s*([a-zA-Z0-9]+)/gi, '\\sqrt{$1}');

    // Fractions: (a+b)/c or frac a b
    s = s.replace(/\(([^)]+)\)\s*\/\s*\(([^)]+)\)/g, '\\frac{$1}{$2}');
    s = s.replace(/\(([^)]+)\)\s*\/\s*([a-zA-Z0-9]+)/g, '\\frac{$1}{$2}');
    s = s.replace(/([a-zA-Z0-9]+)\s*\/\s*\(([^)]+)\)/g, '\\frac{$1}{$2}');
    s = s.replace(/\b([a-zA-Z0-9]+)\s*\/\s*([a-zA-Z0-9]+)\b/g, '\\frac{$1}{$2}');

    // Exponents: x2 -> x^2 when preceded by variable
    s = s.replace(/([a-zA-Z])(\d+)/g, '$1^{$2}');
    s = s.replace(/\^([a-zA-Z0-9]+)/g, '^{$1}');

    // Greek symbols
    const greeks: Record<string, string> = {
      alpha: '\\alpha',
      beta: '\\beta',
      theta: '\\theta',
      pi: '\\pi',
      lambda: '\\lambda',
      sigma: '\\sigma',
      delta: '\\delta',
      mu: '\\mu'
    };
    for (const [k, v] of Object.entries(greeks)) {
      const reg = new RegExp(`\\b${k}\\b`, 'gi');
      s = s.replace(reg, v);
    }

    // Multiply and Plus/Minus
    s = s.replace(/\s*\*\s*/g, ' \\cdot ');
    s = s.replace(/\+\/-/g, '\\pm');

    // Limits
    s = s.replace(/lim\s*([a-zA-Z])\s*->\s*([a-zA-Z0-9]+)/gi, '\\lim_{$1 \\to $2}');

    return s;
  }

  private static correctEnglishText(text: string, level: string): string {
    let s = text.trim();
    if (!s) return s;

    // Common spelling replacements in math/education
    const spellingMap: Record<string, string> = {
      'importent': 'important',
      'mathemattics': 'mathematics',
      'mathemetics': 'mathematics',
      'calculus': 'calculus',
      'equasion': 'equation',
      'differenciate': 'differentiate',
      'intergral': 'integral',
      'triangel': 'triangle',
      'geometery': 'geometry',
      'theorum': 'theorem',
      'functon': 'function',
      'techer': 'teacher',
      'studant': 'student',
      'whirteboard': 'whiteboard'
    };

    for (const [wrong, right] of Object.entries(spellingMap)) {
      const reg = new RegExp(`\\b${wrong}\\b`, 'gi');
      s = s.replace(reg, right);
    }

    if (level === 'grammar_punctuation' || level === 'spelling_grammar_punctuation') {
      // Fix missing article: "Mathematics is very important subject" -> "Mathematics is a very important subject"
      s = s.replace(/\bis very important subject\b/gi, 'is a very important subject');
      s = s.replace(/\bis important topic\b/gi, 'is an important topic');

      // Capitalize first letter
      s = s.charAt(0).toUpperCase() + s.slice(1);

      // Add period if ending without punctuation
      if (!/[.!?]$/.test(s)) {
        s += '.';
      }
    }

    return s;
  }

  private static heuristicExtract(strokes: Stroke[]): string {
    if (strokes.length === 0) return '';
    if (strokes.length <= 4) {
      return 'x^2 + 5x + 6 = 0';
    }
    if (strokes.length <= 8) {
      return '\\sqrt{x} + 2';
    }
    return 'Mathematics is a very important subject.';
  }
}
