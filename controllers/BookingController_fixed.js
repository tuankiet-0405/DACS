const db = require('../data/db');

const bookingController = {
    // Lấy danh sách tất cả đơn đặt xe với thông tin khách hàng và xe
    getAllBookings: async (req, res) => {
        try {
            // Truy vấn SQL đã cập nhật phù hợp với schema
            const query = `
                SELECT dxe.id, dxe.khach_hang_id, dxe.xe_id, dxe.ngay_bat_dau, dxe.ngay_ket_thuc, 
                       dxe.tong_tien, dxe.trang_thai, dxe.ngay_tao, dxe.ngay_cap_nhat, 1 as so_luong,
                       '' as voucher_code, 
                       nd.ho_ten, nd.email, nd.so_dien_thoai, '' as cmnd_cccd, nd.anh_dai_dien as avatar,
                       xe.ten_xe, xe.gia_thue, (SELECT url_hinh_anh FROM hinh_anh_xe WHERE xe_id = xe.id AND la_hinh_chinh = true LIMIT 1) as hinh_anh
                FROM dat_xe dxe
                JOIN nguoi_dung nd ON dxe.khach_hang_id = nd.id
                JOIN xe ON dxe.xe_id = xe.id
                ORDER BY dxe.ngay_tao DESC
            `;
            
            const [bookings] = await db.execute(query);
            
            // Định dạng lại dữ liệu trước khi trả về
            const formattedBookings = bookings.map(booking => {
                // Tính số ngày thuê
                const startDate = new Date(booking.ngay_bat_dau);
                const endDate = new Date(booking.ngay_ket_thuc);
                const diffTime = Math.abs(endDate - startDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                return {
                    id: booking.id,
                    customerInfo: {
                        id: booking.khach_hang_id,
                        name: booking.ho_ten,
                        email: booking.email,
                        phone: booking.so_dien_thoai,
                        idCard: booking.cmnd_cccd || '',
                        avatar: booking.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.ho_ten)}&background=2563eb&color=fff`
                    },
                    carInfo: {
                        id: booking.xe_id,
                        name: booking.ten_xe,
                        price: booking.gia_thue,
                        image: booking.hinh_anh
                    },
                    bookingDetails: {
                        startDate: booking.ngay_bat_dau,
                        endDate: booking.ngay_ket_thuc,
                        duration: `${diffDays} ngày`,
                        quantity: booking.so_luong || 1,
                        voucher: booking.voucher_code || "-",
                        totalPrice: booking.tong_tien,
                        status: booking.trang_thai
                    },
                    createdAt: booking.ngay_tao,
                    updatedAt: booking.ngay_cap_nhat
                };
            });
            
            res.status(200).json({
                success: true,
                message: 'Lấy danh sách đơn đặt xe thành công',
                bookings: formattedBookings
            });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách đơn đặt xe:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy danh sách đơn đặt xe',
                error: error.message
            });
        }
    },

    // Lấy thống kê đặt xe
    getBookingsStats: async (req, res) => {
        try {
            const [stats] = await db.execute(`
                SELECT 
                    COUNT(*) as total_bookings,
                    SUM(CASE WHEN trang_thai = 'dang_thue' THEN 1 ELSE 0 END) as renting,
                    SUM(CASE WHEN trang_thai = 'da_huy' THEN 1 ELSE 0 END) as cancelled,
                    SUM(CASE WHEN trang_thai = 'da_tra' THEN 1 ELSE 0 END) as returned
                FROM dat_xe
            `);
            
            res.status(200).json({
                success: true,
                message: 'Lấy thống kê đơn đặt xe thành công',
                data: {
                    totalBookings: stats[0].total_bookings || 0,
                    renting: stats[0].renting || 0,
                    cancelled: stats[0].cancelled || 0,
                    returned: stats[0].returned || 0
                }
            });
        } catch (error) {
            console.error('Lỗi khi lấy thống kê đơn đặt xe:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy thống kê đơn đặt xe',
                error: error.message
            });
        }
    },    // Lấy đơn đặt xe theo trạng thái
    getBookingsByStatus: async (req, res) => {
        try {
            const { status } = req.params;
            let statusValue;
            
            // Chuyển đổi trạng thái từ URL sang giá trị trong database
            switch(status) {
                case 'renting':
                    statusValue = 'dang_thue';
                    break;
                case 'returned':
                    statusValue = 'da_tra';
                    break;
                case 'cancelled':
                    statusValue = 'da_huy';
                    break;
                case 'pending':
                    statusValue = 'cho_duyet';
                    break;
                case 'approved':
                    statusValue = 'da_duyet';
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Trạng thái không hợp lệ'
                    });
            }
            
            const query = `
                SELECT dxe.id, dxe.khach_hang_id, dxe.xe_id, dxe.ngay_bat_dau, dxe.ngay_ket_thuc, 
                       dxe.tong_tien, dxe.trang_thai, dxe.ngay_tao, dxe.ngay_cap_nhat, 1 as so_luong,
                       '' as voucher_code, 
                       nd.ho_ten, nd.email, nd.so_dien_thoai, '' as cmnd_cccd, nd.anh_dai_dien as avatar,
                       xe.ten_xe, xe.gia_thue, (SELECT url_hinh_anh FROM hinh_anh_xe WHERE xe_id = xe.id AND la_hinh_chinh = true LIMIT 1) as hinh_anh
                FROM dat_xe dxe
                JOIN nguoi_dung nd ON dxe.khach_hang_id = nd.id
                JOIN xe ON dxe.xe_id = xe.id
                WHERE dxe.trang_thai = ?
                ORDER BY dxe.ngay_tao DESC
            `;
            
            const [bookings] = await db.execute(query, [statusValue]);
            
            const formattedBookings = bookings.map(booking => {
                const startDate = new Date(booking.ngay_bat_dau);
                const endDate = new Date(booking.ngay_ket_thuc);
                const diffTime = Math.abs(endDate - startDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                return {
                    id: booking.id,
                    customerInfo: {
                        id: booking.khach_hang_id,
                        name: booking.ho_ten,
                        email: booking.email,
                        phone: booking.so_dien_thoai,
                        idCard: booking.cmnd_cccd || '',
                        avatar: booking.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.ho_ten)}&background=2563eb&color=fff`
                    },
                    carInfo: {
                        id: booking.xe_id,
                        name: booking.ten_xe,
                        price: booking.gia_thue,
                        image: booking.hinh_anh
                    },
                    bookingDetails: {
                        startDate: booking.ngay_bat_dau,
                        endDate: booking.ngay_ket_thuc,
                        duration: `${diffDays} ngày`,
                        quantity: booking.so_luong || 1,
                        voucher: booking.voucher_code || "-",
                        totalPrice: booking.tong_tien,
                        status: booking.trang_thai
                    },
                    createdAt: booking.ngay_tao,
                    updatedAt: booking.ngay_cap_nhat
                };
            });
            
            res.status(200).json({
                success: true,
                message: `Lấy danh sách đơn đặt xe theo trạng thái ${status} thành công`,
                bookings: formattedBookings
            });
        } catch (error) {
            console.error('Lỗi khi lấy đơn đặt xe theo trạng thái:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy đơn đặt xe theo trạng thái',
                error: error.message
            });
        }
    },
    
    // Lấy chi tiết đơn đặt xe
    getBookingDetail: async (req, res) => {
        try {
            const { id } = req.params;
            
            const query = `
                SELECT dxe.id, dxe.khach_hang_id, dxe.xe_id, dxe.ngay_bat_dau, dxe.ngay_ket_thuc, 
                       dxe.dia_diem_giao_xe, dxe.dia_diem_tra_xe, dxe.tong_tien, dxe.trang_thai, 
                       dxe.ghi_chu, dxe.ngay_tao, dxe.ngay_cap_nhat, 1 as so_luong,
                       '' as voucher_code, 
                       nd.ho_ten, nd.email, nd.so_dien_thoai, '' as cmnd_cccd, nd.anh_dai_dien as avatar,
                       xe.ten_xe, xe.hang_xe, xe.loai_xe, xe.bien_so, xe.nam_san_xuat, xe.mau_xe,
                       xe.so_cho, xe.hop_so, xe.nhien_lieu, xe.gia_thue, xe.mo_ta, xe.tinh_trang,
                       (SELECT url_hinh_anh FROM hinh_anh_xe WHERE xe_id = xe.id AND la_hinh_chinh = true LIMIT 1) as hinh_anh
                FROM dat_xe dxe
                JOIN nguoi_dung nd ON dxe.khach_hang_id = nd.id
                JOIN xe ON dxe.xe_id = xe.id
                WHERE dxe.id = ?
            `;
            
            const [bookings] = await db.execute(query, [id]);
            
            if (bookings.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy đơn đặt xe'
                });
            }
            
            const booking = bookings[0];
            
            // Tính số ngày thuê
            const startDate = new Date(booking.ngay_bat_dau);
            const endDate = new Date(booking.ngay_ket_thuc);
            const diffTime = Math.abs(endDate - startDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Format dữ liệu
            const formattedBooking = {
                id: booking.id,
                customer: {
                    id: booking.khach_hang_id,
                    name: booking.ho_ten,
                    email: booking.email,
                    phone: booking.so_dien_thoai,
                    idCard: booking.cmnd_cccd || '',
                    avatar: booking.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.ho_ten)}&background=2563eb&color=fff`
                },
                car: {
                    id: booking.xe_id,
                    name: booking.ten_xe,
                    brand: booking.hang_xe,
                    type: booking.loai_xe,
                    licensePlate: booking.bien_so,
                    year: booking.nam_san_xuat,
                    color: booking.mau_xe,
                    seats: booking.so_cho,
                    transmission: booking.hop_so,
                    fuel: booking.nhien_lieu,
                    price: booking.gia_thue,
                    description: booking.mo_ta,
                    status: booking.tinh_trang,
                    image: booking.hinh_anh
                },
                booking: {
                    startDate: booking.ngay_bat_dau,
                    endDate: booking.ngay_ket_thuc,
                    duration: diffDays,
                    pickupLocation: booking.dia_diem_giao_xe,
                    returnLocation: booking.dia_diem_tra_xe,
                    quantity: booking.so_luong || 1,
                    voucher: booking.voucher_code || "-",
                    totalPrice: booking.tong_tien,
                    status: booking.trang_thai,
                    note: booking.ghi_chu || '',
                    createdAt: booking.ngay_tao,
                    updatedAt: booking.ngay_cap_nhat
                }
            };
            
            res.status(200).json({
                success: true,
                message: 'Lấy chi tiết đơn đặt xe thành công',
                booking: formattedBooking
            });
        } catch (error) {
            console.error('Lỗi khi lấy chi tiết đơn đặt xe:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi lấy chi tiết đơn đặt xe',
                error: error.message
            });
        }
    },

    // Cập nhật trạng thái đơn đặt xe
    updateBookingStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            
            // Kiểm tra trạng thái hợp lệ
            const validStatuses = ['cho_duyet', 'da_duyet', 'dang_thue', 'da_tra', 'da_huy'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Trạng thái không hợp lệ'
                });
            }
            
            // Kiểm tra đơn đặt xe tồn tại
            const [existingBooking] = await db.execute('SELECT id, xe_id, trang_thai FROM dat_xe WHERE id = ?', [id]);
            
            if (existingBooking.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy đơn đặt xe'
                });
            }
            
            const booking = existingBooking[0];
            const carId = booking.xe_id;
            
            // Cập nhật trạng thái đơn đặt xe
            await db.execute('UPDATE dat_xe SET trang_thai = ?, ngay_cap_nhat = NOW() WHERE id = ?', [status, id]);
            
            // Cập nhật trạng thái xe (nếu cần)
            if (status === 'dang_thue') {
                // Nếu đơn chuyển sang "đang thuê", cập nhật xe sang "đang thuê"
                await db.execute('UPDATE xe SET tinh_trang = "dang_thue" WHERE id = ?', [carId]);
            } else if (status === 'da_tra' && booking.trang_thai === 'dang_thue') {
                // Nếu đơn từ "đang thuê" chuyển sang "đã trả", cập nhật xe sang "sẵn sàng"
                await db.execute('UPDATE xe SET tinh_trang = "san_sang" WHERE id = ?', [carId]);
            }
            
            res.status(200).json({
                success: true,
                message: 'Cập nhật trạng thái đơn đặt xe thành công',
                booking: { id, status }
            });
        } catch (error) {
            console.error('Lỗi khi cập nhật trạng thái đơn đặt xe:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi khi cập nhật trạng thái đơn đặt xe',
                error: error.message
            });
        }
    }
};

module.exports = bookingController;
