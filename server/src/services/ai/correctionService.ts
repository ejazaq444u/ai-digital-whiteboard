import { EnglishCorrectionLevel } from '../../types';

export interface CorrectionOutcome {
  correctedText: string;
  appliedFixes: string[];
  hasChanges: boolean;
}

export class CorrectionService {
  // Dictionary of frequent handwriting spelling errors, especially in math/science education
  private static readonly SPELLING_DICTIONARY: Record<string, string> = {
    importent: 'important',
    importence: 'importance',
    equasion: 'equation',
    equasions: 'equations',
    matematics: 'mathematics',
    mathemetics: 'mathematics',
    mathmatics: 'mathematics',
    fraction: 'fraction',
    fracshun: 'fraction',
    diference: 'difference',
    diffrence: 'difference',
    calclus: 'calculus',
    calculus: 'calculus',
    algebric: 'algebraic',
    aljebra: 'algebra',
    triangle: 'triangle',
    triangel: 'triangle',
    hypotenus: 'hypotenuse',
    theorum: 'theorem',
    theorm: 'theorem',
    derivative: 'derivative',
    drivative: 'derivative',
    substitue: 'substitute',
    subsitute: 'substitute',
    simlify: 'simplify',
    simplfy: 'simplify',
    probablity: 'probability',
    solushun: 'solution',
    soluton: 'solution',
    solutoin: 'solution',
    coefficent: 'coefficient',
    polinomial: 'polynomial',
    parallell: 'parallel',
    perpendiclar: 'perpendicular',
    perpendicular: 'perpendicular',
    quadradic: 'quadratic',
    quadratick: 'quadratic',
    exponant: 'exponent',
    exponantial: 'exponential',
    symetry: 'symmetry',
    dimention: 'dimension',
    continious: 'continuous',
    intergral: 'integral'
  };

  /**
   * Applies English corrections based on teacher's chosen setting level
   */
  public static correctEnglish(
    text: string,
    level: EnglishCorrectionLevel
  ): CorrectionOutcome {
    if (!text || text.trim().length === 0) {
      return { correctedText: text, appliedFixes: [], hasChanges: false };
    }

    if (level === 'recognition_only') {
      return { correctedText: text, appliedFixes: [], hasChanges: false };
    }

    const appliedFixes: string[] = [];
    let result = text;

    // Preserve mathematical expressions enclosed in $...$ or standard math symbols
    const mathTokens: string[] = [];
    result = result.replace(/\$[^\$]+\$|\\\(.*?\\\)/g, (match) => {
      mathTokens.push(match);
      return `__MATH_TOKEN_${mathTokens.length - 1}__`;
    });

    // 1. Fix Spelling
    if (level === 'spelling' || level === 'spelling_punctuation' || level === 'grammar_punctuation') {
      const words = result.split(/(\s+|[.,!?;:])/);
      const correctedWords = words.map((w) => {
        const lower = w.toLowerCase();
        if (this.SPELLING_DICTIONARY[lower]) {
          const replacement = this.matchCase(w, this.SPELLING_DICTIONARY[lower]);
          appliedFixes.push(`Corrected spelling "${w}" → "${replacement}"`);
          return replacement;
        }
        return w;
      });
      result = correctedWords.join('');
    }

    // 2. Fix Grammar (Missing articles, subject-verb agreement)
    if (level === 'grammar_punctuation') {
      // E.g. "is very important subject" -> "is a very important subject"
      if (/\bis\s+very\s+important\s+subject\b/i.test(result)) {
        result = result.replace(/\bis\s+very\s+important\s+subject\b/i, 'is a very important subject');
        appliedFixes.push('Inserted missing article "a": "is a very important subject"');
      }

      // E.g. "x is equal 5" -> "x is equal to 5"
      if (/\bequal\s+(\d+|[a-z])\b/i.test(result)) {
        result = result.replace(/\bequal\s+(\d+|[a-z])\b/i, 'equal to $1');
        appliedFixes.push('Added preposition "to": "equal to"');
      }

      // E.g. "we can writes" -> "we can write"
      if (/\b(can|will|must|should)\s+([a-z]+)s\b/i.test(result)) {
        result = result.replace(/\b(can|will|must|should)\s+([a-z]+)s\b/i, '$1 $2');
        appliedFixes.push('Corrected modal verb tense');
      }
    }

    // 3. Fix Punctuation & Capitalization
    if (level === 'spelling_punctuation' || level === 'grammar_punctuation') {
      // Capitalize first character of sentences
      const trimmed = result.trim();
      if (trimmed.length > 0 && /^[a-z]/.test(trimmed)) {
        result = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        appliedFixes.push('Capitalized first letter of sentence');
      }

      // If it looks like a full declarative sentence without ending punctuation, append period
      if (
        result.length > 15 && 
        !/[.?!:;]$/.test(result.trim()) && 
        /\b(is|are|was|were|have|has|equals|can|should|will|theorem|solution|note)\b/i.test(result)
      ) {
        result = result.trim() + '.';
        appliedFixes.push('Added terminal period to sentence');
      }

      // Clean up multiple spaces or space before punctuation
      result = result.replace(/\s+([.,!?:;])/g, '$1');
    }

    // Restore math tokens
    mathTokens.forEach((token, idx) => {
      result = result.replace(`__MATH_TOKEN_${idx}__`, token);
    });

    const hasChanges = result !== text;
    return {
      correctedText: result,
      appliedFixes,
      hasChanges
    };
  }

  private static matchCase(original: string, replacement: string): string {
    if (original.length === 0) return replacement;
    // ALL CAPS
    if (original === original.toUpperCase() && original.length > 1) {
      return replacement.toUpperCase();
    }
    // Capitalized first letter
    if (original[0] === original[0].toUpperCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }
    return replacement.toLowerCase();
  }
}
