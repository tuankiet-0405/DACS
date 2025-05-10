// Patch para corregir el error de validación del formulario
document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que el formulario esté disponible
    const form = document.getElementById('carRegisterForm');
    if (!form) return;

    console.log('Aplicando parche de validación para el formulario de registro de vehículo...');
    
    // Sobrescribir el event listener de submit
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Form submit interceptado por el parche de validación');

        // Verificar términos y condiciones
        if (!document.getElementById('terms').checked) {
            Swal.fire({
                icon: 'error',
                title: 'Chưa đồng ý điều khoản',
                text: 'Vui lòng đồng ý với điều khoản và điều kiện để tiếp tục.'
            });
            return;
        }
          // Recopilar y validar datos obligatorios - Server requiere exactamente estos campos
        const requiredFields = [
            'brand', 'model', 'year', 'seats', 'transmission', 'fuel',
            'license_plate', 'price_per_day', 'location'
        ];
        
        const formData = new FormData();
        const missingFields = [];
        
        // Verificar y añadir campos al FormData
        for (const field of requiredFields) {
            const element = document.getElementById(field);
            if (!element || !element.value || element.value.trim() === '') {
                missingFields.push(field);
            } else {
                // Asegurarse de que el valor se envíe como string para evitar problemas
                const value = element.value.trim();
                formData.append(field, value);
                console.log(`Campo ${field}: ${value}`);
            }
        }
        
        // Debug información
        console.log("FormData campos antes de enviar:", [...formData.keys()].join(", "));
        
        // Mostrar error si faltan campos
        if (missingFields.length > 0) {
            console.error('Faltan campos obligatorios:', missingFields);
            Swal.fire({
                icon: 'error',
                title: 'Thiếu thông tin',
                html: 'Vui lòng điền đầy đủ các trường bắt buộc:<br>' + missingFields.join('<br>')
            });
            return;
        }
        
        // Validar formato de placa
        const licensePlate = document.getElementById('license_plate').value;
        const regex = /^[0-9]{2}[A-Z]{1,2}-[0-9]{4,5}$/;
        if (!regex.test(licensePlate)) {
            Swal.fire({
                icon: 'error',
                title: 'Biển số không hợp lệ',
                text: 'Vui lòng nhập đúng định dạng biển số (VD: 30A-12345)'
            });
            return;
        }
        
        // Validar precio mínimo
        const pricePerDay = parseInt(document.getElementById('price_per_day').value);
        if (isNaN(pricePerDay) || pricePerDay < 100000) {
            Swal.fire({
                icon: 'warning',
                title: 'Giá cho thuê quá thấp',
                text: 'Giá cho thuê nên ít nhất 100,000 VND/ngày.'
            });
            return;
        }
        
        // Verificar imágenes
        if (window.carImages && window.carImages.length < 4) {
            Swal.fire({
                icon: 'error',
                title: 'Thiếu hình ảnh',
                text: 'Vui lòng tải lên ít nhất 4 hình ảnh của xe.'
            });
            return;
        }
        
        // Verificar documento de registro
        if (!window.registrationImage) {
            Swal.fire({
                icon: 'error',
                title: 'Thiếu giấy tờ',
                text: 'Vui lòng tải lên hình ảnh đăng ký xe.'
            });
            return;
        }
        
        // Añadir campos adicionales al FormData
        formData.append('deposit', document.getElementById('deposit').value || 0);
        formData.append('km_limit', document.getElementById('km_limit').value || 0);
        formData.append('description', document.getElementById('description').value || '');
        formData.append('type', 'self-drive');  // Tipo fijo para esta página
        
        // Añadir características seleccionadas
        const selectedFeatures = [];
        document.querySelectorAll('input[name="features"]:checked').forEach(checkbox => {
            selectedFeatures.push(checkbox.value);
        });
        formData.append('features', JSON.stringify(selectedFeatures));
        
        // Añadir imágenes
        if (window.carImages) {
            window.carImages.forEach((file, index) => {
                formData.append('car_images', file);
            });
        }
        
        // Añadir documentos
        if (window.registrationImage) {
            formData.append('registration_image', window.registrationImage);
        }
        
        if (window.insuranceImage) {
            formData.append('insurance_image', window.insuranceImage);
        }
        
        // Mostrar loading
        Swal.fire({
            title: 'Đang đăng ký...',
            html: 'Vui lòng đợi trong giây lát...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        try {
            // Obtener token de autenticación
            const token = localStorage.getItem('token');
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            
            if (!token) {
                throw new Error('Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.');
            }
            
            console.log('Đang gửi request đến server với path: /api/cars');
            console.log('FormData fields:', [...formData.entries()].map(e => e[0]).join(', '));
            
            // Enviar datos al servidor
            const response = await axios.post('/api/cars', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('Server response:', response.data);
            
            // Procesar respuesta del servidor
            if (response.data.success) {
                const carId = response.data.data.id;
                
                // Mostrar mensaje de éxito
                Swal.fire({
                    icon: 'success',
                    title: 'Đăng ký thành công!',
                    html: `
                        <p>Xe của bạn đã được đăng ký thành công và đang chờ admin xét duyệt.</p>
                        <p class="mt-2" style="color: #10b981; font-weight: 500;">Thông tin cơ bản:</p>
                        <div style="text-align: left; background: #f8f9fa; padding: 12px; border-radius: 8px; margin: 10px 0;">
                            <p><b>Hãng xe:</b> ${document.getElementById('brand').value}</p>
                            <p><b>Mẫu xe:</b> ${document.getElementById('model').value}</p>
                            <p><b>Biển số:</b> ${document.getElementById('license_plate').value}</p>
                            <p><b>Giá thuê:</b> ${new Intl.NumberFormat('vi-VN').format(document.getElementById('price_per_day').value)} VND/ngày</p>
                        </div>
                        <p style="font-size: 0.9rem; margin-top: 12px; color: #6b7280;">Admin sẽ xem xét thông tin xe của bạn và duyệt trong thời gian sớm nhất.</p>
                    `,
                    confirmButtonText: 'Xem xe của tôi',
                    confirmButtonColor: '#10b981',
                    showCancelButton: true,
                    cancelButtonText: 'Đóng'
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Redirigir a la página de gestión de vehículos
                        window.location.href = '/views/mycars.html';
                    }
                });
                  // Notificar al admin con soporte offline
                try {
                    const brand = document.getElementById('brand').value;
                    const model = document.getElementById('model').value;
                    const licensePlate = document.getElementById('license_plate').value;
                    const year = document.getElementById('year').value;
                    const seats = document.getElementById('seats').value;
                    const pricePerDay = document.getElementById('price_per_day').value;
                    const location = document.getElementById('location').value;
                    
                    const carDetails = `
                        Hãng xe: ${brand}
                        Mẫu xe: ${model}
                        Biển số: ${licensePlate}
                        Năm sản xuất: ${year}
                        Số chỗ: ${seats}
                        Giá thuê: ${new Intl.NumberFormat('vi-VN').format(pricePerDay)} VND/ngày
                        Địa điểm: ${location}
                    `;
                    
                    console.log('Đang gửi thông báo đến admin với hỗ trợ offline');
                    
                    // Sử dụng hàm sendNotificationWithOfflineSupport để hỗ trợ offline
                    if (typeof sendNotificationWithOfflineSupport === 'function') {
                        const notification = {
                            tieu_de: 'Xe mới cần duyệt',
                            noi_dung: `Người dùng ${userData.ho_ten || ''} (ID: ${userData.id || ''}) vừa đăng ký xe ${brand} ${model} với biển số ${licensePlate}. ${carDetails}`,
                            loai_thong_bao: 'car_registration',
                            lien_ket: `/admin/cars/view/${carId}`
                        };
                        
                        const notifyResult = await sendNotificationWithOfflineSupport(notification);
                        
                        console.log('Kết quả gửi thông báo:', notifyResult);
                        
                        if (notifyResult.offline) {
                            console.log('Thông báo đã được lưu offline và sẽ gửi khi có kết nối internet');
                        } else {
                            console.log('Đã gửi thông báo thành công đến admin về xe mới');
                        }
                    } else {
                        // Fallback nếu hàm offline chưa được load
                        console.warn('Chức năng thông báo offline chưa sẵn sàng, sử dụng phương thức thông thường');
                        const notifyResponse = await axios.post('/api/notifications', {
                            tieu_de: 'Xe mới cần duyệt',
                            noi_dung: `Người dùng ${userData.ho_ten || ''} (ID: ${userData.id || ''}) vừa đăng ký xe ${brand} ${model} với biển số ${licensePlate}. ${carDetails}`,
                            loai_thong_bao: 'car_registration',
                            lien_ket: `/admin/cars/view/${carId}`
                        }, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        console.log('Kết quả gửi thông báo:', notifyResponse.data);
                    }
                } catch (notifyError) {
                    console.error('Lỗi khi gửi thông báo tới admin:', notifyError);
                }
            } else {
                throw new Error(response.data.message || 'Có lỗi xảy ra khi đăng ký xe.');
            }        } catch (error) {
            console.error('Lỗi khi đăng ký xe:', error);
            
            let errorMessage = 'Đã xảy ra lỗi khi đăng ký xe. Vui lòng thử lại sau.';
            let errorDetails = '';
            
            if (error.response) {
                console.log('Response error data:', error.response.data);
                errorMessage = error.response.data.message || errorMessage;
                errorDetails = error.response.status ? `Mã lỗi: ${error.response.status}` : '';
            } else if (error.request) {
                // Nếu không nhận được response, có thể là mất kết nối internet
                errorMessage = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối internet và thử lại.';
                console.log('Request error:', error.request);
                
                // Kiểm tra kết nối internet
                if (!navigator.onLine) {
                    errorMessage = 'Không có kết nối internet. Hệ thống sẽ lưu thông tin xe và đồng bộ khi có kết nối.';
                    // Lưu thông tin xe vào localStorage để đăng ký sau
                    try {
                        const carData = {};
                        for (const [key, value] of formData.entries()) {
                            if (typeof value === 'string') {
                                carData[key] = value;
                            }
                        }
                        // Lưu thông tin xe đang đăng ký
                        localStorage.setItem('pendingCarRegistration', JSON.stringify(carData));
                        console.log('Đã lưu thông tin xe để đăng ký sau khi có internet');
                    } catch (localStorageError) {
                        console.error('Lỗi khi lưu thông tin xe vào localStorage:', localStorageError);
                    }
                }
            } else {
                errorMessage = error.message;
            }
            
            Swal.fire({
                icon: 'error',
                title: 'Đăng ký thất bại',
                html: `<p>${errorMessage}</p>${errorDetails ? `<p style="font-size: 0.8rem; color: #777;">${errorDetails}</p>` : ''}`,
                footer: '<a href="/contact">Liên hệ hỗ trợ</a>'
            });
        }
    }, true); // Usar capturing para asegurarse de que este handler se ejecuta primero
    
    console.log('Parche de validación aplicado correctamente');
});
