export type ContentType = 'english' | 'mathematics' | 'mixed' | 'unknown';

export type AiCorrectionMode = 'OFF' | 'SUGGEST' | 'AUTO-FIX';

export type EnglishCorrectionLevel = 
  | 'recognition_only' 
  | 'spelling' 
  | 'spelling_punctuation' 
  | 'grammar_punctuation';

export type MathOutputStyle = 
  | 'original' 
  | 'neat_notation' 
  | 'latex_code';

export type HandwritingFontStyle = 
  | 'neat_student' 
  | 'clean_classroom' 
  | 'simple_cursive' 
  | 'neat_print';

export type RecognitionThreshold = 'conservative' | 'balanced' | 'aggressive';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  time?: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  tool: 'pen' | 'pencil' | 'highlighter';
  opacity?: number;
  createdAt: number;
  boundingBox?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

export interface WhiteboardObject {
  id: string;
  type: 'stroke' | 'text' | 'math' | 'shape' | 'sticky' | 'image' | 'pdf';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  // Specific properties
  strokeData?: Stroke;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  latex?: string;
  mathExpression?: string;
  shapeType?: 'rectangle' | 'circle' | 'triangle' | 'star' | 'line' | 'arrow' | 'coordinate_plane';
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  imageUrl?: string;
  stickyColor?: string;
  // Handwriting Conversion & Preservation metadata
  isConverted?: boolean;
  originalStrokes?: Stroke[];
  confidence?: number;
  conversionType?: 'english' | 'mathematics';
  rawRecognizedText?: string;
  handwritingStyle?: HandwritingFontStyle;
  // Revision tracking
  revision: number;
  lastModifiedBy?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WhiteboardPage {
  id: string;
  title: string;
  backgroundType: 'blank' | 'ruled' | 'dotted' | 'grid' | 'coordinate_plane';
  objects: WhiteboardObject[];
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface WhiteboardPermissions {
  allowStudentDrawing: boolean;
  allowStudentText: boolean;
  allowStudentErase: boolean;
  isLocked: boolean;
}

export interface WhiteboardDocument {
  id: string;
  title: string;
  ownerId: string;
  roomCode: string; // e.g. "MATH-4821"
  gradeLevel: 'Class 9' | 'Class 10' | 'Class 11' | 'Class 12' | 'O Level' | 'A Level' | 'General';
  pages: WhiteboardPage[];
  activePageIndex: number;
  permissions: WhiteboardPermissions;
  settings: WhiteboardAiSettings;
  createdAt: string;
  updatedAt: string;
}

export interface WhiteboardAiSettings {
  mode: AiCorrectionMode;
  englishEnabled: boolean;
  mathEnabled: boolean;
  englishCorrectionLevel: EnglishCorrectionLevel;
  mathOutputStyle: MathOutputStyle;
  defaultHandwritingStyle: HandwritingFontStyle;
  threshold: RecognitionThreshold;
  autoFixDelayMs: number; // e.g. 1500ms
  autoDetectType: boolean;
}

export interface RecognitionRequest {
  strokes: Stroke[];
  imageBase64?: string; // Cropped high-res image of stroke area for vision OCR
  hintType?: ContentType;
  settings?: Partial<WhiteboardAiSettings>;
  contextSentence?: string; // Previous line context for multi-line math or sentences
}

export interface RecognitionAlternative {
  text: string;
  confidence: number;
  latex?: string;
  explanation?: string;
}

export interface RecognitionResult {
  id: string;
  detectedType: ContentType;
  rawText: string;
  correctedText: string;
  latex?: string;
  confidence: number; // 0 to 1
  isAmbiguous: boolean;
  alternatives: RecognitionAlternative[];
  grammaticalFixesApplied?: string[];
  mathSteps?: string[]; // If multi-line calculation detected
  suggestedHandwritingStyle: HandwritingFontStyle;
  boundingBox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  providerUsed: string;
}
