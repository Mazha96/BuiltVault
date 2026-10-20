const { verifyToken } = require('@clerk/express');
const { users: clerkUsers } = require('@clerk/clerk-sdk-node');
const db = require('../db');
require('../lib/paths');

function deriveFromPayload(payload) {
  const email = payload?.email_addresses?.[0]?.email_address || payload?.email || `${payload.sub}@clerk.user`;
  const username = payload?.username || payload?.first_name || payload?.given_name || (email ? email.split('@')[0] : payload.sub.slice(0, 8));
  const avatar = payload?.image_url || '';
  return { email, username, avatar };
}

// Clerk's getUser is a network call; doing it on every API request is slow and can hit
// Clerk rate limits. Profiles rarely change, so cache them for 10 minutes per user.
const PROFILE_TTL_MS = 10 * 60 * 1000;
const profileCache = new Map();

async function fetchClerkProfile(clerkId, payload) {
  const hit = profileCache.get(clerkId);
  if (hit && Date.now() - hit.at < PROFILE_TTL_MS) return hit.profile;
  const profile = await fetchClerkProfileUncached(clerkId, payload);
  if (!profile.fallback) profileCache.set(clerkId, { at: Date.now(), profile });
  return profile;
}

async function fetchClerkProfileUncached(clerkId, payload) {
  try {
    const user = await clerkUsers.getUser(clerkId);
    const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || payload?.email || `${clerkId}@clerk.user`;
    const username = user?.username || [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || (email ? email.split('@')[0] : clerkId.slice(0, 8));
    const avatar = user?.imageUrl || payload?.image_url || '';
    return { email, username, avatar };
  } catch (err) {
    console.error('Clerk fetch failed:', err.message);
    return { ...deriveFromPayload(payload), fallback: true };
  }
}

// Usernames are UNIQUE; if the derived one is taken, add a short suffix from the Clerk id.
function uniqueUsername(base, clerkId) {
  const clean = String(base || '').trim() || clerkId.slice(5, 13);
  if (!db.prepare('SELECT 1 FROM users WHERE username=?').get(clean)) return clean;
  return `${clean}-${clerkId.slice(-4)}`;
}

module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }
    const token = header.split(' ')[1];
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    const clerkId = payload.sub;
    const profile = await fetchClerkProfile(clerkId, payload);

    const exists = db.prepare('SELECT 1 FROM users WHERE id=?').get(clerkId);
    if (!exists) {
      db.prepare(`INSERT INTO users (id, username, email, avatar_url, display_name, password_hash) VALUES (?,?,?,?,?,?)`)
        .run(clerkId, uniqueUsername(profile.username, clerkId), profile.email, profile.avatar, profile.username, 'clerk_managed');
    } else if (!profile.fallback) {
      // Keep the stored username if the Clerk one is taken by someone else (UNIQUE column).
      const taken = db.prepare('SELECT 1 FROM users WHERE username=? AND id<>?').get(profile.username, clerkId);
      db.prepare(`UPDATE users SET
          username = CASE WHEN ? THEN username ELSE ? END,
          email = CASE WHEN EXISTS (SELECT 1 FROM users WHERE email=? AND id<>?) THEN email ELSE ? END,
          avatar_url = ?,
          display_name = CASE WHEN display_name IS NULL OR display_name='' OR display_name=id THEN ? ELSE display_name END
        WHERE id=?`)
        .run(taken ? 1 : 0, profile.username, profile.email, clerkId, profile.email, profile.avatar, profile.username, clerkId);
    }

    req.user = { id: clerkId };
    next();
  } catch (err) {
    console.error('Auth error:', err.message, '| Path:', req.path);
    return res.status(401).json({ error: 'Invalid token' });
  }
};
