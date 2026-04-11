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
     * sendClaimNotification - notifies the donor when their listing is claimed
     *
     * @param {string} toEmail      - donor's email
     * @param {string} firstName    - donor's first name
     * @param {string} listingTitle - title of the claimed listing
     * @param {string} pickupEnd    - pickup window close time (ISO string)
     * @param {string} pin          - the PIN for the claimed listing
     */
    async sendClaimNotification(toEmail, firstName, listingTitle, pickupEnd, pin) {
        const pickupTime = new Date(pickupEnd).toLocaleString('en-CA', {
            dateStyle: 'medium', timeStyle: 'short'
        });

        const mailOptions = {
            from: `"FoodBridge" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Your listing "${listingTitle}" has been claimed`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
                    <div style="background: #1B4332; padding: 24px 32px;">
                        <h1 style="color: #E76F51; margin: 0; font-size: 28px;">Food<span style="color: #ffffff;">Bridge</span></h1>
                        <p style="color: #D8F3DC; margin: 4px 0 0; font-size: 13px;">Community Food Sharing Platform</p>
                    </div>
                    <div style="padding: 32px; background: #ffffff; border: 1px solid #D8F3DC;">
                        <h2 style="color: #1B4332; margin-top: 0;">Great news, ${firstName}!</h2>
                        <p style="color: #2C3E35; line-height: 1.6;">
                            Your listing <strong>"${listingTitle}"</strong> has been claimed
                            and a recipient is on their way to pick it up.
                        </p>
                        <div style="background: #D8F3DC; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
                            <p style="margin: 0; color: #1B4332; font-size: 14px;">
                                🕐 &nbsp;<strong>Pickup deadline:</strong> ${pickupTime}
                            </p>
                        </div>
                        <div style="background: #D8F3DC; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
                            <p style="margin: 0; color: #1B4332; font-size: 14px;">
                                🕐 &nbsp;<strong>your PIN:</strong> ${pin}
                            </p>
                        </div>
                        <p style="color: #6B7C74; font-size: 13px; line-height: 1.6;">
                            Please ensure the food is ready and accessible before the pickup deadline.
                            Once the recipient collects it, mark the listing as completed from your dashboard.
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
     * sendPickupReminder - reminds the recipient 30 minutes before pickup closes
     *
     * @param {string} toEmail      - recipient's email
     * @param {string} firstName    - recipient's first name
     * @param {string} listingTitle - title of the claimed listing
     * @param {string} address      - pickup address
     * @param {string} pickupEnd    - pickup window close time (ISO string)
     */
    async sendPickupReminder(toEmail, firstName, listingTitle, address, pickupEnd) {
        const pickupTime = new Date(pickupEnd).toLocaleString('en-CA', {
            dateStyle: 'medium', timeStyle: 'short'
        });

        const mailOptions = {
            from: `"FoodBridge" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Reminder: 30 minutes left to pick up "${listingTitle}"`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
                    <div style="background: #1B4332; padding: 24px 32px;">
                        <h1 style="color: #E76F51; margin: 0; font-size: 28px;">Food<span style="color: #ffffff;">Bridge</span></h1>
                        <p style="color: #D8F3DC; margin: 4px 0 0; font-size: 13px;">Community Food Sharing Platform</p>
                    </div>
                    <div style="padding: 32px; background: #ffffff; border: 1px solid #D8F3DC;">
                        <h2 style="color: #1B4332; margin-top: 0;">Heads up, ${firstName}!</h2>
                        <p style="color: #2C3E35; line-height: 1.6;">
                            You have <strong>30 minutes</strong> left to pick up
                            <strong>"${listingTitle}"</strong>.
                        </p>
                        <div style="background: #FFF3E0; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
                            <p style="margin: 0 0 8px; color: #1B4332; font-size: 14px;">
                                📍 &nbsp;<strong>Pickup location:</strong> ${address || 'See listing for details'}
                            </p>
                            <p style="margin: 0; color: #1B4332; font-size: 14px;">
                                🕐 &nbsp;<strong>Pickup closes at:</strong> ${pickupTime}
                            </p>
                        </div>
                        <p style="color: #6B7C74; font-size: 13px; line-height: 1.6;">
                            If you can no longer make it, please cancel your claim from the app
                            so the food can be made available to others.
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
     * sendPickupConfirmed - notifies the recipient when donor confirms pickup
     *
     * @param {string} toEmail      - recipient's email
     * @param {string} firstName    - recipient's first name
     * @param {string} listingTitle - title of the completed listing
     */
    async sendPickupConfirmed(toEmail, firstName, listingTitle) {
        const mailOptions = {
            from: `"FoodBridge" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: `Pickup confirmed — thank you for using FoodBridge!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
                    <div style="background: #1B4332; padding: 24px 32px;">
                        <h1 style="color: #E76F51; margin: 0; font-size: 28px;">Food<span style="color: #ffffff;">Bridge</span></h1>
                        <p style="color: #D8F3DC; margin: 4px 0 0; font-size: 13px;">Community Food Sharing Platform</p>
                    </div>
                    <div style="padding: 32px; background: #ffffff; border: 1px solid #D8F3DC;">
                        <h2 style="color: #1B4332; margin-top: 0;">Thank you, ${firstName}!</h2>
                        <p style="color: #2C3E35; line-height: 1.6;">
                            Your pickup of <strong>"${listingTitle}"</strong> has been confirmed
                            by the donor. This donation is now marked as completed.
                        </p>
                        <div style="background: #D8F3DC; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
                            <p style="margin: 0; color: #1B4332; font-size: 14px;">
                                ✅ &nbsp;<strong>Donation successfully collected.</strong>
                                Together we are reducing food waste in our community.
                            </p>
                        </div>
                        <p style="color: #6B7C74; font-size: 13px; line-height: 1.6;">
                            Visit FoodBridge to discover more available donations near you.
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

        if (process.env.NODE_ENV !== 'production') {
            console.log('Email service connected.');
        }
    }
}

module.exports = new EmailService();