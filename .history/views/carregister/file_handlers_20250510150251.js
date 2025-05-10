// File handling utilities for car registration form

// Maximum allowed file size in MB
const MAX_FILE_SIZE_MB = 5;

// Allowed image file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

/**
 * Handles file uploads with validation and preview
 * @param {FileList} files - Files from input or drag and drop
 * @param {Function} onValidFile - Callback for valid files
 * @param {Function} onError - Callback for error handling
 */
function handleFileUpload(files, onValidFile, onError) {
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(file => {
        // Validate file type
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            onError('type', file, 'Chỉ chấp nhận file JPG, PNG.');
            return;
        }
        
        // Validate file size
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            onError('size', file, `Kích thước file phải nhỏ hơn ${MAX_FILE_SIZE_MB}MB.`);
            return;
        }
        
        // File is valid, pass to callback
        onValidFile(file);
    });
}

/**
 * Creates a preview element for an image
 * @param {File} file - Image file 
 * @param {Function} onRemove - Callback when remove button is clicked
 * @returns {HTMLElement} Preview element
 */
function createImagePreview(file, onRemove) {
    // Create container
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';
    
    // Create loader while image loads
    const loader = document.createElement('div');
    loader.className = 'preview-loader';
    loader.innerHTML = '<div class="spinner"></div>';
    previewItem.appendChild(loader);
    
    // Create image element
    const img = document.createElement('img');
    
    // Handle image loading
    const reader = new FileReader();
    reader.onload = function(e) {
        img.src = e.target.result;
        img.onload = function() {
            // Remove loader when image is loaded
            if (loader.parentNode === previewItem) {
                previewItem.removeChild(loader);
            }
            previewItem.appendChild(img);
        };
    };
    reader.readAsDataURL(file);
    
    // Create remove button
    const removeBtn = document.createElement('div');
    removeBtn.className = 'remove-preview';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof onRemove === 'function') {
            onRemove(file);
        }
    });
    
    previewItem.appendChild(removeBtn);
    
    return previewItem;
}

/**
 * Shows a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of notification (success, error, warning)
 */
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.top = '1rem';
        toastContainer.style.right = '1rem';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.backgroundColor = type === 'error' ? '#ef4444' : 
                                 type === 'success' ? '#10b981' : 
                                 type === 'warning' ? '#f59e0b' : '#3b82f6';
    toast.style.color = 'white';
    toast.style.padding = '0.75rem 1rem';
    toast.style.borderRadius = '0.375rem';
    toast.style.marginBottom = '0.5rem';
    toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    toast.style.minWidth = '200px';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    
    // Add icon based on type
    const icon = document.createElement('i');
    icon.className = type === 'error' ? 'fas fa-exclamation-circle' : 
                     type === 'success' ? 'fas fa-check-circle' : 
                     type === 'warning' ? 'fas fa-exclamation-triangle' : 'fas fa-info-circle';
    icon.style.marginRight = '0.5rem';
    
    toast.appendChild(icon);
    toast.appendChild(document.createTextNode(message));
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (toast.parentNode === toastContainer) {
                toastContainer.removeChild(toast);
            }
            
            // Remove container if empty
            if (toastContainer.children.length === 0) {
                document.body.removeChild(toastContainer);
            }
        }, 300);
    }, 4000);
    
    return toast;
}

// Export functions for use in other scripts
window.fileUtils = {
    handleFileUpload,
    createImagePreview,
    showToast,
    MAX_FILE_SIZE_MB,
    ALLOWED_IMAGE_TYPES
};
