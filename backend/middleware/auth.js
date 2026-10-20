const { verifyToken } = require('@clerk/express');
const { users: clerkUsers } = require('@clerk/clerk-sdk-node');
const db = require('../db');
require('dotenv').config();

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
  profileCache.set(clerkId, { at: Date.now(), profile });
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
    return deriveFromPayload(payload);
  }
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

    db.prepare(`INSERT INTO users (id, username, email, avatar_url, display_name, password_hash)
      VALUES (?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET
        username=excluded.username,
        email=excluded.email,
        avatar_url=excluded.avatar_url,
        display_name=CASE 
          WHEN users.display_name IS NULL OR users.display_name='' OR users.display_name=users.id
          THEN excluded.display_name 
          ELSE users.display_name 
        END`).run(clerkId, profile.username, profile.email, profile.avatar, profile.username, 'clerk_managed');

    req.user = { id: clerkId };
    next();
  } catch (err) {
    console.error('Auth error:', err.message, '| Path:', req.path);
    return res.status(401).json({ error: 'Invalid token' });
  }
};
