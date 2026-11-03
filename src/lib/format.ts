export function formatDuration(ms: number | undefined) {
  if (!ms || ms < 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export function formatDate(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Plain-text preview of a Markdown summary for list cards. */
export function plainPreview(markdown: string | undefined, max = 140) {
  if (!markdown) return '';
  const text = markdown
    .replace(/^#+\s*/gm, '')
    .replace(/^\s*[-*]\s*\[[ xX]\]\s*/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' · ');
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
