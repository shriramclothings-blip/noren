/**
 * WhatsApp OTP Service
 * Send OTP via WhatsApp for authentication
 */

const { pool } = require('../config/db');
const whatsappService = require('../services/whatsappService');

/**
 * Generate 6-digit OTP
 */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP via WhatsApp
 * @param {string} phone - Phone number with country code (e.g., +919876543210)
 * @param {string} purpose - 'password_reset' | 'login' | 'registration'
 */
async function sendWhatsAppOTP(phone, purpose = 'password_reset') {
    try {
        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in database
        await pool.query(
            `INSERT INTO otp_codes (phone_number, otp_code, purpose, expires_at)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (phone_number, purpose) 
             DO UPDATE SET otp_code = $2, expires_at = $4, created_at = CURRENT_TIMESTAMP, attempts = 0`,
            [phone, otp, purpose, expiresAt]
        );

        // Prepare WhatsApp message based on purpose
        let message = '';
        
        switch (purpose) {
            case 'password_reset':
                message = `🔐 *NOREN Fashion - Password Reset*

Your OTP for password reset is:

*${otp}*

⏰ Valid for 10 minutes
🔒 Do not share this code with anyone

If you didn't request this, please ignore this message.

*NOREN Fashion* - Secure Shopping ✨`;
                break;

            case 'login':
                message = `🔐 *NOREN Fashion - Login Verification*

Your login OTP is:

*${otp}*

⏰ Valid for 10 minutes
🔒 Keep this code confidential

*NOREN Fashion* 🛍️`;
                break;

            case 'registration':
                message = `👋 *Welcome to NOREN Fashion!*

Your verification OTP is:

*${otp}*

⏰ Valid for 10 minutes

Complete your registration and start shopping! 🛍️

*NOREN Fashion* - Where Style Meets Elegance ✨`;
                break;

            default:
                message = `🔐 *NOREN Fashion*

Your OTP is: *${otp}*

Valid for 10 minutes.

*NOREN Fashion* ✨`;
        }

        // Send via WhatsApp
        const result = await whatsappService.sendMessage(phone, message, 'default');

        if (result.success) {
            console.log(`✅ WhatsApp OTP sent to ${phone} for ${purpose}`);
            return {
                success: true,
                message: 'OTP sent successfully via WhatsApp'
            };
        } else {
            throw new Error(result.message || 'Failed to send WhatsApp message');
        }

    } catch (error) {
        console.error('❌ Error sending WhatsApp OTP:', error);
        return {
            success: false,
            message: 'Failed to send OTP via WhatsApp',
            error: error.message
        };
    }
}

/**
 * Verify OTP
 * @param {string} phone - Phone number
 * @param {string} otp - OTP code to verify
 * @param {string} purpose - Purpose of OTP
 */
async function verifyWhatsAppOTP(phone, otp, purpose = 'password_reset') {
    try {
        // Get OTP from database
        const result = await pool.query(
            `SELECT * FROM otp_codes 
             WHERE phone_number = $1 AND purpose = $2 AND otp_code = $3
             ORDER BY created_at DESC LIMIT 1`,
            [phone, purpose, otp]
        );

        if (result.rows.length === 0) {
            // Increment failed attempts
            await pool.query(
                `UPDATE otp_codes 
                 SET attempts = attempts + 1 
                 WHERE phone_number = $1 AND purpose = $2`,
                [phone, purpose]
            );

            return {
                success: false,
                message: 'Invalid OTP'
            };
        }

        const otpRecord = result.rows[0];

        // Check if expired
        if (new Date() > new Date(otpRecord.expires_at)) {
            return {
                success: false,
                message: 'OTP has expired'
            };
        }

        // Check attempts
        if (otpRecord.attempts >= 5) {
            return {
                success: false,
                message: 'Too many failed attempts. Please request a new OTP.'
            };
        }

        // OTP is valid - delete it
        await pool.query(
            `DELETE FROM otp_codes WHERE phone_number = $1 AND purpose = $2`,
            [phone, purpose]
        );

        console.log(`✅ WhatsApp OTP verified for ${phone}`);

        return {
            success: true,
            message: 'OTP verified successfully'
        };

    } catch (error) {
        console.error('❌ Error verifying WhatsApp OTP:', error);
        return {
            success: false,
            message: 'Failed to verify OTP',
            error: error.message
        };
    }
}

module.exports = {
    sendWhatsAppOTP,
    verifyWhatsAppOTP,
    generateOTP
};
