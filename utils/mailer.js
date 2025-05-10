// Simple email utility for sending notifications
const nodemailer = require('nodemailer');

// Create a transporter object
let transporter = null;

/**
 * Initialize the email transporter
 */
const initTransporter = () => {
    if (transporter) return; // Already initialized
    
    console.log('Khởi tạo transporter email với thông tin:');
    console.log(`- MAIL_HOST: ${process.env.MAIL_HOST}`);
    console.log(`- MAIL_PORT: ${process.env.MAIL_PORT}`);
    console.log(`- MAIL_USER: ${process.env.MAIL_USER}`);
    
    transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.MAIL_PORT || '587'),
        secure: process.env.MAIL_SECURE === 'true',
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: false // Allow self-signed certificates
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
            (!process.env.MAIL_USER || process.env.MAIL_USER === 'your-email@gmail.com' || !process.env.MAIL_PASSWORD || process.env.MAIL_PASSWORD === 'your-app-password')) {
            console.log('=====================================================');
            console.log('Email would have been sent in production:');
            console.log('To:', to);
            console.log('Subject:', subject);
            console.log('Content:', html);
            console.log('=====================================================');
            return { success: true, message: 'Email logging only (development mode)' };
        }

        // Validate email recipient
        if (!to || !to.includes('@')) {
            console.log('Địa chỉ email không hợp lệ:', to);
            return { success: false, error: 'Invalid email address' };
        }

        // Send actual email
        console.log(`Đang gửi email đến ${to}...`);
        const info = await transporter.sendMail({
            from: process.env.MAIL_FROM || `"TKĐK Car Rental" <${process.env.MAIL_USER}>`,
            to: to,
            subject: subject,
            html: html
        });

        console.log(`Email gửi thành công đến ${to} với ID: ${info.messageId}`);
        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error('Lỗi khi gửi email:', error);
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
    
    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN').format(amount);
    };
    
    console.log('Gửi thông báo đăng ký xe mới đến admin:', adminEmail);
    console.log('Thông tin xe:', JSON.stringify(carInfo));
    
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px; padding: 20px;">
            <h2 style="color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px;">Thông báo đăng ký xe mới</h2>
            <p style="color: #555;">Một xe mới vừa được đăng ký và đang chờ xét duyệt.</p>
            
            <div style="background-color: #f8f9fa; border-left: 4px solid #4CAF50; padding: 15px; margin: 15px 0;">
                <h3 style="color: #2c3e50; margin-top: 0;">Thông tin xe:</h3>
                <ul style="color: #555; padding-left: 20px;">
                    <li><strong>Tên xe:</strong> ${carInfo.ten_xe || carInfo.name || 'N/A'}</li>
                    <li><strong>Biển số:</strong> ${carInfo.bien_so || carInfo.license_plate || 'N/A'}</li>
                    <li><strong>Loại xe:</strong> ${carInfo.so_cho || carInfo.seats || 'N/A'} chỗ</li>
                    <li><strong>Giá thuê:</strong> ${formatCurrency(carInfo.gia_thue || carInfo.price_per_day || 0)} VND/ngày</li>
                </ul>
            </div>
            
            <div style="background-color: #f8f9fa; border-left: 4px solid #2196F3; padding: 15px; margin: 15px 0;">
                <h3 style="color: #2c3e50; margin-top: 0;">Thông tin chủ xe:</h3>
                <ul style="color: #555; padding-left: 20px;">
                    <li><strong>Họ tên:</strong> ${ownerInfo.ho_ten || ownerInfo.name || 'N/A'}</li>
                    <li><strong>Email:</strong> ${ownerInfo.email || 'N/A'}</li>
                    <li><strong>Số điện thoại:</strong> ${ownerInfo.so_dien_thoai || ownerInfo.phone || 'N/A'}</li>
                </ul>
            </div>
            
            <p style="color: #555;">Vui lòng truy cập vào <a href="http://localhost:${process.env.PORT || 3001}/admin/cars" style="color: #2196F3; text-decoration: none; font-weight: bold;">Trang quản trị</a> để xem chi tiết và xét duyệt.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 12px;">
                <p>Email này được gửi tự động từ hệ thống TKĐK Car Rental. Vui lòng không trả lời email này.</p>
            </div>
        </div>
    `;
    
    return await sendEmail(adminEmail, subject, html);
};

module.exports = {
    sendEmail,
    sendCarRegistrationNotification
};
