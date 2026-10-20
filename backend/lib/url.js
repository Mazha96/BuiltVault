// Only http(s) links are stored, so user-provided URLs can't carry javascript: into an href.
// Returns '' for empty input, the normalized URL when valid, or null when invalid.
function cleanUrl(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return ['http:', 'https:'].includes(u.protocol) ? u.toString().slice(0, 300) : null;
  } catch { return null; }
}

module.exports = { cleanUrl };
