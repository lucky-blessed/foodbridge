/**
 * email.service.js - Email Service
 * 
 * Handles all outbound emails for FoodBridge.
 * Currently used for password reset only
 * Used nodemailer with Gmail SMTP.
 * 
 * @author Lucky Nkwor
 */

const nodemailer = require('nodemailer');

// Create reusable transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

class EmailService {

    /**
     * sendPasswordReset - sends a password reset link to the user
     * 
     * @param {string} toEmail, recipient email address
     * @param {string} firstName, recipient first name (for personalization)
     * @param {string} token, the reset token (goes in the URL)
     */
    async sendPasswordReset(toEmail, firstName, token) {
        // The reset link points to the frontend reset page
        const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

        const mailOptions = {
            from: `"FoodBridge" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: 'Reset your FoodBridge password',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
                    <div style="background: #1B4332; padding: 24px 32px;">
                        <h1 style="color: #E76F51; margin: 0; font-size: 28px;">Food<span style="color: #ffffff;">Bridge</span></h1>
                        <p style="color: #D8F3DC; margin: 4px 0 0; font-size: 13px;">Community Food Sharing Platform</p>
                    </div>

                    <div style="padding: 32px; background: #ffffff; border: 1px solid #D8F3DC;">
                        <h2 style="color: #1B4332; margin-top: 0;">Hi ${firstName},</h2>
                        <p style="color: #2C3E35; line-height: 1.6;">
                            We received a request to reset your FoodBridge password.
                            Click the button below to choose a new password.
                        </p>

                        <div style="text-align: center; margin: 32px 0;">
                            <a href="${resetUrl}"
                               style="background: #1B4332; color: #ffffff; padding: 14px 32px;
                                      text-decoration: none; border-radius: 8px;
                                      font-weight: bold; font-size: 15px;">
                                Reset Password
                            </a>
                        </div>

                        <p style="color: #6B7C74; font-size: 13px; line-height: 1.6;">
                            This link expires in <strong>1 hour</strong>.
                            If you did not request a password reset, you can safely ignore this email —
                            your password will not change.
                        </p>

                        <hr style="border: none; border-top: 1px solid #D8F3DC; margin: 24px 0;">
                        <p style="color: #A8B8B0; font-size: 12px; margin: 0;">
                            Team ShareBite &nbsp;·&nbsp; Red Deer Polytechnic &nbsp;·&nbsp; SWDV 1014
                        </p>
                    </div>
                </div>
            `, 
        };

        await transporter.sendMail(mailOptions);
    }

    /**
     * verifyConnection - test that STMP credentials work
     * Call this on server startup to catch config errors early
     */
    async verifyConnection() {
        await transporter.verify();
        console.log('Email service connected.');
    }
}

module.exports = new EmailService();