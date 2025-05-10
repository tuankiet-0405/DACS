# Xử lý hình ảnh trong hệ thống quản lý xe

## Tổng quan
Tài liệu này mô tả cách hệ thống xử lý hình ảnh xe trong việc tạo mới và cập nhật.

## Cấu trúc dữ liệu
Hệ thống lưu trữ hình ảnh xe trong bảng `hinh_anh_xe` với cấu trúc như sau:
```sql
CREATE TABLE hinh_anh_xe (
    id INT PRIMARY KEY AUTO_INCREMENT,
    xe_id INT NOT NULL,
    url_hinh_anh VARCHAR(255) NOT NULL,
    la_hinh_chinh BOOLEAN DEFAULT FALSE,
    ngay_tao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (xe_id) REFERENCES xe(id)
);
```

## Quy trình tải lên hình ảnh
1. **Client-side**:
   - Người dùng chọn hình ảnh thông qua giao diện
   - Hệ thống kiểm tra kích thước file (giới hạn 5MB) và loại file (chỉ chấp nhận hình ảnh)
   - Chuyển đổi hình ảnh thành dạng Data URL để gửi lên server
   - Hiển thị xem trước hình ảnh cho người dùng

2. **Server-side**:
   - Nhận dữ liệu hình ảnh dưới dạng URL từ client
   - Khi tạo xe mới: Tạo bản ghi mới trong bảng `hinh_anh_xe` và liên kết với xe thông qua `xe_id`
   - Khi cập nhật xe: Kiểm tra xem đã có hình ảnh cho xe chưa, nếu có thì cập nhật URL, nếu chưa thì tạo mới

## Cách cập nhật hình ảnh
Khi người dùng cập nhật thông tin xe và thay đổi hình ảnh:
1. Trong CarController.js:
   - Kiểm tra xem đã có hình ảnh chính cho xe hay chưa
   - Nếu có thì cập nhật URL của hình ảnh
   - Nếu chưa thì thêm hình ảnh mới với thuộc tính `la_hinh_chinh = TRUE`

## Xử lý lỗi
- Kiểm tra kích thước file: Hình ảnh không được vượt quá 5MB
- Kiểm tra định dạng file: Chỉ chấp nhận file hình ảnh (image/*)
- Xử lý các trường hợp không tìm thấy hình ảnh: Hiển thị hình ảnh placeholder

## Cải tiến tương lai
1. Hỗ trợ nhiều hình ảnh cho mỗi xe
2. Tích hợp dịch vụ lưu trữ đám mây (như AWS S3, Google Cloud Storage)
3. Tối ưu hóa kích thước và chất lượng hình ảnh
4. Thêm bộ chọn crop/resize hình ảnh trên client
