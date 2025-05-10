// Simple email utility for sending notifications
const nodemailer = require('nodemailer');

// Create a transporter object
let transporter = null;

/**
 * Initialize the email transporter
 */
const initTransporter = () => {
    if (transporter) return; // Already initialized
    
    transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: process.env.MAIL_PORT || 587,
        secure: process.env.MAIL_SECURE === 'true',
        auth: {
            user: process.env.MAIL_USER || 'your-email@gmail.com',
            pass: process.env.MAIL_PASSWORD || 'your-password'
        }
    });
};

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content of the email
 * @returns {Promise} - Promise with the result of the send operation
 */
const sendEmail = async (to, subject, html) => {
    try {
        // Initialize transporter if needed
        if (!transporter) initTransporter();
        
        // Skip sending in development if no mail credentials are configured
        if (process.env.NODE_ENV === 'development' && 
            (!process.env.MAIL_USER || process.env.MAIL_USER === 'your-email@gmail.com')) {
            console.log('Email would have been sent in production:');
            console.log('To:', to);
            console.log('Subject:', subject);
            console.log('Content:', html);
            return { success: true, message: 'Email logging only (development mode)' };
        }

        // Send actual email
        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM || '"TKĐK Car Rental" <no-reply@tkdk.com>',
            to: to,
            subject: subject,
            html: html
        });

        console.log(`Email sent successfully to ${to} with subject "${subject}"`);
        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error('Error sending email:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    sendEmail
};
