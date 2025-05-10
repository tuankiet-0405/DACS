/**
 * Enhanced debugging helpers for the car registration form
 */

/**
 * Debug utility for logging form data in a more readable format
 * @param {FormData} formData - The FormData object to log
 */
function logFormData(formData) {
    console.group('FormData Contents:');
    
    // Get all entries and sort them
    const entries = Array.from(formData.entries());
    
    // First, log all text fields
    console.group('Text Fields:');
    entries.forEach(([key, value]) => {
        if (!(value instanceof File)) {
            console.log(`${key}: ${value}`);
        }
    });
    console.groupEnd();
    
    // Then, log all files
    console.group('Files:');
    entries.forEach(([key, value]) => {
        if (value instanceof File) {
            console.log(`${key}: File - ${value.name} (${(value.size / 1024).toFixed(2)} KB)`);
        }
    });
    console.groupEnd();
    
    console.groupEnd();
    
    return entries;
}

/**
 * Validates that all required fields are present and have values
 * @param {FormData} formData - The FormData object to validate
 * @returns {Object} Validation result with status and missing fields
 */
function validateRequiredFields(formData) {
    const requiredFields = [
        'brand', 'model', 'year', 'seats', 'transmission', 'fuel',
        'license_plate', 'price_per_day', 'location'
    ];
    
    const result = {
        isValid: true,
        missingFields: []
    };
    
    // Check each required field
    for (const field of requiredFields) {
        const value = formData.get(field);
        if (!value || (typeof value === 'string' && value.trim() === '')) {
            result.isValid = false;
            result.missingFields.push(field);
            console.warn(`Required field missing or empty: ${field}`);
        }
    }
    
    // Log validation result
    if (!result.isValid) {
        console.error(`Validation failed. Missing fields: ${result.missingFields.join(', ')}`);
    } else {
        console.info('All required fields are present and have values');
    }
    
    return result;
}

/**
 * Enhances a FormData object by ensuring all required fields are present
 * @param {FormData} formData - The original FormData object
 * @returns {FormData} - Enhanced FormData with field mappings fixed
 */
function enhanceFormData(formData) {
    const enhancedFormData = new FormData();
    
    // Map of potential field name issues
    const fieldMapping = {
        'brand': ['hang_xe', 'brand'],
        'model': ['model'],
        'year': ['nam_san_xuat', 'year'],
        'seats': ['so_cho', 'seats'],
        'transmission': ['hop_so', 'transmission'],
        'fuel': ['nhien_lieu', 'fuel'],
        'license_plate': ['bien_so', 'license_plate'],
        'price_per_day': ['gia_thue', 'price_per_day'],
        'location': ['dia_chi_xe', 'location'],
        'description': ['mo_ta', 'description'],
        'type': ['loai_dich_vu', 'type'],
        'deposit': ['dat_coc', 'deposit'],
        'km_limit': ['gioi_han_km', 'km_limit'],
        'features': ['features']
    };
    
    // Copy all existing fields
    for (const [key, value] of formData.entries()) {
        enhancedFormData.append(key, value);
    }
    
    // Loop through required fields and fix any missing values
    for (const [requiredField, alternateFields] of Object.entries(fieldMapping)) {
        // Skip if the field already exists
        if (formData.has(requiredField)) continue;
        
        // Try to find an alternate field
        for (const alternateField of alternateFields) {
            if (formData.has(alternateField)) {
                console.info(`Adding missing field ${requiredField} from ${alternateField}`);
                enhancedFormData.append(requiredField, formData.get(alternateField));
                break;
            }
        }
    }
    
    // Apply special handling for problematic fields
    enhancedFormData = applySpecialFieldHandling(enhancedFormData);
    
    return enhancedFormData;
}

/**
 * Adds special handling for specific fields with common issues
 * @param {FormData} formData - The FormData object to check
 * @returns {FormData} Updated FormData with fixes applied
 */
function applySpecialFieldHandling(formData) {
    const enhancedFormData = new FormData();
    
    // Copy all fields from original form data
    for (const [key, value] of formData.entries()) {
        enhancedFormData.append(key, value);
    }
    
    // Special handling for 'seats' field
    if (!formData.has('seats') || formData.get('seats').trim() === '') {
        // Try to extract seats from loai_xe
        const loaiXe = formData.get('loai_xe');
        let seatsValue = '';
        
        if (loaiXe && typeof loaiXe === 'string') {
            if (loaiXe.includes('4_cho')) {
                seatsValue = '4';
            } else if (loaiXe.includes('7_cho')) {
                seatsValue = '7';
            } else if (loaiXe.includes('16_cho')) {
                seatsValue = '16';
            } else if (loaiXe.includes('29_cho')) {
                seatsValue = '29';
            }
        }
        
        // If we found a value, add it
        if (seatsValue) {
            console.info(`Adding derived 'seats' field value: ${seatsValue}`);
            enhancedFormData.append('seats', seatsValue);
        } else if (formData.has('so_cho')) {
            // Fallback to so_cho if it exists
            const soChoValue = formData.get('so_cho');
            console.info(`Adding 'seats' field from 'so_cho': ${soChoValue}`);
            enhancedFormData.append('seats', soChoValue);
        }
    }
    
    return enhancedFormData;
}

// Export functions
window.debugHelper = {
    logFormData,
    validateRequiredFields,
    enhanceFormData,
    applySpecialFieldHandling
};
