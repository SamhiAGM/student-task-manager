const nodemailer = require('nodemailer');

function isPlaceholderCredential(value, placeholderPattern) {
  const normalized = String(value || '').trim().toLowerCase();
  return !normalized || placeholderPattern.test(normalized);
}

function getGmailCredentials() {
  return {
    user: process.env.GMAIL_USER || process.env.EMAIL_USER || '',
    pass: process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS || ''
  };
}

function createGmailTransporter() {
  const { user, pass } = getGmailCredentials();
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';

  console.log('[forgot-password] Gmail credential check:', {
    hasUser: Boolean(user),
    hasPass: Boolean(pass),
    smtpHost,
    smtpPort: 587,
    smtpSecure: false,
    userSource: process.env.GMAIL_USER ? 'GMAIL_USER' : process.env.EMAIL_USER ? 'EMAIL_USER' : 'missing',
    passSource: process.env.GMAIL_APP_PASSWORD ? 'GMAIL_APP_PASSWORD' : process.env.EMAIL_PASS ? 'EMAIL_PASS' : 'missing'
  });

  if (isPlaceholderCredential(user, /^your_gmail_address@/)) {
    throw new Error('EMAIL_USER/GMAIL_USER is missing or still set to the placeholder value in backend/.env.');
  }

  if (isPlaceholderCredential(pass, /^your_16_character_app_password$/)) {
    throw new Error('EMAIL_PASS/GMAIL_APP_PASSWORD is missing or still set to the placeholder value in backend/.env. Use a Gmail App Password, not your normal Gmail password.');
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user,
      pass
    },
    tls: {
      minVersion: 'TLSv1.2'
    }
  });

  return transporter;
}

function createFallbackTransporter() {
  const { user, pass } = getGmailCredentials();

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user,
      pass
    },
    tls: {
      minVersion: 'TLSv1.2'
    }
  });
}

async function sendResetOtpEmail({ to, otp }) {
  console.log('[forgot-password] Preparing to send OTP email:', {
    to,
    otpLength: String(otp || '').length,
    otpGenerated: Boolean(otp)
  });

  const transporter = createGmailTransporter();

  const fromAddress = process.env.GMAIL_FROM || process.env.GMAIL_USER || process.env.EMAIL_USER;
  const appName = process.env.APP_NAME || 'Student Task Management';

  if (!fromAddress || String(fromAddress).includes('your_gmail_address')) {
    throw new Error('GMAIL_FROM is missing or still set to the placeholder value in backend/.env.');
  }

  const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 40px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <div style="background-color: #2563eb; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${appName}</h1>
          </div>
          <div style="padding: 30px; text-align: center;">
            <h2 style="color: #333333; font-size: 20px; margin-bottom: 20px;">Password Reset Request</h2>
            <p style="color: #555555; font-size: 16px; margin-bottom: 30px;">You recently requested to reset your password. Use the following 6-digit OTP code to verify your identity.</p>
            <div style="background-color: #f3f4f6; border: 1px dashed #2563eb; padding: 20px; margin-bottom: 30px; border-radius: 8px;">
              <span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 4px;">${otp}</span>
            </div>
            <p style="color: #888888; font-size: 14px; margin-bottom: 0;">This code will expire in 5 minutes.<br>If you did not request this, you can safely ignore this email.</p>
          </div>
        </div>
      </div>
    `;

  const textTemplate = [
    `You requested a password reset for ${appName}.`,
    '',
    `Your 6-digit OTP is: ${otp}`,
    '',
    'This OTP expires in 5 minutes.',
    'If you did not request this code, you can safely ignore this email.'
  ].join('\n');

  try {

    const info = await transporter.sendMail({
      from: `${appName} <${fromAddress}>`,
      to,
      subject: `${appName} Password Reset OTP`,
      text: textTemplate,
      html: htmlTemplate
    });

    console.log('[forgot-password] OTP email sent successfully:', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    });
    return info;
  } catch (sendError) {
    const fallbackNeeded = /ssl routines|tlsv1 alert internal error|unexpected eof|handshake failure/i.test(sendError.message || '');

    if (fallbackNeeded) {
      console.warn('[forgot-password] Primary SMTP transport failed, retrying with STARTTLS fallback:', sendError.message);

      try {
        const fallbackTransporter = createFallbackTransporter();
        const fallbackInfo = await fallbackTransporter.sendMail({
          from: `${appName} <${fromAddress}>`,
          to,
          subject: `${appName} Password Reset OTP`,
          text: textTemplate,
          html: htmlTemplate
        });

        console.log('[forgot-password] OTP email sent successfully with fallback transport:', {
          messageId: fallbackInfo.messageId,
          accepted: fallbackInfo.accepted,
          rejected: fallbackInfo.rejected
        });
        return fallbackInfo;
      } catch (fallbackError) {
        console.error('[forgot-password] fallback sendMail failed:', fallbackError.message);
        throw new Error(`Nodemailer sendMail failed: ${fallbackError.message}`);
      }
    }

    console.error('[forgot-password] sendMail failed:', sendError.message);
    throw new Error(`Nodemailer sendMail failed: ${sendError.message}`);
  }
}

module.exports = {
  createGmailTransporter,
  sendResetOtpEmail
};