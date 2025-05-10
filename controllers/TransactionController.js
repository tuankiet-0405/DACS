const db = require('../data/db');

// Helper functions for mapping database values to display values
function mapPaymentMethod(method) {
    switch(method) {
        case 'tien_mat': return 'Tiền mặt';
        case 'chuyen_khoan': return 'Chuyển khoản';
        case 'vi_dien_tu': return 'Ví điện tử';
        default: return method;
    }
}

function mapPaymentStatus(status) {
    switch(status) {
        case 'cho_thanh_toan': return 'Chờ thanh toán';
        case 'da_thanh_toan': return 'Đã thanh toán';
        case 'hoan_tien': return 'Hoàn tiền';
        default: return 'Chưa thanh toán';
    }
}

const transactionController = {
    // Lấy danh sách tất cả giao dịch với thông tin khách hàng và xe
    getAllTransactions: async (req, res) => {
        try {
            // Truy vấn SQL để lấy thông tin giao dịch từ bảng dat_xe 
            // join với thông tin khách hàng, xe và thanh toán
            const query = `
                SELECT dxe.id, dxe.khach_hang_id, dxe.xe_id, dxe.ngay_bat_dau, dxe.ngay_ket_thuc, 
                       dxe.tong_tien, dxe.trang_thai, dxe.ngay_tao, dxe.ngay_cap_nhat,
                       dxe.ghi_chu,
                       nd.ho_ten, nd.email, nd.so_dien_thoai, nd.anh_dai_dien as avatar,
                       xe.ten_xe, xe.gia_thue, xe.bien_so,
                       (SELECT url_hinh_anh FROM hinh_anh_xe WHERE xe_id = xe.id AND la_hinh_chinh = true LIMIT 1) as hinh_anh,
                       tt.phuong_thuc_thanh_toan, tt.ma_giao_dich, tt.trang_thai as trang_thai_thanh_toan
                FROM dat_xe dxe
                JOIN nguoi_dung nd ON dxe.khach_hang_id = nd.id
                JOIN xe ON dxe.xe_id = xe.id
                LEFT JOIN thanh_toan tt ON dxe.id = tt.dat_xe_id
                ORDER BY dxe.ngay_tao DESC
            `;
            
            const [transactions] = await db.execute(query);
            
            // Định dạng lại dữ liệu trước khi trả về
            const formattedTransactions = transactions.map(transaction => {
                // Tính số ngày thuê
                const startDate = new Date(transaction.ngay_bat_dau);
                const endDate = new Date(transaction.ngay_ket_thuc);
                const diffTime = Math.abs(endDate - startDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                // Tạo mã giao dịch nếu không có
                const transactionId = transaction.ma_giao_dich || `GD${String(transaction.id).padStart(3, '0')}`;
                
                return {
                    id: transaction.id,
                    transactionId: transactionId,
                    customerInfo: {
                        id: transaction.khach_hang_id,
                        name: transaction.ho_ten,
                        email: transaction.email,
                        phone: transaction.so_dien_thoai,
                        idCard: transaction.cmnd_cccd || '',
                        avatar: transaction.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(transaction.ho_ten)}&background=2563eb&color=fff`,
                        customerId: `KH${String(transaction.khach_hang_id).padStart(3, '0')}`
                    },
                    carInfo: {
                        id: transaction.xe_id,
                        name: transaction.ten_xe,
                        price: transaction.gia_thue,
                        image: transaction.hinh_anh,
                        licensePlate: transaction.bien_so
                    },
                    bookingDetails: {
                        startDate: transaction.ngay_bat_dau,
                        endDate: transaction.ngay_ket_thuc,
                        duration: `${diffDays} ngày`,
                        totalPrice: transaction.tong_tien,
                        status: transaction.trang_thai,
                        paymentMethod: transaction.phuong_thuc_thanh_toan || 'Chuyển khoản'
                    },
                    createdAt: transaction.ngay_tao,
                    updatedAt: transaction.ngay_cap_nhat
                };
            });
            
            res.status(200).json({
                success: true,
                message: 'Lấy danh sách giao dịch thành công',
                transactions: formattedTransactions
            });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách giao dịch:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy danh sách giao dịch',
                error: error.message
            });
        }
    },

    // Lấy chi tiết giao dịch theo ID
    getTransactionById: async (req, res) => {
        try {
            const { id } = req.params;
              const query = `
                SELECT dxe.id, dxe.khach_hang_id, dxe.xe_id, dxe.ngay_bat_dau, dxe.ngay_ket_thuc, 
                       dxe.tong_tien, dxe.trang_thai, dxe.ngay_tao, dxe.ngay_cap_nhat,
                       dxe.ghi_chu, dxe.dia_diem_giao_xe, dxe.dia_diem_tra_xe,
                       nd.ho_ten, nd.email, nd.so_dien_thoai, nd.anh_dai_dien as avatar,
                       xe.ten_xe, xe.gia_thue, xe.bien_so,
                       (SELECT url_hinh_anh FROM hinh_anh_xe WHERE xe_id = xe.id AND la_hinh_chinh = true LIMIT 1) as hinh_anh,
                       tp.id as thanh_toan_id, tp.phuong_thuc_thanh_toan, tp.ma_giao_dich, tp.trang_thai as trang_thai_thanh_toan,
                       tp.ngay_thanh_toan, tp.so_tien as so_tien_thanh_toan, tp.ghi_chu as ghi_chu_thanh_toan
                FROM dat_xe dxe
                JOIN nguoi_dung nd ON dxe.khach_hang_id = nd.id
                JOIN xe ON dxe.xe_id = xe.id
                LEFT JOIN thanh_toan tp ON dxe.id = tp.dat_xe_id
                WHERE dxe.id = ? OR tp.ma_giao_dich = ?
            `;
            
            const [results] = await db.execute(query, [id, id]);
            
            if (results.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy giao dịch'
                });
            }
            
            const transaction = results[0];
            
            // Tính số ngày thuê
            const startDate = new Date(transaction.ngay_bat_dau);
            const endDate = new Date(transaction.ngay_ket_thuc);
            const diffTime = Math.abs(endDate - startDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Tạo mã giao dịch nếu không có
            const transactionId = transaction.ma_giao_dich || `GD${String(transaction.id).padStart(3, '0')}`;
            
            // Tìm lịch sử trạng thái giao dịch
            const timelineQuery = `
                SELECT trang_thai, ngay_cap_nhat
                FROM lich_su_giao_dich
                WHERE dat_xe_id = ?
                ORDER BY ngay_cap_nhat ASC
            `;
            
            const [timelineResults] = await db.execute(timelineQuery, [transaction.id]);
            
            // Tạo timeline dựa trên lịch sử hoặc mặc định nếu không có
            let timeline = [];
            
            if (timelineResults.length > 0) {
                timeline = timelineResults.map(item => ({
                    status: item.trang_thai,
                    timestamp: item.ngay_cap_nhat
                }));
            } else {
                // Timeline mặc định nếu không có lịch sử
                timeline = [
                    {
                        status: 'dat_xe',
                        timestamp: transaction.ngay_tao,
                        label: 'Đặt xe'
                    }
                ];
                
                // Thêm các trạng thái khác dựa vào trạng thái hiện tại
                if (['dang_thue', 'da_tra', 'hoan_thanh'].includes(transaction.trang_thai)) {
                    timeline.push({
                        status: 'thanh_toan',
                        timestamp: new Date(new Date(transaction.ngay_tao).getTime() + 5*60000),
                        label: 'Thanh toán'
                    });
                    
                    timeline.push({
                        status: 'dang_thue',
                        timestamp: transaction.ngay_bat_dau,
                        label: 'Nhận xe'
                    });
                }
                
                if (['da_tra', 'hoan_thanh'].includes(transaction.trang_thai)) {
                    timeline.push({
                        status: 'da_tra',
                        timestamp: transaction.ngay_ket_thuc,
                        label: 'Hoàn thành'
                    });
                }
            }
            
            // Định dạng dữ liệu để phản hồi
            const formattedTransaction = {
                id: transaction.id,
                transactionId: transactionId,
                customerInfo: {
                    id: transaction.khach_hang_id,
                    name: transaction.ho_ten,
                    email: transaction.email,
                    phone: transaction.so_dien_thoai,
                    idCard: transaction.cmnd_cccd || '',
                    avatar: transaction.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(transaction.ho_ten)}&background=2563eb&color=fff`,
                    customerId: `KH${String(transaction.khach_hang_id).padStart(3, '0')}`
                },
                carInfo: {
                    id: transaction.xe_id,
                    name: transaction.ten_xe,
                    price: transaction.gia_thue,
                    serviceFee: transaction.phi_dich_vu || 100000, // Phí dịch vụ mặc định
                    image: transaction.hinh_anh,
                    licensePlate: transaction.bien_so
                },
                bookingDetails: {
                    startDate: transaction.ngay_bat_dau,
                    endDate: transaction.ngay_ket_thuc,
                    duration: diffDays,
                    totalPrice: transaction.tong_tien,
                    status: transaction.trang_thai,
                    paymentMethod: transaction.phuong_thuc_thanh_toan || 'Chuyển khoản',
                    notes: transaction.ghi_chu || ''
                },
                timeline: timeline,
                createdAt: transaction.ngay_tao,
                updatedAt: transaction.ngay_cap_nhat
            };
            
            res.status(200).json({
                success: true,
                message: 'Lấy chi tiết giao dịch thành công',
                transaction: formattedTransaction
            });
        } catch (error) {
            console.error('Lỗi khi lấy chi tiết giao dịch:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy chi tiết giao dịch',
                error: error.message
            });
        }
    },

    // Lấy thống kê giao dịch
    getTransactionStats: async (req, res) => {
        try {            // Thống kê tổng doanh thu
            const revenueQuery = `
                SELECT 
                    SUM(tong_tien) as total_revenue,
                    COUNT(*) as total_transactions
                FROM dat_xe
                WHERE trang_thai NOT IN ('da_huy', 'cho_duyet')
            `;
            
            // Thống kê giao dịch tháng này
            const currentDate = new Date();
            const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            
            const monthlyQuery = `
                SELECT 
                    COUNT(*) as monthly_transactions,
                    SUM(tong_tien) as monthly_revenue
                FROM dat_xe
                WHERE ngay_tao BETWEEN ? AND ?
                AND trang_thai NOT IN ('da_huy', 'tu_choi')
            `;
            
            // Thống kê giao dịch tháng trước để tính tăng trưởng
            const firstDayOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            const lastDayOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
            
            const lastMonthQuery = `
                SELECT 
                    COUNT(*) as last_month_transactions,
                    SUM(tong_tien) as last_month_revenue
                FROM dat_xe
                WHERE ngay_tao BETWEEN ? AND ?
                AND trang_thai NOT IN ('da_huy', 'tu_choi')
            `;
            
            const [revenueResults] = await db.execute(revenueQuery);
            const [monthlyResults] = await db.execute(monthlyQuery, [
                firstDayOfMonth.toISOString(), 
                lastDayOfMonth.toISOString()
            ]);
            const [lastMonthResults] = await db.execute(lastMonthQuery, [
                firstDayOfLastMonth.toISOString(), 
                lastDayOfLastMonth.toISOString()
            ]);
            
            // Tính tỷ lệ tăng trưởng
            const currentMonthRevenue = monthlyResults[0].monthly_revenue || 0;
            const lastMonthRevenue = lastMonthResults[0].last_month_revenue || 0;
            
            let growthRate = 0;
            if (lastMonthRevenue > 0) {
                growthRate = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
            } else if (currentMonthRevenue > 0) {
                growthRate = 100; // Nếu tháng trước không có doanh thu
            }
            
            res.status(200).json({
                success: true,
                message: 'Lấy thống kê giao dịch thành công',
                stats: {
                    totalRevenue: revenueResults[0].total_revenue || 0,
                    totalTransactions: revenueResults[0].total_transactions || 0,
                    monthlyTransactions: monthlyResults[0].monthly_transactions || 0,
                    monthlyRevenue: monthlyResults[0].monthly_revenue || 0,
                    growthRate: parseFloat(growthRate.toFixed(1))
                }
            });
        } catch (error) {
            console.error('Lỗi khi lấy thống kê giao dịch:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy thống kê giao dịch',
                error: error.message
            });
        }
    },

    // Lọc giao dịch theo trạng thái
    getTransactionsByStatus: async (req, res) => {
        try {
            const { status } = req.params;
              // Map frontend status to database status
            let dbStatus = '';
            switch (status) {
                case 'completed':
                    dbStatus = 'da_tra';
                    break;
                case 'pending':
                    dbStatus = 'dang_thue';
                    break;
                case 'processing':
                    dbStatus = 'da_duyet';
                    break;
                case 'cancelled':
                    dbStatus = 'da_huy';
                    break;
                default:
                    dbStatus = '';
            }
            
            let query = `
                SELECT dxe.id, dxe.khach_hang_id, dxe.xe_id, dxe.ngay_bat_dau, dxe.ngay_ket_thuc, 
                       dxe.tong_tien, dxe.trang_thai, dxe.ngay_tao, dxe.ngay_cap_nhat,
                       dxe.ma_giao_dich, dxe.phuong_thuc_thanh_toan,
                       nd.ho_ten, nd.email, nd.so_dien_thoai, nd.cmnd_cccd, nd.anh_dai_dien as avatar,
                       xe.ten_xe, xe.gia_thue, xe.bien_so,
                       (SELECT url_hinh_anh FROM hinh_anh_xe WHERE xe_id = xe.id AND la_hinh_chinh = true LIMIT 1) as hinh_anh
                FROM dat_xe dxe
                JOIN nguoi_dung nd ON dxe.khach_hang_id = nd.id
                JOIN xe ON dxe.xe_id = xe.id
            `;
            
            // Add WHERE clause only if a specific status is requested
            const queryParams = [];
            if (dbStatus) {
                query += ' WHERE dxe.trang_thai = ?';
                queryParams.push(dbStatus);
            }
            
            query += ' ORDER BY dxe.ngay_tao DESC';
            
            const [transactions] = await db.execute(query, queryParams);
            
            // Định dạng lại dữ liệu trước khi trả về
            const formattedTransactions = transactions.map(transaction => {
                // Tính số ngày thuê
                const startDate = new Date(transaction.ngay_bat_dau);
                const endDate = new Date(transaction.ngay_ket_thuc);
                const diffTime = Math.abs(endDate - startDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                // Tạo mã giao dịch nếu không có
                const transactionId = transaction.ma_giao_dich || `GD${String(transaction.id).padStart(3, '0')}`;
                
                return {
                    id: transaction.id,
                    transactionId: transactionId,
                    customerInfo: {
                        id: transaction.khach_hang_id,
                        name: transaction.ho_ten,
                        email: transaction.email,
                        phone: transaction.so_dien_thoai,
                        idCard: transaction.cmnd_cccd || '',
                        avatar: transaction.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(transaction.ho_ten)}&background=2563eb&color=fff`,
                        customerId: `KH${String(transaction.khach_hang_id).padStart(3, '0')}`
                    },
                    carInfo: {
                        id: transaction.xe_id,
                        name: transaction.ten_xe,
                        price: transaction.gia_thue,
                        image: transaction.hinh_anh,
                        licensePlate: transaction.bien_so
                    },
                    bookingDetails: {
                        startDate: transaction.ngay_bat_dau,
                        endDate: transaction.ngay_ket_thuc,
                        duration: `${diffDays} ngày`,
                        totalPrice: transaction.tong_tien,
                        status: transaction.trang_thai,
                        paymentMethod: transaction.phuong_thuc_thanh_toan || 'Chuyển khoản'
                    },
                    createdAt: transaction.ngay_tao,
                    updatedAt: transaction.ngay_cap_nhat
                };
            });
            
            res.status(200).json({
                success: true,
                message: 'Lọc giao dịch thành công',
                transactions: formattedTransactions
            });
        } catch (error) {
            console.error('Lỗi khi lọc giao dịch theo trạng thái:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lọc giao dịch',
                error: error.message
            });
        }
    },

    // Export giao dịch theo khoảng thời gian
    exportTransactions: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            
            let query = `
                SELECT dxe.id, dxe.khach_hang_id, dxe.xe_id, dxe.ngay_bat_dau, dxe.ngay_ket_thuc, 
                       dxe.tong_tien, dxe.trang_thai, dxe.ngay_tao, dxe.ngay_cap_nhat,
                       dxe.ma_giao_dich, dxe.phuong_thuc_thanh_toan,
                       nd.ho_ten, nd.email, nd.so_dien_thoai,
                       xe.ten_xe, xe.bien_so
                FROM dat_xe dxe
                JOIN nguoi_dung nd ON dxe.khach_hang_id = nd.id
                JOIN xe ON dxe.xe_id = xe.id
                WHERE 1=1
            `;
            
            const queryParams = [];
            
            if (startDate && endDate) {
                query += ' AND dxe.ngay_tao BETWEEN ? AND ?';
                queryParams.push(startDate, endDate);
            }
            
            query += ' ORDER BY dxe.ngay_tao DESC';
            
            const [transactions] = await db.execute(query, queryParams);
            
            // Format data for export
            const exportData = transactions.map(t => {
                // Calculate rental days
                const startDate = new Date(t.ngay_bat_dau);
                const endDate = new Date(t.ngay_ket_thuc);
                const diffTime = Math.abs(endDate - startDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                let status = '';
                switch (t.trang_thai) {
                    case 'dang_thue': status = 'Đang thuê'; break;
                    case 'da_tra': status = 'Đã hoàn thành'; break;
                    case 'da_huy': status = 'Đã hủy'; break;
                    case 'cho_duyet': status = 'Chờ duyệt'; break;
                    default: status = t.trang_thai;
                }
                
                return {
                    'Mã GD': t.ma_giao_dich || `GD${String(t.id).padStart(3, '0')}`,
                    'Khách hàng': t.ho_ten,
                    'Email': t.email,
                    'Số điện thoại': t.so_dien_thoai,
                    'Xe thuê': t.ten_xe,
                    'Biển số': t.bien_so,
                    'Ngày bắt đầu': new Date(t.ngay_bat_dau).toLocaleDateString('vi-VN'),
                    'Ngày kết thúc': new Date(t.ngay_ket_thuc).toLocaleDateString('vi-VN'),
                    'Thời gian thuê': `${diffDays} ngày`,
                    'Trạng thái': status,
                    'Tổng tiền': t.tong_tien.toLocaleString('vi-VN') + 'đ',
                    'Ngày tạo': new Date(t.ngay_tao).toLocaleDateString('vi-VN'),
                    'Phương thức thanh toán': t.phuong_thuc_thanh_toan || 'Chuyển khoản'
                };
            });
            
            res.status(200).json({
                success: true,
                message: 'Export giao dịch thành công',
                data: exportData
            });
        } catch (error) {
            console.error('Lỗi khi export giao dịch:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi export giao dịch',
                error: error.message
            });
        }
    }
};

module.exports = transactionController;
