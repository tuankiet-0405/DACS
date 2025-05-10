/**
 * Middleware để kiểm tra và xác thực các tham số yêu cầu
 */

// Validation cho các route lấy thông tin giao dịch theo trạng thái
const validateStatusParam = (req, res, next) => {
    const { status } = req.params;
    const validStatuses = ['all', 'completed', 'pending', 'processing', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Trạng thái không hợp lệ'
        });
    }
    
    next();
};

// Validation cho route lấy chi tiết giao dịch
const validateTransactionIdParam = (req, res, next) => {
    const { id } = req.params;
    
    if (!id) {
        return res.status(400).json({
            success: false,
            message: 'ID giao dịch không được để trống'
        });
    }
    
    next();
};

// Validation cho route xuất báo cáo
const validateExportParams = (req, res, next) => {
    const { startDate, endDate } = req.query;
    
    // Kiểm tra nếu có startDate thì phải có endDate và ngược lại
    if ((startDate && !endDate) || (!startDate && endDate)) {
        return res.status(400).json({
            success: false,
            message: 'Phải cung cấp cả ngày bắt đầu và ngày kết thúc'
        });
    }
    
    // Kiểm tra định dạng ngày nếu có
    if (startDate && endDate) {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        
        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Định dạng ngày không hợp lệ'
            });
        }
        
        if (startDateObj > endDateObj) {
            return res.status(400).json({
                success: false,
                message: 'Ngày bắt đầu không thể sau ngày kết thúc'
            });
        }
    }
    
    next();
};

// Validation cho các route quản lý voucher
const validateVoucherStatusParam = (req, res, next) => {
    const { status } = req.params;
    const validStatuses = ['all', 'active', 'scheduled', 'expired'];
    
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Trạng thái voucher không hợp lệ'
        });
    }
    
    next();
};

// Validation cho route lấy chi tiết voucher
const validateVoucherIdParam = (req, res, next) => {
    const { id } = req.params;
    
    if (!id) {
        return res.status(400).json({
            success: false,
            message: 'ID voucher không được để trống'
        });
    }
    
    next();
};

// Validation cho dữ liệu voucher khi tạo hoặc cập nhật
const validateVoucherData = (req, res, next) => {
    const { code, discountType, value, startDate, endDate, quantity } = req.body;
    
    // Kiểm tra các trường bắt buộc
    if (!code) {
        return res.status(400).json({
            success: false,
            message: 'Mã voucher không được để trống'
        });
    }
    
    if (!discountType || !['percentage', 'fixed'].includes(discountType)) {
        return res.status(400).json({
            success: false,
            message: 'Loại giảm giá không hợp lệ'
        });
    }
    
    if (value === undefined || value === null || isNaN(value) || value <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Giá trị giảm giá phải lớn hơn 0'
        });
    }
    
    // Kiểm tra giới hạn giá trị cho loại percentage
    if (discountType === 'percentage' && (value <= 0 || value > 100)) {
        return res.status(400).json({
            success: false,
            message: 'Phần trăm giảm giá phải nằm trong khoảng 1-100'
        });
    }
    
    // Kiểm tra thời gian
    if (startDate && endDate) {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        
        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Định dạng ngày không hợp lệ'
            });
        }
        
        if (startDateObj >= endDateObj) {
            return res.status(400).json({
                success: false,
                message: 'Ngày bắt đầu phải trước ngày kết thúc'
            });
        }
    }
    
    // Kiểm tra số lượng
    if (quantity !== undefined && (isNaN(quantity) || quantity < 0)) {
        return res.status(400).json({
            success: false,
            message: 'Số lượng voucher không hợp lệ'
        });
    }
    
    next();
};

module.exports = {
    validateStatusParam,
    validateTransactionIdParam,
    validateExportParams,
    validateVoucherStatusParam,
    validateVoucherIdParam,
    validateVoucherData
};
