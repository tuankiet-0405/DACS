/**
 * Script để kiểm tra API quản lý voucher
 * Chạy lệnh: node test-vouchers.js
 */

const axios = require('axios');

// Cấu hình API
const API_URL = 'http://localhost:3001/api/admin';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Thay bằng token admin thật

// Headers cho API request
const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ADMIN_TOKEN}`
};

// Hàm trợ giúp để format kết quả
const formatResponse = (title, data) => {
    console.log(`\n===== ${title} =====`);
    console.log(JSON.stringify(data, null, 2));
    console.log('='.repeat(title.length + 12));
};

// Các hàm kiểm tra API

// 1. Lấy danh sách voucher
const getAllVouchers = async () => {
    try {
        const response = await axios.get(`${API_URL}/vouchers`, { headers });
        formatResponse('Tất cả voucher', response.data);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách voucher:', error.response?.data || error.message);
    }
};

// 2. Lấy thống kê voucher
const getVoucherStats = async () => {
    try {
        const response = await axios.get(`${API_URL}/vouchers/stats`, { headers });
        formatResponse('Thống kê voucher', response.data);
    } catch (error) {
        console.error('Lỗi khi lấy thống kê voucher:', error.response?.data || error.message);
    }
};

// 3. Lọc voucher theo trạng thái
const getVouchersByStatus = async (status) => {
    try {
        const response = await axios.get(`${API_URL}/vouchers/status/${status}`, { headers });
        formatResponse(`Voucher trạng thái ${status}`, response.data);
    } catch (error) {
        console.error(`Lỗi khi lọc voucher theo trạng thái ${status}:`, error.response?.data || error.message);
    }
};

// 4. Tạo voucher mới
const createVoucher = async (voucherData) => {
    try {
        const response = await axios.post(`${API_URL}/vouchers`, voucherData, { headers });
        formatResponse('Kết quả tạo voucher', response.data);
        return response.data.voucherId;
    } catch (error) {
        console.error('Lỗi khi tạo voucher:', error.response?.data || error.message);
        return null;
    }
};

// 5. Lấy chi tiết voucher
const getVoucherById = async (id) => {
    try {
        const response = await axios.get(`${API_URL}/vouchers/${id}`, { headers });
        formatResponse(`Chi tiết voucher ID ${id}`, response.data);
    } catch (error) {
        console.error(`Lỗi khi lấy chi tiết voucher ID ${id}:`, error.response?.data || error.message);
    }
};

// 6. Cập nhật voucher
const updateVoucher = async (id, voucherData) => {
    try {
        const response = await axios.put(`${API_URL}/vouchers/${id}`, voucherData, { headers });
        formatResponse(`Kết quả cập nhật voucher ID ${id}`, response.data);
    } catch (error) {
        console.error(`Lỗi khi cập nhật voucher ID ${id}:`, error.response?.data || error.message);
    }
};

// 7. Xóa voucher
const deleteVoucher = async (id) => {
    try {
        const response = await axios.delete(`${API_URL}/vouchers/${id}`, { headers });
        formatResponse(`Kết quả xóa voucher ID ${id}`, response.data);
    } catch (error) {
        console.error(`Lỗi khi xóa voucher ID ${id}:`, error.response?.data || error.message);
    }
};

// Hàm chạy các bài test
const runTests = async () => {
    try {
        console.log('Bắt đầu kiểm tra API voucher...');
        
        // Test 1: Lấy thống kê
        await getVoucherStats();
        
        // Test 2: Lấy tất cả voucher
        await getAllVouchers();
        
        // Test 3: Lọc voucher theo trạng thái
        await getVouchersByStatus('active');
        
        // Test 4: Tạo voucher mới
        const newVoucher = {
            code: `TEST${Date.now()}`,
            description: 'Voucher test từ API',
            discountType: 'fixed',
            value: 100000,
            minOrderValue: 500000,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 ngày sau
            quantity: 50,
            maxUsePerUser: 1
        };
        
        const newVoucherId = await createVoucher(newVoucher);
        
        if (newVoucherId) {
            // Test 5: Lấy chi tiết voucher vừa tạo
            await getVoucherById(newVoucherId);
            
            // Test 6: Cập nhật voucher
            const updatedData = {
                code: newVoucher.code,
                description: 'Voucher test đã cập nhật',
                discountType: 'percentage',
                value: 15,
                minOrderValue: 1000000,
                startDate: newVoucher.startDate,
                endDate: newVoucher.endDate,
                quantity: 100,
                maxUsePerUser: 2
            };
            
            await updateVoucher(newVoucherId, updatedData);
            
            // Lấy lại chi tiết sau khi cập nhật
            await getVoucherById(newVoucherId);
            
            // Test 7: Xóa voucher
            await deleteVoucher(newVoucherId);
        }
        
        console.log('\nHoàn thành kiểm tra API voucher!');
    } catch (error) {
        console.error('Lỗi trong quá trình kiểm tra:', error);
    }
};

// Chạy các bài test
runTests();
