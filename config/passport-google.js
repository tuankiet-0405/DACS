const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../data/db');
const User = require('../models/userModel');

// Cấu hình Passport Google OAuth2.0
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "http://localhost:3000/auth/google/callback",
        },        async (accessToken, refreshToken, profile, done) => {
            try {
                // Sử dụng phương thức mới từ User model để tạo hoặc cập nhật người dùng
                const user = await User.createOrUpdateOAuthUser(profile);
                
                // Xóa mật khẩu từ đối tượng user trước khi lưu vào session
                const { mat_khau, ...userWithoutPassword } = user;
                
                done(null, userWithoutPassword);
            } catch (error) {
                console.error("Lỗi xác thực Google:", error);
                done(error);
            }
        }
    )
);

// Serialize và deserialize user để lưu thông tin vào session
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

module.exports = passport;
