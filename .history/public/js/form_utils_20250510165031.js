// Form utility functions for car registration

/**
 * Validates a form field and shows error message if invalid
 * @param {HTMLElement} field - The field to validate
 * @returns {boolean} - Whether the field is valid
 */
function validateField(field) {
    // Skip validation for non-required fields that are empty
    if (!field.required && field.value.trim() === '') {
        clearFieldError(field);
        return true;
    }
    
    // Check if the field is valid according to its constraints
    const isValid = field.checkValidity();
    
    if (!isValid) {
        // Show error message
        showFieldError(field, field.validationMessage);
    } else {
        // Clear any existing error
        clearFieldError(field);
    }
    
    return isValid;
}

/**
 * Shows an error message for a field
 * @param {HTMLElement} field - The field with an error
 * @param {string} message - The error message to display
 */
function showFieldError(field, message) {
    // Find or create error message element
    let errorElement = field.parentElement.querySelector('.error-message');
    
    if (!errorElement) {
        // Create new error element
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        field.parentElement.appendChild(errorElement);
    }
    
    // Set error message
    errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    // Add error class to field
    field.classList.add('error');
}

/**
 * Clears error message for a field
 * @param {HTMLElement} field - The field to clear errors for
 */
function clearFieldError(field) {
    // Remove error class from field
    field.classList.remove('error');
    
    // Find and remove error message element
    const errorElement = field.parentElement.querySelector('.error-message');
    if (errorElement) {
        errorElement.remove();
    }
}

/**
 * Validates all fields in a form
 * @param {HTMLFormElement} form - The form to validate
 * @returns {boolean} - Whether all fields are valid
 */
function validateForm(form) {
    // Get all input, select, and textarea elements
    const fields = form.querySelectorAll('input, select, textarea');
    
    // Track if all fields are valid
    let allValid = true;
    
    // Validate each field
    fields.forEach(field => {
        const isValid = validateField(field);
        if (!isValid) {
            allValid = false;
        }
    });
    
    return allValid;
}

/**
 * Formats a number as currency
 * @param {number} amount - The amount to format
 * @returns {string} - Formatted currency string
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
}

/**
 * Validates a license plate format
 * @param {string} plate - The license plate to validate
 * @returns {boolean} - Whether the format is valid
 */
function validateLicensePlate(plate) {
    // License plate format: XX-XXXXX or XXX-XXXXX
    // X is a letter or number, with specific patterns
    const regex = /^[0-9]{2}[A-Z]{1,2}-[0-9]{4,5}$/;
    return regex.test(plate);
}

/**
 * Validates an email address
 * @param {string} email - The email to validate
 * @returns {boolean} - Whether the email is valid
 */
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Validates a phone number
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - Whether the phone number is valid
 */
function validatePhone(phone) {
    // Vietnamese phone number format
    const regex = /^(0|\+84)([3|5|7|8|9])([0-9]{8})$/;
    return regex.test(phone);
}

// Exports
window.formUtils = {
    validateField,
    validateForm,
    showFieldError,
    clearFieldError,
    formatCurrency,
    validateLicensePlate,
    validateEmail,
    validatePhone
};
