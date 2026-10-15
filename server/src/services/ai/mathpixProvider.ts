import { Stroke, RecognitionResult, RecognitionAlternative } from '../../types';
import { StrokeGroupingService } from './strokeGroupingService';
import { config } from '../../config';

export class MathpixProvider {
  public static isConfigured(): boolean {
    return Boolean(config.mathpixAppId && config.mathpixAppKey);
  }

  /**
   * Sends handwritten strokes or image to Mathpix API
   */
  public static async recognize(
    strokes: Stroke[],
    imageBase64?: string
  ): Promise<RecognitionResult | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const box = StrokeGroupingService.getBoundingBox(strokes);

    try {
      let requestBody: any;
      let endpoint = 'https://api.mathpix.com/v3/text';

      if (imageBase64) {
        requestBody = {
          src: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`,
          formats: ['latex_styled', 'text'],
          data_options: {
            include_latex: true
          }
        };
      } else {
        // Convert stroke structure to Mathpix strokes format: { strokes: { x: [[...]], y: [[...]] } }
        endpoint = 'https://api.mathpix.com/v3/strokes';
        const xs = strokes.map(s => s.points.map(p => Math.round(p.x)));
        const ys = strokes.map(s => s.points.map(p => Math.round(p.y)));
        requestBody = {
          strokes: {
            x: xs,
            y: ys
          },
          formats: ['latex_styled', 'text']
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'app_id': config.mathpixAppId,
          'app_key': config.mathpixAppKey
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        console.warn(`[MathpixProvider] API call failed with status ${response.status}`);
        return null;
      }

      const data = await response.json();
      const latex = data.latex_styled || data.text || '';
      const confidence = typeof data.confidence === 'number' ? data.confidence : 0.95;

      const alternatives: RecognitionAlternative[] = [];
      if (data.latex_list && Array.isArray(data.latex_list)) {
        data.latex_list.forEach((item: any) => {
          alternatives.push({
            text: item.latex || item,
            latex: item.latex || item,
            confidence: item.confidence || 0.85
          });
        });
      }

      return {
        id: `rec_mp_${Date.now()}`,
        detectedType: 'mathematics',
        rawText: data.text || latex,
        correctedText: latex,
        latex: latex,
        confidence: confidence,
        isAmbiguous: alternatives.length > 1 && Math.abs((alternatives[0]?.confidence || 1) - (alternatives[1]?.confidence || 0)) < 0.1,
        alternatives: alternatives.length > 0 ? alternatives : [{ text: latex, latex, confidence }],
        suggestedHandwritingStyle: 'neat_print',
        boundingBox: box,
        providerUsed: 'Mathpix Cloud API (Live)'
      };
    } catch (err: any) {
      console.error('[MathpixProvider] Error communicating with Mathpix:', err.message);
      return null;
    }
  }
}
