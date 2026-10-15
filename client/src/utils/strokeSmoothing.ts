import { Point } from '../types/whiteboard';

/**
 * Renders smooth quadratic bezier curve between stroke points on a 2D canvas context
 */
export function drawSmoothStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  width: number,
  tool: 'pen' | 'pencil' | 'highlighter' = 'pen'
) {
  if (!points || points.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (tool === 'highlighter') {
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = width * 3.5;
    ctx.globalCompositeOperation = 'source-over';
  } else if (tool === 'pencil') {
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = Math.max(1, width * 0.7);
  } else {
    // Normal pen
    ctx.strokeStyle = color;
    ctx.globalAlpha = 1.0;
    ctx.lineWidth = width;
  }

  if (points.length === 1) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Smooth quadratic bezier curves through midpoint interpolation
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }

  // Last point
  const last = points[points.length - 1];
  const secondLast = points[points.length - 2];
  ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);

  ctx.stroke();
  ctx.restore();
}

/**
 * Computes bounding box for points
 */
export function computeBoundingBox(points: Point[]) {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const pt of points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
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
