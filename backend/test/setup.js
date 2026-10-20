// Test harness: fake Clerk auth + throwaway SQLite DB.
// A request with "Authorization: Bearer user_alice" is treated as Clerk user "user_alice".
const Module = require('module');
const os = require('os');
const path = require('path');
const fs = require('fs');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-test-'));
process.env.DB_PATH = path.join(dir, 'test.db');
process.env.UPLOAD_DIR = path.join(dir, 'uploads');
fs.mkdirSync(process.env.UPLOAD_DIR);
process.env.CLERK_SECRET_KEY = 'sk_test_fake';

const fakeVerify = async (token) => {
  if (!token || !token.startsWith('user_')) throw new Error('bad token');
  return { sub: token, username: token.slice(5), email: `${token.slice(5)}@example.com` };
};
const fakeUsers = {
  getUser: async (id) => ({ username: id.slice(5), primaryEmailAddress: { emailAddress: `${id.slice(5)}@example.com` }, imageUrl: '' }),
};
const realLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@clerk/express') return { verifyToken: fakeVerify, clerkMiddleware: () => (q, s, n) => n(), getAuth: () => ({}) };
  if (request === '@clerk/clerk-sdk-node') return { users: fakeUsers, clerkClient: { users: fakeUsers } };
  return realLoad.apply(this, arguments);
};

const app = require('../index');
const db = require('../db');
const request = require('supertest');

const as = (user) => (user ? { Authorization: `Bearer user_${user}` } : {});

module.exports = { app, db, request, as, dir };
