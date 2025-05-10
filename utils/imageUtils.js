// Xử lý uploading hình ảnh xe từ base64
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Lưu hình ảnh base64 thành file và trả về đường dẫn
 * @param {string} base64Data - Dữ liệu base64 của hình ảnh
 * @param {string} filePrefix - Tiền tố cho tên file
 * @returns {string} - Đường dẫn đến file hình ảnh đã lưu
 */
function saveBase64Image(base64Data, filePrefix = 'car') {
    // Kiểm tra xem dữ liệu có phải là data URL không
    if (base64Data.startsWith('data:')) {
        // Tách phần base64 từ data URL
        const parts = base64Data.split(';base64,');
        if (parts.length !== 2) {
            throw new Error('Định dạng dữ liệu hình ảnh không hợp lệ');
        }
        base64Data = parts[1];
    }

    // Tạo tên file ngẫu nhiên
    const fileName = `${filePrefix}-${uuidv4()}.jpg`;
    
    // Đường dẫn lưu file
    const uploadDir = path.join(__dirname, '../public/uploads/cars');
    const filePath = path.join(uploadDir, fileName);
    
    // Đảm bảo thư mục tồn tại
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Chuyển đổi base64 thành buffer và lưu file
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    
    // Trả về đường dẫn tương đối để lưu vào database
    return `/public/uploads/cars/${fileName}`;
}

module.exports = {
    saveBase64Image
};
