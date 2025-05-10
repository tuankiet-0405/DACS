// File handling utilities for car registration

/**
 * Handles image file uploads for car registration
 * @param {FileList} files - The uploaded files
 * @param {Element} previewElement - Element to display the preview
 * @param {Function} callback - Optional callback after processing
 */
function handleImageFiles(files, previewElement, callback) {
    // Clear previous preview content
    if (previewElement) {
        previewElement.innerHTML = '';
    }
    
    // Store all valid images
    const validImages = [];
    
    // Process each file
    Array.from(files).forEach(file => {
        // Validate file is an image
        if (!file.type.match('image.*')) {
            console.error(`File ${file.name} is not an image`);
            return;
        }
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            console.error(`File ${file.name} exceeds 5MB limit`);
            Swal.fire({
                icon: 'error',
                title: 'File quá lớn',
                text: `File ${file.name} vượt quá giới hạn 5MB`,
                confirmButtonColor: '#10b981'
            });
            return;
        }
        
        // Add to valid images array
        validImages.push(file);
        
        // Create preview if element exists
        if (previewElement) {
            // Create preview container
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            
            // Create loading indicator
            const loadingSpinner = document.createElement('div');
            loadingSpinner.className = 'loading-spinner';
            loadingSpinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            previewItem.appendChild(loadingSpinner);
            
            // Add to preview element
            previewElement.appendChild(previewItem);
            
            // Create image reader
            const reader = new FileReader();
            reader.onload = function(e) {
                // Create image element
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'preview-image';
                img.alt = file.name;
                
                // Remove loading spinner and add image
                previewItem.innerHTML = '';
                previewItem.appendChild(img);
                
                // Create remove button
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-image-btn';
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.title = 'Xóa ảnh này';
                
                // Add remove button click handler
                removeBtn.addEventListener('click', function() {
                    // Remove file from valid images
                    const index = validImages.indexOf(file);
                    if (index > -1) {
                        validImages.splice(index, 1);
                    }
                    
                    // Remove preview item
                    previewItem.remove();
                    
                    // Call callback if provided
                    if (callback) {
                        callback(validImages);
                    }
                });
                
                // Add remove button to preview item
                previewItem.appendChild(removeBtn);
            };
            
            // Read file as data URL
            reader.readAsDataURL(file);
        }
    });
    
    // Call callback with valid images if provided
    if (callback) {
        callback(validImages);
    }
    
    return validImages;
}

/**
 * Handles document file uploads (ID, registration, etc.)
 * @param {File} file - The uploaded file
 * @param {Element} previewElement - Element to display the preview
 * @param {string} type - Document type identifier
 */
function handleDocumentFile(file, previewElement, type) {
    // Validate file is an image or PDF
    if (!file.type.match('image.*') && file.type !== 'application/pdf') {
        Swal.fire({
            icon: 'error',
            title: 'File không hợp lệ',
            text: 'Vui lòng tải lên file hình ảnh hoặc PDF',
            confirmButtonColor: '#10b981'
        });
        return null;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
            icon: 'error',
            title: 'File quá lớn',
            text: 'Vui lòng tải lên file nhỏ hơn 5MB',
            confirmButtonColor: '#10b981'
        });
        return null;
    }
    
    // Clear previous preview
    if (previewElement) {
        previewElement.innerHTML = '';
    }
    
    // Store file in global object for later submission
    if (!window.documentFiles) {
        window.documentFiles = {};
    }
    window.documentFiles[type] = file;
    
    // Create preview if element exists
    if (previewElement) {
        // Create preview container
        const previewItem = document.createElement('div');
        previewItem.className = 'document-preview-item';
        
        // Create loading indicator
        const loadingSpinner = document.createElement('div');
        loadingSpinner.className = 'loading-spinner';
        loadingSpinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        previewItem.appendChild(loadingSpinner);
        
        // Add to preview element
        previewElement.appendChild(previewItem);
        
        // Create file reader
        const reader = new FileReader();
        reader.onload = function(e) {
            // Remove loading spinner
            previewItem.innerHTML = '';
            
            if (file.type === 'application/pdf') {
                // Create PDF icon and filename for PDFs
                const pdfIcon = document.createElement('div');
                pdfIcon.className = 'pdf-preview';
                pdfIcon.innerHTML = `
                    <i class="fas fa-file-pdf"></i>
                    <span>${file.name}</span>
                `;
                previewItem.appendChild(pdfIcon);
            } else {
                // Create image preview for images
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'preview-image';
                img.alt = file.name;
                previewItem.appendChild(img);
            }
            
            // Create remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-doc-btn';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.title = 'Xóa tài liệu này';
            
            // Add remove button click handler
            removeBtn.addEventListener('click', function() {
                // Remove file from storage
                delete window.documentFiles[type];
                
                // Remove preview
                previewItem.remove();
                
                // Show upload area again
                const uploadArea = document.querySelector(`.upload-area[data-type="${type}"]`);
                if (uploadArea) {
                    uploadArea.style.display = 'flex';
                }
            });
            
            // Add remove button to preview item
            previewItem.appendChild(removeBtn);
        };
        
        // Read file as data URL
        reader.readAsDataURL(file);
    }
    
    return file;
}

// Export functions for use in other files
window.fileHandlers = {
    handleImageFiles,
    handleDocumentFile
};
