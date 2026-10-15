import { Stroke, RecognitionResult, ContentType, RecognitionAlternative } from '../../types';
import { StrokeGroupingService } from './strokeGroupingService';
import { config } from '../../config';

export class VisionAiProvider {
  public static isGeminiConfigured(): boolean {
    return Boolean(config.geminiApiKey);
  }

  public static isOpenAiConfigured(): boolean {
    return Boolean(config.openAiApiKey);
  }

  /**
   * Recognizes handwriting using Google Gemini Multimodal Vision API
   */
  public static async recognizeWithGemini(
    strokes: Stroke[],
    imageBase64?: string,
    contentType: ContentType = 'mixed'
  ): Promise<RecognitionResult | null> {
    if (!this.isGeminiConfigured() || !imageBase64) {
      return null;
    }

    const box = StrokeGroupingService.getBoundingBox(strokes);

    try {
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

      const prompt = `You are a precision handwriting recognition specialist for mathematics and english education (grades 9-12, O/A Levels).
Analyze this handwritten whiteboard image carefully.
Content type hint: ${contentType}.

Return ONLY a valid JSON object with the following schema:
{
  "detectedType": "mathematics" | "english",
  "rawText": "exact recognized text as written by teacher",
  "correctedText": "corrected English text (fixing spelling/grammar if english) or clean LaTeX string (if mathematics)",
  "latex": "clean LaTeX mathematical expression if mathematics, otherwise empty string",
  "confidence": 0.0 to 1.0,
  "isAmbiguous": true or false,
  "grammaticalFixesApplied": ["list of fixes, e.g. corrected spelling importent -> important"],
  "mathSteps": ["optional list of calculation steps if multi-line equation"],
  "alternatives": [
    {"text": "alternative interpretation", "confidence": 0.8}
  ]
}
Do NOT wrap in markdown backticks. Just pure JSON.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${config.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: 'image/png',
                      data: cleanBase64
                    }
                  }
                ]
              }
            ]
          })
        }
      );

      if (!response.ok) {
        console.warn(`[VisionAiProvider] Gemini API returned ${response.status}`);
        return null;
      }

      const resData = await response.json();
      const rawTextResponse = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleanJson = rawTextResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        id: `rec_gemini_${Date.now()}`,
        detectedType: parsed.detectedType || (parsed.latex ? 'mathematics' : 'english'),
        rawText: parsed.rawText || '',
        correctedText: parsed.correctedText || parsed.latex || parsed.rawText,
        latex: parsed.latex || undefined,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.96,
        isAmbiguous: Boolean(parsed.isAmbiguous),
        alternatives: parsed.alternatives || [],
        grammaticalFixesApplied: parsed.grammaticalFixesApplied,
        mathSteps: parsed.mathSteps,
        suggestedHandwritingStyle: parsed.detectedType === 'mathematics' ? 'neat_print' : 'clean_classroom',
        boundingBox: box,
        providerUsed: 'Google Gemini Vision AI'
      };
    } catch (err: any) {
      console.error('[VisionAiProvider] Error in Gemini vision recognition:', err.message);
      return null;
    }
  }

  /**
   * Recognizes handwriting using OpenAI GPT-4o Vision API
   */
  public static async recognizeWithOpenAi(
    strokes: Stroke[],
    imageBase64?: string,
    contentType: ContentType = 'mixed'
  ): Promise<RecognitionResult | null> {
    if (!this.isOpenAiConfigured() || !imageBase64) {
      return null;
    }

    const box = StrokeGroupingService.getBoundingBox(strokes);

    try {
      const imageUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`;

      const systemPrompt = `You are an AI handwriting OCR and mathematics recognition system for Class 9-12 and O/A Levels.
Return pure JSON with keys: detectedType, rawText, correctedText, latex, confidence (0-1), isAmbiguous (bool), grammaticalFixesApplied (array), mathSteps (array).`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.openAiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: `Transcribe and correct this handwriting. Expected content type: ${contentType}` },
                { type: 'image_url', image_url: { url: imageUrl } }
              ]
            }
          ]
        })
      });

      if (!response.ok) return null;
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      const parsed = JSON.parse(content);

      return {
        id: `rec_openai_${Date.now()}`,
        detectedType: parsed.detectedType || (parsed.latex ? 'mathematics' : 'english'),
        rawText: parsed.rawText || '',
        correctedText: parsed.correctedText || parsed.latex || parsed.rawText,
        latex: parsed.latex,
        confidence: parsed.confidence || 0.95,
        isAmbiguous: Boolean(parsed.isAmbiguous),
        alternatives: [],
        grammaticalFixesApplied: parsed.grammaticalFixesApplied,
        mathSteps: parsed.mathSteps,
        suggestedHandwritingStyle: 'clean_classroom',
        boundingBox: box,
        providerUsed: 'OpenAI GPT-4o Vision'
      };
    } catch (err: any) {
      console.error('[VisionAiProvider] OpenAI error:', err.message);
      return null;
    }
  }
}
