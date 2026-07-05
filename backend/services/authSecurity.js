const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const PASSWORD_ITERATIONS = 120000;
const PASSWORD_HASH_LENGTH = 32;
const PASSWORD_DIGEST = 'sha256';
const PASSWORD_SALT_BYTES = 16;
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function isValidOtp(otp) {
  return /^\d{6}$/.test(String(otp || '').trim());
}

function isValidPassword(password) {
  return String(password || '').length >= 8;
}

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function hashLegacyPassword(password, salt = crypto.randomBytes(PASSWORD_SALT_BYTES).toString('hex')) {
  const passwordHash = crypto
    .pbkdf2Sync(String(password), salt, PASSWORD_ITERATIONS, PASSWORD_HASH_LENGTH, PASSWORD_DIGEST)
    .toString('hex');

  return { passwordHash, passwordSalt: salt };
}

async function hashNewPassword(password) {
  return bcrypt.hash(String(password), BCRYPT_ROUNDS);
}

async function verifyStoredPassword(password, passwordHash, passwordSalt) {
  if (String(passwordHash || '').startsWith('$2')) {
    return bcrypt.compare(String(password), String(passwordHash));
  }

  const salt = String(passwordSalt || '');
  if (!salt) {
    return false;
  }

  const computedHash = crypto
    .pbkdf2Sync(String(password), salt, PASSWORD_ITERATIONS, PASSWORD_HASH_LENGTH, PASSWORD_DIGEST)
    .toString('hex');

  const storedBuffer = Buffer.from(String(passwordHash || ''), 'hex');
  const computedBuffer = Buffer.from(computedHash, 'hex');

  if (storedBuffer.length !== computedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, computedBuffer);
}

module.exports = {
  generateOtp,
  generateSessionToken,
  hashLegacyPassword,
  hashNewPassword,
  hashOtp,
  hashToken,
  isValidEmail,
  isValidOtp,
  isValidPassword,
  normalizeEmail,
  verifyStoredPassword
};