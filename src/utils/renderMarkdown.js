/**
 * Minimal markdown → HTML renderer. No dependencies.
 * Handles headings, paragraphs, bold, italic, links, code, lists, images, hr.
 * Supports ::component[attrs] embeds and :::cols-N grid blocks.
 * @module utils/renderMarkdown
 */

/** @param {string} md @returns {string} */
export function renderMarkdown(md) {
  // Extract grid blocks before main processing
  const grids = [];
  md = md.replace(/^:::cols-(\d)\n([\s\S]*?)^:::/gm, (_, n, inner) => {
    grids.push({ cols: n, content: inner.trim() });
    return `<!--grid:${grids.length - 1}-->`;
  });

  let h = md
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^---$/gm, '<hr />')
    .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>');
  h = h.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  // Embeds before paragraphs
  h = h.replace(/^::([a-z-]+)\[([^\]]*)\]$/gm, (_, tag, attrs) => {
    const pairs = attrs
      .split(',')
      .map((a) => a.trim().split('='))
      .filter((a) => a.length === 2);
    return `<${tag} ${pairs.map(([k, v]) => `${k}="${v}"`).join(' ')}></${tag}>`;
  });
  h = h.replace(/^(?!<[hulo]|<li|<hr|<img|<[a-z]+-|<!--)(.+)$/gm, '<p>$1</p>');
  // Restore grid blocks with rendered inner content
  h = h.replace(/<!--grid:(\d+)-->/g, (_, i) => {
    const g = grids[Number(i)];
    return `<div class="content-grid" cols="${g.cols}">${renderMarkdown(g.content)}</div>`;
  });
  return h;
}
