/**
 * Minimal markdown → HTML renderer. No dependencies.
 * Handles headings, paragraphs, bold, italic, links, code, lists, images, hr.
 * @module utils/renderMarkdown
 */

/** @param {string} md @returns {string} */
export function renderMarkdown(md) {
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
  h = h.replace(/^(?!<[hulo]|<li|<hr|<img)(.+)$/gm, '<p>$1</p>');
  return h;
}
