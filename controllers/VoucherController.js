const db = require('../data/db');

const voucherController = {
    // Lấy danh sách tất cả voucher
    getAllVouchers: async (req, res) => {
        try {
            const query = `
                SELECT 
                    id, ma_voucher, mo_ta, loai_giam_gia, gia_tri, dieu_kien_ap_dung,
                    ngay_bat_dau, ngay_ket_thuc, so_luong, da_su_dung, trang_thai, ngay_tao
                FROM voucher
                ORDER BY ngay_tao DESC
            `;
            
            const [vouchers] = await db.execute(query);
            
            // Định dạng lại dữ liệu trước khi trả về
            const formattedVouchers = vouchers.map(voucher => {
                const currentDate = new Date();
                const startDate = new Date(voucher.ngay_bat_dau);
                const endDate = new Date(voucher.ngay_ket_thuc);
                
                // Xác định trạng thái hiển thị dựa trên thời gian
                let displayStatus = voucher.trang_thai;
                if (currentDate < startDate) {
                    displayStatus = 'scheduled';
                } else if (currentDate > endDate) {
                    displayStatus = 'expired';
                }
                
                // Nếu số lượng đã hết, đánh dấu là đã hết
                if (voucher.so_luong > 0 && voucher.da_su_dung >= voucher.so_luong) {
                    displayStatus = 'sold_out';
                }
                
                return {
                    id: voucher.id,
                    code: voucher.ma_voucher,
                    description: voucher.mo_ta || '',
                    discountType: voucher.loai_giam_gia === 'phan_tram' ? 'percentage' : 'fixed',
                    value: voucher.gia_tri,
                    condition: voucher.dieu_kien_ap_dung || '',
                    startDate: voucher.ngay_bat_dau,
                    endDate: voucher.ngay_ket_thuc,
                    quantity: voucher.so_luong,
                    used: voucher.da_su_dung,
                    status: displayStatus,
                    createdAt: voucher.ngay_tao
                };
            });
            
            res.status(200).json({
                success: true,
                message: 'Lấy danh sách voucher thành công',
                vouchers: formattedVouchers
            });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách voucher:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy danh sách voucher',
                error: error.message
            });
        }
    },
    
    // Lấy thống kê voucher
    getVoucherStats: async (req, res) => {
        try {
            const currentDate = new Date();
            const oneWeekFromNow = new Date();
            oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
            
            // Lấy tổng số voucher
            const [totalResult] = await db.execute('SELECT COUNT(*) as total FROM voucher');
            
            // Lấy số voucher đang hoạt động
            const [activeResult] = await db.execute(`
                SELECT COUNT(*) as active 
                FROM voucher 
                WHERE trang_thai = 'active' 
                AND ngay_bat_dau <= ? 
                AND ngay_ket_thuc >= ?
            `, [currentDate, currentDate]);
            
            // Lấy số voucher sắp hết hạn (trong vòng 7 ngày)
            const [expiringResult] = await db.execute(`
                SELECT COUNT(*) as expiring 
                FROM voucher 
                WHERE trang_thai = 'active' 
                AND ngay_ket_thuc BETWEEN ? AND ?
            `, [currentDate, oneWeekFromNow]);
            
            // Lấy tổng số lần sử dụng voucher
            const [usedResult] = await db.execute('SELECT SUM(da_su_dung) as used FROM voucher');
            
            res.status(200).json({
                success: true,
                message: 'Lấy thống kê voucher thành công',
                stats: {
                    totalVouchers: totalResult[0].total || 0,
                    activeVouchers: activeResult[0].active || 0,
                    expiringVouchers: expiringResult[0].expiring || 0,
                    totalUsed: usedResult[0].used || 0
                }
            });
        } catch (error) {
            console.error('Lỗi khi lấy thống kê voucher:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy thống kê voucher',
                error: error.message
            });
        }
    },
    
    // Lọc voucher theo trạng thái
    getVouchersByStatus: async (req, res) => {
        try {
            const { status } = req.params;
            const currentDate = new Date();
            
            let whereClause = '';
            const queryParams = [];
            
            switch (status) {
                case 'active':
                    whereClause = `WHERE trang_thai = 'active' AND ngay_bat_dau <= ? AND ngay_ket_thuc >= ?`;
                    queryParams.push(currentDate, currentDate);
                    break;
                case 'scheduled':
                    whereClause = `WHERE ngay_bat_dau > ?`;
                    queryParams.push(currentDate);
                    break;
                case 'expired':
                    whereClause = `WHERE ngay_ket_thuc < ? OR trang_thai = 'expired'`;
                    queryParams.push(currentDate);
                    break;
                default:
                    // 'all' or any invalid status returns all vouchers
                    whereClause = '';
            }
            
            const query = `
                SELECT 
                    id, ma_voucher, mo_ta, loai_giam_gia, gia_tri, dieu_kien_ap_dung,
                    ngay_bat_dau, ngay_ket_thuc, so_luong, da_su_dung, trang_thai, ngay_tao
                FROM voucher
                ${whereClause}
                ORDER BY ngay_tao DESC
            `;
            
            const [vouchers] = await db.execute(query, queryParams);
            
            // Định dạng lại dữ liệu trước khi trả về
            const formattedVouchers = vouchers.map(voucher => {
                const startDate = new Date(voucher.ngay_bat_dau);
                const endDate = new Date(voucher.ngay_ket_thuc);
                
                // Xác định trạng thái hiển thị
                let displayStatus = voucher.trang_thai;
                if (currentDate < startDate) {
                    displayStatus = 'scheduled';
                } else if (currentDate > endDate || voucher.trang_thai === 'expired') {
                    displayStatus = 'expired';
                }
                
                // Nếu số lượng đã hết, đánh dấu là đã hết
                if (voucher.so_luong > 0 && voucher.da_su_dung >= voucher.so_luong) {
                    displayStatus = 'sold_out';
                }
                
                return {
                    id: voucher.id,
                    code: voucher.ma_voucher,
                    description: voucher.mo_ta || '',
                    discountType: voucher.loai_giam_gia === 'phan_tram' ? 'percentage' : 'fixed',
                    value: voucher.gia_tri,
                    condition: voucher.dieu_kien_ap_dung || '',
                    startDate: voucher.ngay_bat_dau,
                    endDate: voucher.ngay_ket_thuc,
                    quantity: voucher.so_luong,
                    used: voucher.da_su_dung,
                    status: displayStatus,
                    createdAt: voucher.ngay_tao
                };
            });
            
            res.status(200).json({
                success: true,
                message: 'Lọc voucher thành công',
                vouchers: formattedVouchers
            });
        } catch (error) {
            console.error('Lỗi khi lọc voucher theo trạng thái:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lọc voucher',
                error: error.message
            });
        }
    },
    
    // Lấy chi tiết voucher theo ID
    getVoucherById: async (req, res) => {
        try {
            const { id } = req.params;
            
            const query = `
                SELECT 
                    id, ma_voucher, mo_ta, loai_giam_gia, gia_tri, dieu_kien_ap_dung,
                    ngay_bat_dau, ngay_ket_thuc, so_luong, da_su_dung, trang_thai, ngay_tao
                FROM voucher
                WHERE id = ?
            `;
            
            const [results] = await db.execute(query, [id]);
            
            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy voucher'
                });
            }
            
            const voucher = results[0];
            const currentDate = new Date();
            const startDate = new Date(voucher.ngay_bat_dau);
            const endDate = new Date(voucher.ngay_ket_thuc);
            
            // Xác định trạng thái hiển thị
            let displayStatus = voucher.trang_thai;
            if (currentDate < startDate) {
                displayStatus = 'scheduled';
            } else if (currentDate > endDate) {
                displayStatus = 'expired';
            }
            
            // Nếu số lượng đã hết, đánh dấu là đã hết
            if (voucher.so_luong > 0 && voucher.da_su_dung >= voucher.so_luong) {
                displayStatus = 'sold_out';
            }
            
            const formattedVoucher = {
                id: voucher.id,
                code: voucher.ma_voucher,
                description: voucher.mo_ta || '',
                discountType: voucher.loai_giam_gia === 'phan_tram' ? 'percentage' : 'fixed',
                value: voucher.gia_tri,
                condition: voucher.dieu_kien_ap_dung || '',
                startDate: voucher.ngay_bat_dau,
                endDate: voucher.ngay_ket_thuc,
                quantity: voucher.so_luong,
                used: voucher.da_su_dung,
                status: displayStatus,
                createdAt: voucher.ngay_tao
            };
            
            res.status(200).json({
                success: true,
                message: 'Lấy chi tiết voucher thành công',
                voucher: formattedVoucher
            });
        } catch (error) {
            console.error('Lỗi khi lấy chi tiết voucher:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy chi tiết voucher',
                error: error.message
            });
        }
    },
    
    // Tạo voucher mới
    createVoucher: async (req, res) => {
        try {
            const {
                code,
                description,
                discountType,
                value,
                minOrderValue,
                startDate,
                endDate,
                quantity,
                maxUsePerUser
            } = req.body;
            
            // Kiểm tra các trường bắt buộc
            if (!code || !discountType || !value || !startDate || !endDate || !quantity) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin bắt buộc'
                });
            }
            
            // Kiểm tra mã voucher đã tồn tại chưa
            const [existingVoucher] = await db.execute('SELECT id FROM voucher WHERE ma_voucher = ?', [code]);
            
            if (existingVoucher.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Mã voucher đã tồn tại'
                });
            }
            
            // Chuyển đổi loại giảm giá sang định dạng database
            const dbDiscountType = discountType === 'percentage' ? 'phan_tram' : 'tien_mat';
            
            // Tạo điều kiện áp dụng
            let condition = '';
            if (minOrderValue) {
                condition = `Đơn hàng tối thiểu: ${minOrderValue}đ`;
                if (maxUsePerUser) {
                    condition += `. Giới hạn ${maxUsePerUser} lần/người dùng`;
                }
            } else if (maxUsePerUser) {
                condition = `Giới hạn ${maxUsePerUser} lần/người dùng`;
            }
            
            const query = `
                INSERT INTO voucher (
                    ma_voucher, mo_ta, loai_giam_gia, gia_tri, dieu_kien_ap_dung,
                    ngay_bat_dau, ngay_ket_thuc, so_luong, trang_thai
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
            `;
            
            const [result] = await db.execute(query, [
                code,
                description,
                dbDiscountType,
                value,
                condition,
                startDate,
                endDate,
                quantity
            ]);
            
            res.status(201).json({
                success: true,
                message: 'Tạo voucher thành công',
                voucherId: result.insertId
            });
        } catch (error) {
            console.error('Lỗi khi tạo voucher:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi tạo voucher',
                error: error.message
            });
        }
    },
    
    // Cập nhật voucher
    updateVoucher: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                code,
                description,
                discountType,
                value,
                minOrderValue,
                startDate,
                endDate,
                quantity,
                maxUsePerUser,
                status
            } = req.body;
            
            // Kiểm tra voucher tồn tại
            const [existingVoucher] = await db.execute('SELECT * FROM voucher WHERE id = ?', [id]);
            
            if (existingVoucher.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy voucher'
                });
            }
            
            // Kiểm tra mã voucher đã tồn tại chưa (nếu thay đổi mã)
            if (code !== existingVoucher[0].ma_voucher) {
                const [duplicateCode] = await db.execute('SELECT id FROM voucher WHERE ma_voucher = ? AND id != ?', [code, id]);
                
                if (duplicateCode.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'Mã voucher đã tồn tại'
                    });
                }
            }
            
            // Chuyển đổi loại giảm giá sang định dạng database
            const dbDiscountType = discountType === 'percentage' ? 'phan_tram' : 'tien_mat';
            
            // Tạo điều kiện áp dụng
            let condition = '';
            if (minOrderValue) {
                condition = `Đơn hàng tối thiểu: ${minOrderValue}đ`;
                if (maxUsePerUser) {
                    condition += `. Giới hạn ${maxUsePerUser} lần/người dùng`;
                }
            } else if (maxUsePerUser) {
                condition = `Giới hạn ${maxUsePerUser} lần/người dùng`;
            }
            
            // Đảm bảo status hợp lệ
            const validStatus = ['active', 'inactive', 'expired'];
            const dbStatus = validStatus.includes(status) ? status : existingVoucher[0].trang_thai;
            
            const query = `
                UPDATE voucher 
                SET 
                    ma_voucher = ?, 
                    mo_ta = ?, 
                    loai_giam_gia = ?, 
                    gia_tri = ?, 
                    dieu_kien_ap_dung = ?,
                    ngay_bat_dau = ?, 
                    ngay_ket_thuc = ?, 
                    so_luong = ?,
                    trang_thai = ?
                WHERE id = ?
            `;
            
            await db.execute(query, [
                code,
                description || '',
                dbDiscountType,
                value,
                condition,
                startDate,
                endDate,
                quantity,
                dbStatus,
                id
            ]);
            
            res.status(200).json({
                success: true,
                message: 'Cập nhật voucher thành công'
            });
        } catch (error) {
            console.error('Lỗi khi cập nhật voucher:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi cập nhật voucher',
                error: error.message
            });
        }
    },
    
    // Xóa voucher
    deleteVoucher: async (req, res) => {
        try {
            const { id } = req.params;
            
            // Kiểm tra voucher tồn tại
            const [existingVoucher] = await db.execute('SELECT * FROM voucher WHERE id = ?', [id]);
            
            if (existingVoucher.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy voucher'
                });
            }
            
            // Xóa voucher
            await db.execute('DELETE FROM voucher WHERE id = ?', [id]);
            
            res.status(200).json({
                success: true,
                message: 'Xóa voucher thành công'
            });
        } catch (error) {
            console.error('Lỗi khi xóa voucher:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi xóa voucher',
                error: error.message
            });
        }
    }
};

module.exports = voucherController;
