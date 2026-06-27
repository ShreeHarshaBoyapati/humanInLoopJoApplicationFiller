import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

export async function sendVerificationCode(email: string, code: string): Promise<void> {
  const gmailUser = process.env.NODE_GMAIL_USER;
  const appPassword = process.env.NODE_GMAIL_APP_PASSWORD;

  if (!gmailUser || !appPassword) {
    logger.error(
      'Gmail SMTP credentials not configured. Set NODE_GMAIL_USER and NODE_GMAIL_APP_PASSWORD in .env'
    );
    throw new Error('Email service not configured');
  }

  // Create transporter inside function to ensure credentials are available
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: gmailUser,
      pass: appPassword,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: `"JFP App" <${gmailUser}>`,
    to: email,
    subject: 'Your Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Your Verification Code</h2>
        <p style="color: #666; font-size: 16px;">Your verification code is:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #333;">${code}</span>
        </div>
        <p style="color: #666; font-size: 14px;">This code will expire in 5 minutes.</p>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">If you did not request this code, please ignore this email.</p>
      </div>
    `,
    text: `Your verification code is: ${code}. This code will expire in 5 minutes. If you did not request this code, please ignore this email.`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info({ email, messageId: info.messageId }, 'Verification code sent successfully');
  } catch (error) {
    logger.error({ err: error, email }, 'Failed to send verification code');
    throw error;
  }
}
