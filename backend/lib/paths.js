// Resolve config and data paths from the backend folder, never from the process's working
// directory: a service started from another folder must still find .env, the real database
// and the uploads folder (instead of silently creating an empty database).
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(ROOT, '.env'), quiet: true });

const DB_PATH = path.resolve(ROOT, process.env.DB_PATH || 'buildvault.db');
const UPLOAD_DIR = path.resolve(ROOT, process.env.UPLOAD_DIR || 'uploads');

module.exports = { ROOT, DB_PATH, UPLOAD_DIR };
