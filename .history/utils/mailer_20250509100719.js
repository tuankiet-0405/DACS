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

/**
 * Send a notification to admins about a new car registration
 * @param {Object} carInfo - Information about the registered car
 * @param {Object} ownerInfo - Information about the car owner
 * @returns {Promise} - Promise with the result of the send operation
 */
const sendCarRegistrationNotification = async (carInfo, ownerInfo) => {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@tkdk.com';
    const subject = 'Đăng ký xe mới cần xét duyệt';
    
    const html = `
        <h2>Đăng ký xe mới</h2>
        <p>Một xe mới vừa được đăng ký và đang chờ xét duyệt.</p>
        
        <h3>Thông tin xe:</h3>
        <ul>
            <li><strong>Tên xe:</strong> ${carInfo.ten_xe || carInfo.name || 'N/A'}</li>
            <li><strong>Biển số:</strong> ${carInfo.bien_so || carInfo.license_plate || 'N/A'}</li>
            <li><strong>Loại xe:</strong> ${carInfo.so_cho || carInfo.seats || 'N/A'} chỗ</li>
            <li><strong>Giá thuê:</strong> ${carInfo.gia_thue || carInfo.price_per_day || 'N/A'} VND/ngày</li>
        </ul>
        
        <h3>Thông tin chủ xe:</h3>
        <ul>
            <li><strong>Họ tên:</strong> ${ownerInfo.ho_ten || ownerInfo.name || 'N/A'}</li>
            <li><strong>Email:</strong> ${ownerInfo.email || 'N/A'}</li>
            <li><strong>Số điện thoại:</strong> ${ownerInfo.so_dien_thoai || ownerInfo.phone || 'N/A'}</li>
        </ul>
        
        <p>Vui lòng truy cập vào <a href="http://localhost:${process.env.PORT || 3001}/admin/cars">Trang quản trị</a> để xem chi tiết và xét duyệt.</p>
    `;
    
    return await sendEmail(adminEmail, subject, html);
};

module.exports = {
    sendEmail,
    sendCarRegistrationNotification
};
