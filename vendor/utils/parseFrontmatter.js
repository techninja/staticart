/**
 * Parse YAML frontmatter from a markdown string.
 * @module utils/parseFrontmatter
 */

/** @param {string} raw @returns {{ meta: Record<string, any>, content: string }} */
export function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: raw };
  const meta = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    /** @type {string|string[]} */
    let val = line.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map((s) => s.trim());
    }
    meta[key] = val;
  }
  return { meta, content: match[2] };
}
