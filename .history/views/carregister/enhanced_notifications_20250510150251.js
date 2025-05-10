// This script contains improved notification handling for car registration
// with support for offline scenarios

// Function to send notifications with improved offline support
async function sendNotificationWithOfflineSupport(notification) {
    // Add retry info for tracking retries
    notification.retryInfo = notification.retryInfo || {
        retryCount: 0,
        lastRetry: null,
        maxRetries: 5
    };

    // Check if we're online
    if (navigator.onLine) {
        try {
            // Get token for authentication
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('User not authenticated');
            }

            // Send the notification to the server
            const response = await fetch('/api/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(notification)
            });

            if (!response.ok) {
                // If server responded with an error, save for later
                notification.retryInfo.lastRetry = new Date().toISOString();
                notification.retryInfo.retryCount++;
                
                // Only save if we haven't exceeded max retries
                if (notification.retryInfo.retryCount <= notification.retryInfo.maxRetries) {
                    saveNotificationToOfflineQueue(notification);
                    return { success: false, offline: true, status: response.status };
                } else {
                    console.warn('Max retries exceeded for notification:', notification);
                    return { success: false, offline: false, maxRetriesExceeded: true };
                }
            }

            // Successfully sent
            return { success: true, offline: false };
        } catch (error) {
            console.error('Error sending notification:', error);
            // If any error occurs during sending, save for later
            notification.retryInfo.lastRetry = new Date().toISOString();
            notification.retryInfo.retryCount++;
            
            // Only save if we haven't exceeded max retries
            if (notification.retryInfo.retryCount <= notification.retryInfo.maxRetries) {
                saveNotificationToOfflineQueue(notification);
                return { success: false, offline: true, error };
            } else {
                console.warn('Max retries exceeded for notification:', notification);
                return { success: false, offline: false, maxRetriesExceeded: true };
            }
        }
    } else {
        // We're offline, save the notification for later
        notification.retryInfo.lastRetry = new Date().toISOString();
        saveNotificationToOfflineQueue(notification);
        return { success: false, offline: true };
    }
}

// Save notification to queue for sending later when online
function saveNotificationToOfflineQueue(notification) {
    // Get current queue or initialize empty array
    let offlineNotifications = JSON.parse(localStorage.getItem('offlineNotifications') || '[]');
    
    // Check if notification with same content already exists to avoid duplicates
    const isDuplicate = offlineNotifications.some(item => {
        // Check if this is about the same car registration
        if (item.loai_thong_bao === notification.loai_thong_bao && 
            item.du_lieu && notification.du_lieu &&
            item.du_lieu.id_xe === notification.du_lieu.id_xe) {
            return true;
        }
        return false;
    });
    
    if (!isDuplicate) {
        // Add timestamp to notification
        notification.queueTimestamp = new Date().toISOString();
        
        // Add to queue
        offlineNotifications.push(notification);
        
        // Save back to localStorage
        localStorage.setItem('offlineNotifications', JSON.stringify(offlineNotifications));
        
        console.log('Notification saved to offline queue:', notification);
    } else {
        console.log('Duplicate notification not saved to queue:', notification);
    }
}

// Function to process offline notification queue when back online
function processOfflineNotificationQueue() {
    const offlineNotifications = JSON.parse(localStorage.getItem('offlineNotifications') || '[]');
    
    if (offlineNotifications.length === 0) {
        return; // No notifications to process
    }
    
    console.log(`Processing ${offlineNotifications.length} offline notifications...`);
    
    // Create a copy of the queue and clear storage
    const notificationsToProcess = [...offlineNotifications];
    localStorage.setItem('offlineNotifications', '[]');
    
    // Process each notification
    notificationsToProcess.forEach(async (notification) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('User not authenticated');
            }
            
            const response = await fetch('/api/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(notification)
            });
            
            if (!response.ok) {
                // Increment retry count
                notification.retryInfo = notification.retryInfo || {
                    retryCount: 0,
                    lastRetry: null,
                    maxRetries: 5
                };
                notification.retryInfo.retryCount++;
                notification.retryInfo.lastRetry = new Date().toISOString();
                
                // If still failing and not exceeded max retries, put back in queue
                if (notification.retryInfo.retryCount <= notification.retryInfo.maxRetries) {
                    saveNotificationToOfflineQueue(notification);
                } else {
                    console.warn('Max retries exceeded for notification, discarding:', notification);
                }
            } else {
                console.log('Successfully sent offline notification:', notification);
            }
        } catch (error) {
            console.error('Error sending offline notification:', error);
            
            // Increment retry count
            notification.retryInfo = notification.retryInfo || {
                retryCount: 0,
                lastRetry: null,
                maxRetries: 5
            };
            notification.retryInfo.retryCount++;
            notification.retryInfo.lastRetry = new Date().toISOString();
            
            // If not exceeded max retries, put back in queue
            if (notification.retryInfo.retryCount <= notification.retryInfo.maxRetries) {
                saveNotificationToOfflineQueue(notification);
            } else {
                console.warn('Max retries exceeded for notification, discarding:', notification);
            }
        }
    });
}

// Listen for online status and process queue when back online
window.addEventListener('online', () => {
    console.log('Back online, processing notification queue...');
    processOfflineNotificationQueue();
    
    // Show connection indicator
    showConnectionStatus(true);
});

window.addEventListener('offline', () => {
    console.log('Connection lost');
    showConnectionStatus(false);
});

// Function to show connection status
function showConnectionStatus(isOnline) {
    // Check if indicator exists, create if not
    let indicator = document.getElementById('connectionIndicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'connectionIndicator';
        indicator.style.position = 'fixed';
        indicator.style.bottom = '1rem';
        indicator.style.right = '1rem';
        indicator.style.padding = '0.5rem 1rem';
        indicator.style.borderRadius = '2rem';
        indicator.style.fontSize = '0.75rem';
        indicator.style.fontWeight = '500';
        indicator.style.zIndex = '999';
        indicator.style.transition = 'all 0.3s ease';
        document.body.appendChild(indicator);
    }
    
    if (isOnline) {
        indicator.style.backgroundColor = '#10b981';
        indicator.style.color = 'white';
        indicator.textContent = 'Đã kết nối lại';
        
        // Hide after a few seconds
        setTimeout(() => {
            indicator.style.opacity = '0';
        }, 3000);
    } else {
        indicator.style.backgroundColor = '#ef4444';
        indicator.style.color = 'white';
        indicator.textContent = 'Mất kết nối';
        indicator.style.opacity = '1';
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Check initial connection status
    showConnectionStatus(navigator.onLine);
    
    // Process queue if online
    if (navigator.onLine) {
        processOfflineNotificationQueue();
    }
});
