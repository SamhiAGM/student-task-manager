const express = require('express');

const router = express.Router();

const User = require('../models/User');
const {
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
} = require('../services/authSecurity');
const { sendResetOtpEmail } = require('../services/emailService');

const AUTH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const OTP_TTL_MS = Number(process.env.OTP_TTL_MS || 1000 * 60 * 5);
const OTP_COOLDOWN_MS = Number(process.env.OTP_COOLDOWN_MS || 1000 * 60);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const OTP_LOCK_MS = Number(process.env.OTP_LOCK_MS || 1000 * 60 * 15);
const RESET_SESSION_TTL_MS = Number(process.env.RESET_SESSION_TTL_MS || 1000 * 60 * 10);

function buildAuthResponse(user, token) {
  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email
    },
    token
  };
}

router.post('/signup', async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!name || !isValidEmail(email) || password.length < 6) {
    return res.status(400).json({ error: 'Name, valid email, and a password with at least 6 characters are required.' });
  }

  try {
    const existingUser = await User.findOne({ email }).exec();

    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const { passwordHash, passwordSalt } = hashLegacyPassword(password);
    const user = await User.create({
      name,
      email,
      passwordHash,
      passwordSalt
    });

    return res.status(201).json({
      message: 'Account created successfully.',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!isValidEmail(email) || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ email }).exec();

    if (!user || !(await verifyStoredPassword(password, user.passwordHash, user.passwordSalt))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateSessionToken();
    user.authTokenHash = hashToken(token);
    user.authTokenExpiresAt = new Date(Date.now() + AUTH_TOKEN_TTL_MS);
    await user.save();

    return res.json(buildAuthResponse(user, token));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/me', async (req, res) => {
  const token = String(req.query.token || '');

  if (!token) {
    return res.status(401).json({ error: 'Missing session token.' });
  }

  try {
    const user = await User.findOne({
      authTokenHash: hashToken(token),
      authTokenExpiresAt: { $gt: new Date() }
    }).exec();

    if (!user) {
      return res.status(401).json({ error: 'Session expired or invalid.' });
    }

    return res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  const email = normalizeEmail(req.body.email);

  console.log('[forgot-password] Incoming request:', {
    emailReceived: Boolean(email),
    emailDomain: email ? email.split('@')[1] : ''
  });

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  let user = null;

  try {
    user = await User.findOne({ email }).exec();

    console.log('[forgot-password] User lookup result:', {
      found: Boolean(user),
      email
    });

    if (!user) {
      return res.status(404).json({ error: 'No account found with that email address.' });
    }

    const now = Date.now();
    if (user.otpCooldownUntil && user.otpCooldownUntil.getTime() > now) {
      const waitSeconds = Math.max(1, Math.ceil((user.otpCooldownUntil.getTime() - now) / 1000));
      return res.status(429).json({ error: `Please wait ${waitSeconds} seconds before requesting another OTP.` });
    }

    const otp = generateOtp();
    user.otpHash = hashOtp(otp);
    user.otpExpiresAt = new Date(now + OTP_TTL_MS);
    user.otpRequestedAt = new Date(now);
    user.otpCooldownUntil = new Date(now + OTP_COOLDOWN_MS);
    user.otpAttemptCount = 0;
    user.otpLockedUntil = undefined;
    user.resetSessionHash = undefined;
    user.resetSessionExpiresAt = undefined;
    await user.save();

    console.log('[forgot-password] OTP generated and stored:', {
      email,
      otpExpiresAt: user.otpExpiresAt,
      otpCooldownUntil: user.otpCooldownUntil
    });

    try {
      await sendResetOtpEmail({ to: user.email, otp });
      return res.json({
        message: 'OTP sent successfully. Check your Gmail inbox and continue on the verification page.',
        nextStep: '/verify-otp.html',
        cooldownSeconds: Math.ceil(OTP_COOLDOWN_MS / 1000)
      });
    } catch (mailError) {
      user.otpHash = undefined;
      user.otpExpiresAt = undefined;
      user.otpRequestedAt = undefined;
      user.otpCooldownUntil = undefined;
      user.otpAttemptCount = 0;
      await user.save();

      console.error('[forgot-password] Failed to send OTP email:', {
        email,
        errorMessage: mailError.message,
        stack: mailError.stack
      });

      return res.status(500).json({
        error: mailError.message,
        details: 'Failed to send reset email.'
      });
    }
  } catch (error) {
    console.error('[forgot-password] Unexpected failure:', {
      email,
      errorMessage: error.message,
      stack: error.stack
    });
    return res.status(500).json({ error: error.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp || '').trim();

  if (!isValidEmail(email) || !isValidOtp(otp)) {
    return res.status(400).json({ error: 'Enter a valid email address and a 6-digit OTP.' });
  }

  try {
    const user = await User.findOne({ email }).exec();

    if (!user) {
      return res.status(404).json({ error: 'No account found with that email address.' });
    }

    const now = Date.now();

    if (user.otpLockedUntil && user.otpLockedUntil.getTime() > now) {
      const waitMinutes = Math.max(1, Math.ceil((user.otpLockedUntil.getTime() - now) / 60000));
      return res.status(429).json({ error: `Too many invalid attempts. Request a new OTP after ${waitMinutes} minute(s).` });
    }

    if (!user.otpHash || !user.otpExpiresAt || user.otpExpiresAt.getTime() <= now) {
      return res.status(400).json({ error: 'The OTP has expired. Please request a new one.' });
    }

    if (hashOtp(otp) !== user.otpHash) {
      user.otpAttemptCount = Number(user.otpAttemptCount || 0) + 1;

      if (user.otpAttemptCount >= OTP_MAX_ATTEMPTS) {
        user.otpHash = undefined;
        user.otpExpiresAt = undefined;
        user.otpRequestedAt = undefined;
        user.otpCooldownUntil = undefined;
        user.otpAttemptCount = 0;
        user.otpLockedUntil = new Date(now + OTP_LOCK_MS);
        await user.save();
        return res.status(429).json({ error: 'Too many invalid OTP attempts. Please request a new code.' });
      }

      await user.save();
      const remainingAttempts = OTP_MAX_ATTEMPTS - user.otpAttemptCount;
      return res.status(400).json({ error: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.` });
    }

    const resetSessionToken = generateSessionToken();
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    user.otpRequestedAt = undefined;
    user.otpCooldownUntil = undefined;
    user.otpAttemptCount = 0;
    user.otpLockedUntil = undefined;
    user.resetSessionHash = hashToken(resetSessionToken);
    user.resetSessionExpiresAt = new Date(now + RESET_SESSION_TTL_MS);
    await user.save();

    return res.json({
      message: 'OTP verified successfully. Continue to the password reset page.',
      resetSessionToken,
      nextStep: '/reset-password.html'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/reset-password', async (req, res) => {
  const sessionToken = String(req.body.sessionToken || req.body.token || '').trim();
  const password = String(req.body.password || req.body.newPassword || '');
  const confirmPassword = String(req.body.confirmPassword || '').trim();

  if (!sessionToken || !isValidPassword(password)) {
    return res.status(400).json({ error: 'A valid reset session and a password with at least 8 characters are required.' });
  }

  if (confirmPassword && password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  try {
    const user = await User.findOne({
      resetSessionHash: hashToken(sessionToken),
      resetSessionExpiresAt: { $gt: new Date() }
    }).exec();

    if (!user) {
      return res.status(400).json({ error: 'Reset session is invalid or has expired.' });
    }

    const passwordHash = await hashNewPassword(password);
    user.passwordHash = passwordHash;
    user.passwordSalt = undefined;
    user.resetSessionHash = undefined;
    user.resetSessionExpiresAt = undefined;
    user.authTokenHash = undefined;
    user.authTokenExpiresAt = undefined;
    await user.save();

    return res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;