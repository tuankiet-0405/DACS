document.addEventListener('DOMContentLoaded', function () {
    // Form đăng ký
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Form đăng nhập
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Kiểm tra mật khẩu trùng khớp khi gõ
    const confirmPasswordField = document.getElementById('registerConfirmPassword');
    if (confirmPasswordField) {
        confirmPasswordField.addEventListener('input', checkPasswordMatch);
    }
});

// Xử lý sự kiện đăng ký
async function handleRegister(event) {
    event.preventDefault();

    // Lấy các trường dữ liệu
    const ho_ten = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const so_dien_thoai = document.getElementById('registerPhone').value.trim();
    const mat_khau = document.getElementById('registerPassword').value;
    const xac_nhan_mat_khau = document.getElementById('registerConfirmPassword').value;

    // Lấy giới tính được chọn
    const genderInputs = document.getElementsByName('gioi_tinh');
    let gioi_tinh = '';
    for (const input of genderInputs) {
        if (input.checked) {
            gioi_tinh = input.value;
            break;
        }
    }

    // Reset thông báo lỗi
    clearErrors();

    // Validate form
    let isValid = true;

    // Kiểm tra họ tên
    if (!ho_ten) {
        displayError('nameError', 'Vui lòng nhập họ tên');
        isValid = false;
    } else if (ho_ten.length < 3) {
        displayError('nameError', 'Họ tên phải có ít nhất 3 ký tự');
        isValid = false;
    }

    // Kiểm tra email
    if (!email) {
        displayError('emailError', 'Vui lòng nhập email');
        isValid = false;
    } else if (!isValidEmail(email)) {
        displayError('emailError', 'Email không hợp lệ');
        isValid = false;
    }

    // Kiểm tra số điện thoại
    if (so_dien_thoai && !isValidPhone(so_dien_thoai)) {
        displayError('phoneError', 'Số điện thoại không hợp lệ');
        isValid = false;
    }

    // Kiểm tra mật khẩu
    if (!mat_khau) {
        displayError('passwordError', 'Vui lòng nhập mật khẩu');
        isValid = false;
    } else if (mat_khau.length < 6) {
        displayError('passwordError', 'Mật khẩu phải có ít nhất 6 ký tự');
        isValid = false;
    }

    // Kiểm tra xác nhận mật khẩu
    if (!xac_nhan_mat_khau) {
        displayError('confirmPasswordError', 'Vui lòng xác nhận mật khẩu');
        isValid = false;
    } else if (mat_khau !== xac_nhan_mat_khau) {
        displayError('confirmPasswordError', 'Mật khẩu xác nhận không khớp');
        isValid = false;
    }

    // Kiểm tra giới tính
    if (!gioi_tinh) {
        displayError('errorContainer', 'Vui lòng chọn giới tính');
        isValid = false;
    }

    if (!isValid) {
        return;
    }

    // Chuẩn bị dữ liệu để gửi
    const userData = {
        ho_ten,
        email,
        mat_khau,
        xac_nhan_mat_khau,
        so_dien_thoai,
        gioi_tinh
    };

    try {
        // Hiển thị loading nếu cần
        // showLoading();

        // Gửi request đến API
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        // Ẩn loading nếu có
        // hideLoading();

        if (response.ok) {
            // Đăng ký thành công
            showSuccess(data.message || 'Đăng ký thành công!');

            // Lưu token vào localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Chuyển hướng sau 1.5 giây
            setTimeout(() => {
                window.location.href = 'http://localhost:3000/views/login.html';
            }, 1500);
        } else {
            // Đăng ký thất bại
            showError(data.message || 'Đăng ký thất bại. Vui lòng thử lại.');
        }
    } catch (error) {
        console.error('Lỗi khi đăng ký:', error);
        showError('Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại sau.');
    }
}

