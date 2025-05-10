@echo off
echo ===========================
echo Khởi động ứng dụng cho thuê xe TKĐK
echo ===========================

echo - Kiểm tra file .env...
if not exist .env (
    echo [CẢNH BÁO] Không tìm thấy file .env!
    echo - Tạo file .env từ template...
    copy .env.example .env
    echo [CẢNH BÁO] Vui lòng cập nhật file .env với thông tin đúng.
    echo - Nhập Client ID và Client Secret Google OAuth của bạn vào .env
    pause
)

echo - Khởi động server...
npm start
