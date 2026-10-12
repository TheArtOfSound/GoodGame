// The crawler fallback renders the same public blocks as the React article.
const escapeText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export function articleBodyHtml(blocks: string[]): string {
  return blocks.map(block => block.startsWith('## ')
    ? `<h2>${escapeText(block.slice(3))}</h2>`
    : `<p>${escapeText(block)}</p>`).join('');
}