// Xử lý sự kiện đăng nhập
async function handleLogin(event) {
    event.preventDefault();

    // Lấy các trường dữ liệu
    const email = document.getElementById('loginEmail').value.trim();
    const mat_khau = document.getElementById('loginPassword').value;
    const remember = document.getElementById('rememberMe').checked;

    // Reset thông báo lỗi
    clearErrors();

    // Validate form
    let isValid = true;

    // Kiểm tra email
    if (!email) {
        displayError('loginEmailError', 'Vui lòng nhập email');
        isValid = false;
    } else if (!isValidEmail(email)) {
        displayError('loginEmailError', 'Email không hợp lệ');
        isValid = false;
    }

    // Kiểm tra mật khẩu
    if (!mat_khau) {
        displayError('loginPasswordError', 'Vui lòng nhập mật khẩu');
        isValid = false;
    }

    if (!isValid) {
        return;
    }

    // Chuẩn bị dữ liệu để gửi
    const loginData = {
        email,
        mat_khau,
        remember
    };

    try {
        // Hiển thị loading nếu cần
        // showLoading();

        // Xóa dữ liệu xác thực cũ trước khi đăng nhập mới
        clearAuthData();

        // Gửi request đến API
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        const data = await response.json();

        // Ẩn loading nếu có
        // hideLoading();

        if (response.ok) {
            // Đăng nhập thành công
            showSuccess(data.message || 'Đăng nhập thành công!');

            // Lưu token vào localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Ghi lại thông tin token để debug
            console.log("Đăng nhập thành công! Token:", data.token);
            console.log("Thông tin người dùng:", data.user);

            // Đặt cookie với token để đồng bộ với server
            document.cookie = `token=${data.token}; path=/; max-age=${24 * 60 * 60}`; // Hết hạn sau 24 giờ

            // Xử lý "Ghi nhớ đăng nhập"
            if (remember) {
                localStorage.setItem('rememberedEmail', email);
                localStorage.setItem('rememberMe', 'true');
            } else {
                localStorage.removeItem('rememberedEmail');
                localStorage.removeItem('rememberMe');
            }

            // Chuyển hướng sau 1.5 giây
            setTimeout(() => {
                // Nếu là admin, chuyển đến trang admin
                if (data.user.loai_tai_khoan === 'admin') {
                    window.location.href = '/views/AdminTrangChu.html';
                } else {
                    window.location.href = '/public/index.html';
                }
            }, 1500);
        } else {
            // Đăng nhập thất bại
            showError(data.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
        }
    } catch (error) {
        console.error('Lỗi khi đăng nhập:', error);
        showError('Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại sau.');
    }
}

// Kiểm tra mật khẩu trùng khớp
function checkPasswordMatch() {
    const passwordField = document.getElementById('registerPassword');
    const confirmPasswordField = document.getElementById('registerConfirmPassword');
    const passwordMatchIcon = document.getElementById('passwordMatchIcon');

    if (!confirmPasswordField.value) {
        passwordMatchIcon.style.display = 'none';
        return;
    }

    if (passwordField.value === confirmPasswordField.value) {
        passwordMatchIcon.innerHTML = '<i class="fas fa-check" style="color: #38a169;"></i>';
        passwordMatchIcon.style.display = 'block';
        document.getElementById('confirmPasswordError').style.display = 'none';
    } else {
        passwordMatchIcon.innerHTML = '<i class="fas fa-times" style="color: #e53e3e;"></i>';
        passwordMatchIcon.style.display = 'block';
    }
}

// Hiển thị thông báo lỗi
function displayError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// Xóa tất cả thông báo lỗi
function clearErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => {
        element.textContent = '';
        element.style.display = 'none';
    });
}

// Hiển thị thông báo lỗi chung
function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
    }
}

// Hiển thị thông báo thành công
function showSuccess(message) {
    const successContainer = document.getElementById('successContainer');
    if (successContainer) {
        successContainer.textContent = message;
        successContainer.style.display = 'block';
    }
}

// Kiểm tra email hợp lệ
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Kiểm tra số điện thoại hợp lệ
function isValidPhone(phone) {
    const phoneRegex = /^(0|\+84)(\d{9,10})$/;
    return phoneRegex.test(phone);
}

// Kiểm tra đăng nhập
function checkAuthentication() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (token && user.id) {
        return true;
    }
    return false;
}

// Xóa dữ liệu xác thực
function clearAuthData() {
    // Xóa localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Xóa cookies
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

// Đăng xuất
function logout() {
    // Xóa dữ liệu người dùng và token
    clearAuthData();

    // Gọi API đăng xuất nếu cần
    fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
        .finally(() => {
            // Chuyển về trang chủ hoặc trang đăng nhập
            window.location.href = '/views/login.html';
        });
}