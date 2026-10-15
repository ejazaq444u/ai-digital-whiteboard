import katex from 'katex';

export function renderLatexToString(latex: string, displayMode: boolean = true): string {
  if (!latex || !latex.trim()) return '';

  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
      strict: false
    });
  } catch (err: any) {
    console.warn('[KaTeX Error]:', err.message);
    return `<span class="text-rose-400 font-mono text-sm">${escapeHtml(latex)}</span>`;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
