// SQLite stores datetime('now') as "YYYY-MM-DD HH:MM:SS" in UTC with no zone marker.
// new Date() would read that as local time (and old Safari rejects it), so normalise first.
export function parseDbDate(ts) {
  if (!ts) return new Date(NaN);
  if (ts instanceof Date) return ts;
  const s = String(ts);
  return new Date(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s) ? s.replace(' ', 'T') + 'Z' : s);
}

// Link to a public profile. Usernames can contain spaces, and a fallback username that
// looks like a Clerk id ("user_...") would hit the id lookup, so use the id route then.
export function profilePath(username, id) {
  if (!username || username.startsWith('user_')) return id ? `/users/${id}` : '/explore';
  return `/u/${encodeURIComponent(username)}`;
}

export const isHttpUrl = (u) => /^https?:\/\//i.test(String(u || ''));
