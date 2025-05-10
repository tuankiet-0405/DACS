require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
    try {
        // Tạo connection đến database
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            multipleStatements: true // Cho phép chạy nhiều câu SQL trong một lệnh
        });
        
        console.log('✓ Đã kết nối đến database.');
        
        // Đọc file SQL
        const sqlFilePath = path.join(__dirname, 'migrations', 'transaction_tables.sql');
        const sqlContent = await fs.readFile(sqlFilePath, 'utf8');
        
        console.log('Đang chạy migration...');
        
        // Thực thi các câu lệnh SQL
        await connection.query(sqlContent);
        
        console.log('✓ Migration thành công!');
        
        await connection.end();
    } catch (error) {
        console.error('❌ Lỗi khi chạy migration:', error);
        process.exit(1);
    }
}

runMigration();
