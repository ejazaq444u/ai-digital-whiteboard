import { Stroke, Point } from '../../types';

export interface StrokeBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export class StrokeGroupingService {
  /**
   * Calculates the bounding box for a single stroke or array of strokes.
   */
  public static getBoundingBox(strokes: Stroke[]): StrokeBoundingBox {
    if (!strokes || strokes.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const stroke of strokes) {
      for (const pt of stroke.points) {
        if (pt.x < minX) minX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
      }
    }

    if (minX === Infinity) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
    }

    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);

    return {
      minX,
      minY,
      maxX,
      maxY,
      width,
      height,
      centerX: minX + width / 2,
      centerY: minY + height / 2
    };
  }

  /**
   * Groups strokes into lines or separate formula blocks based on spatial proximity and vertical gaps.
   */
  public static groupIntoLines(strokes: Stroke[], verticalGapThreshold = 40): Stroke[][] {
    if (strokes.length <= 1) return [strokes];

    // Calculate individual bounding boxes
    const strokesWithBox = strokes.map(s => ({
      stroke: s,
      box: this.getBoundingBox([s])
    }));

    // Sort by vertical center coordinate
    strokesWithBox.sort((a, b) => a.box.centerY - b.box.centerY);

    const lines: Stroke[][] = [];
    let currentLine: Stroke[] = [strokesWithBox[0].stroke];
    let currentLineY = strokesWithBox[0].box.centerY;

    for (let i = 1; i < strokesWithBox.length; i++) {
      const item = strokesWithBox[i];
      if (Math.abs(item.box.centerY - currentLineY) < verticalGapThreshold) {
        currentLine.push(item.stroke);
      } else {
        lines.push(currentLine);
        currentLine = [item.stroke];
        currentLineY = item.box.centerY;
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Identifies candidate content type (math vs english) based on stroke geometric features:
   * Presence of horizontal fraction bars, isolated superscripts, =, +, -, \sqrt, etc.
   */
  public static detectContentTypeHeuristic(strokes: Stroke[]): 'mathematics' | 'english' | 'mixed' {
    if (!strokes || strokes.length === 0) return 'english';

    let mathIndicators = 0;
    let englishIndicators = 0;

    for (const stroke of strokes) {
      const box = this.getBoundingBox([stroke]);
      const aspect = box.width / Math.max(1, box.height);

      // Horizontal line stroke (like minus sign, fraction bar, or equality line)
      if (aspect > 3.5 && box.height < 25) {
        mathIndicators += 2;
      }

      // Short cross strokes (like plus sign or t)
      if (Math.abs(box.width - box.height) < 15 && stroke.points.length < 10) {
        mathIndicators += 1;
      }

      // Root sign stroke shape (starts low, dips down, goes up high, then right)
      if (stroke.points.length > 12) {
        const pts = stroke.points;
        const pStart = pts[0];
        const pMid = pts[Math.floor(pts.length * 0.4)];
        const pTop = pts[Math.floor(pts.length * 0.7)];
        const pEnd = pts[pts.length - 1];

        if (pMid.y > pStart.y && pTop.y < pStart.y && pEnd.x > pTop.x) {
          mathIndicators += 3;
        }
      }
    }

    // Number of strokes vs overall width: English cursive has fewer, longer continuous strokes
    const totalPoints = strokes.reduce((acc, s) => acc + s.points.length, 0);
    const avgPtsPerStroke = totalPoints / Math.max(1, strokes.length);

    if (avgPtsPerStroke > 35 && strokes.length < 5) {
      englishIndicators += 2;
    }

    if (mathIndicators >= 3) return 'mathematics';
    if (englishIndicators >= 2 && mathIndicators === 0) return 'english';
    return mathIndicators > 0 ? 'mathematics' : 'english';
  }
}
