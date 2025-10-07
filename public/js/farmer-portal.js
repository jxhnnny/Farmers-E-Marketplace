// Farmer Portal JavaScript functionality

document.addEventListener('DOMContentLoaded', function() {
    // Check user role before loading the portal
    checkFarmerAccess().then(() => {
        loadUserInfo();
        initializeFarmerPortal();
        initializeImageUpload();
        initializeCropForm();
        initializeFilters();
        initializeOrders();
    });
});

// Check if user has farmer access
async function checkFarmerAccess() {
    try {
        // First check if user is logged in
        if (!UserManager.isLoggedIn()) {
            redirectToLogin();
            return;
        }

        // Check user type from localStorage first
        const userType = UserManager.getUserType();
        if (userType && userType !== 'farmer' && userType !== 'admin') {
            redirectUnauthorized(userType);
            return;
        }

        // Verify with server
        const response = await fetch('/api/auth/check-role/farmer', {
            headers: {
                'Authorization': `Bearer ${TokenManager.get()}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                redirectToLogin();
                return;
            } else if (response.status === 403) {
                const data = await response.json();
                redirectUnauthorized(data.userRole);
                return;
            }
            throw new Error('Failed to verify access');
        }

        const data = await response.json();
        if (!data.hasAccess) {
            redirectUnauthorized(data.userRole);
            return;
        }

    } catch (error) {
        console.error('Access check failed:', error);
        redirectToLogin();
    }
}

function redirectToLogin() {
    alert('Please log in to access the farmer portal.');
    window.location.href = '/index.html';
}

function redirectUnauthorized(userRole) {
    let message = 'Access denied. This portal is for farmers only.';
    let redirectUrl = '/index.html';
    
    if (userRole === 'buyer') {
        message = 'This portal is for farmers only. You will be redirected to the buyer portal.';
        redirectUrl = '/buyer-portal.html';
    } else if (userRole === 'admin') {
        message = 'As an admin, you can access all portals. Redirecting to admin panel.';
        redirectUrl = '/admin-panel.html';
    }
    
    alert(message);
    window.location.href = redirectUrl;
}

function updateNavigationVisibility(userType) {
    // Hide/show navigation items based on user role
    const buyerOnlyLinks = document.querySelectorAll('.buyer-only');
    const adminOnlyLinks = document.querySelectorAll('.admin-only');
    
    if (userType === 'admin') {
        // Admin can see all links
        buyerOnlyLinks.forEach(link => link.style.display = 'inline-block');
        adminOnlyLinks.forEach(link => link.style.display = 'inline-block');
    } else {
        // Non-admin users can't see other portal links
        buyerOnlyLinks.forEach(link => link.style.display = 'none');
        adminOnlyLinks.forEach(link => link.style.display = 'none');
    }
}

// Load and display user information
async function loadUserInfo() {
    try {
        // Check if user is logged in
        if (!AuthAPI.getProfile) {
            console.warn('AuthAPI not available');
            return;
        }

        // Get user info from localStorage first
        const storedUser = UserManager.get();
        if (storedUser) {
            updateUserDisplay(storedUser);
        }

        // Fetch fresh profile data
        const response = await AuthAPI.getProfile();
        if (response.success && response.data.user) {
            updateUserDisplay(response.data.user);
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        // Fallback to stored user data
        const storedUser = UserManager.get();
        if (storedUser) {
            updateUserDisplay(storedUser);
        }
    }
}

function updateUserDisplay(user) {
    // Update welcome message in header
    const userWelcomeElement = document.getElementById('userWelcome');
    if (userWelcomeElement) {
        userWelcomeElement.textContent = `Welcome, ${user.fullName}`;
    }

    // Update navigation based on user role
    updateNavigationVisibility(user.userType);

    // Update dashboard title to be more personalized
    const dashboardTitle = document.getElementById('dashboardTitle');
    if (dashboardTitle) {
        dashboardTitle.textContent = `${user.fullName}'s Dashboard`;
    }

    // Update dashboard subtitle with farm information
    const dashboardSubtitle = document.getElementById('dashboardSubtitle');
    if (dashboardSubtitle && user.farmName) {
        dashboardSubtitle.textContent = `Managing ${user.farmName} - Track your crops and performance`;
    }
}

// Handle user logout
async function handleLogout() {
    try {
        if (AuthAPI && AuthAPI.logout) {
            await AuthAPI.logout();
        }
        // Redirect to home page
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error during logout:', error);
        // Still redirect even if logout API call fails
        window.location.href = 'index.html';
    }
}

function initializeFarmerPortal() {
    // Initialize sidebar navigation
    const menuItems = document.querySelectorAll('.menu-item');
    const contentSections = document.querySelectorAll('.content-section');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            showSection(target);
            
            // Update active menu item
            menuItems.forEach(mi => mi.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Handle responsive sidebar toggle
    const hamburger = document.querySelector('.hamburger');
    const sidebar = document.querySelector('.sidebar');
    
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 1024) {
            if (!sidebar.contains(e.target) && !hamburger?.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
}

function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

function initializeImageUpload() {
    const uploadArea = document.getElementById('imageUploadArea');
    const fileInput = document.getElementById('cropImages');
    const imagePreview = document.getElementById('imagePreview');
    
    if (!uploadArea || !fileInput) return;
    
    // Click to upload
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });
    
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = '#2d5a3d';
        this.style.backgroundColor = '#f8fff9';
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.style.borderColor = '#e9ecef';
        this.style.backgroundColor = 'transparent';
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = '#e9ecef';
        this.style.backgroundColor = 'transparent';
        
        const files = e.dataTransfer.files;
        handleFileSelection(files);
    });
    
    // File input change
    fileInput.addEventListener('change', function(e) {
        handleFileSelection(e.target.files);
    });
    
    function handleFileSelection(files) {
        const maxFiles = 5;
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (files.length > maxFiles) {
            alert(`You can only upload up to ${maxFiles} images.`);
            return;
        }
        
        // Clear previous previews
        imagePreview.innerHTML = '';
        
        Array.from(files).forEach((file, index) => {
            if (!file.type.startsWith('image/')) {
                alert(`File ${file.name} is not an image.`);
                return;
            }
            
            if (file.size > maxSize) {
                alert(`File ${file.name} is too large. Maximum size is 5MB.`);
                return;
            }
            
            // Create preview
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            
            const img = document.createElement('img');
            const reader = new FileReader();
            
            reader.onload = function(e) {
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-image';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = function() {
                previewItem.remove();
                // Remove file from input (complex, usually handled differently in production)
            };
            
            previewItem.appendChild(img);
            previewItem.appendChild(removeBtn);
            imagePreview.appendChild(previewItem);
        });
    }
}

function initializeCropForm() {
    const addCropForm = document.getElementById('addCropForm');
    
    if (!addCropForm) return;
    
    addCropForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleCropSubmission();
    });
}

function handleCropSubmission() {
    // Collect form data
    const cropData = {
        name: document.getElementById('cropName').value,
        category: document.getElementById('cropCategory').value,
        description: document.getElementById('cropDescription').value,
        quantity: parseInt(document.getElementById('quantity').value),
        price: parseFloat(document.getElementById('price').value),
        harvestDate: document.getElementById('harvestDate').value,
        availableUntil: document.getElementById('availableUntil').value,
        notes: document.getElementById('notes').value,
        growingMethods: getSelectedCheckboxValues('growingMethod'),
        deliveryOptions: getSelectedCheckboxValues('deliveryOptions'),
        images: document.getElementById('cropImages').files
    };
    
    // Validate required fields
    if (!cropData.name || !cropData.category || !cropData.quantity || !cropData.price) {
        showNotification('Please fill in all required fields.', 'error');
        return;
    }
    
    // Validate price and quantity
    if (cropData.price <= 0) {
        showNotification('Price must be greater than 0.', 'error');
        return;
    }
    
    if (cropData.quantity <= 0) {
        showNotification('Quantity must be greater than 0.', 'error');
        return;
    }
    
    // Here you would normally send to backend API
    console.log('Crop data to submit:', cropData);
    
    // Simulate API call
    showNotification('Submitting crop listing...', 'info');
    
    setTimeout(() => {
        showNotification('Crop listing added successfully!', 'success');
        resetCropForm();
        showSection('my-crops');
        
        // Add to crops list (in production, this would come from server response)
        addCropToList(cropData);
    }, 1500);
}

function getSelectedCheckboxValues(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

function resetCropForm() {
    const form = document.getElementById('addCropForm');
    if (form) {
        form.reset();
        document.getElementById('imagePreview').innerHTML = '';
    }
}

function resetForm() {
    resetCropForm();
}

function addCropToList(cropData) {
    const cropsList = document.querySelector('.crops-list');
    if (!cropsList) return;
    
    const cropCard = document.createElement('div');
    cropCard.className = 'crop-listing-card';
    cropCard.dataset.status = 'active';
    cropCard.dataset.category = cropData.category;
    
    cropCard.innerHTML = `
        <div class="crop-image-container">
            <img src="images/default-crop.jpg" alt="${cropData.name}" class="crop-listing-image">
            <span class="status-badge active">Active</span>
        </div>
        <div class="crop-listing-info">
            <h3>${cropData.name}</h3>
            <p class="crop-description">${cropData.description || 'No description provided'}</p>
            <div class="crop-details-grid">
                <div class="detail-item">
                    <span class="label">Price:</span>
                    <span class="value">N$${cropData.price}/kg</span>
                </div>
                <div class="detail-item">
                    <span class="label">Available:</span>
                    <span class="value">${cropData.quantity}kg</span>
                </div>
                <div class="detail-item">
                    <span class="label">Views:</span>
                    <span class="value">0</span>
                </div>
                <div class="detail-item">
                    <span class="label">Inquiries:</span>
                    <span class="value">0</span>
                </div>
            </div>
        </div>
        <div class="crop-listing-actions">
            <button class="btn btn-outline btn-small" onclick="editCrop(this)">
                <i class="fas fa-edit"></i>
                Edit
            </button>
            <button class="btn btn-secondary btn-small" onclick="viewCrop(this)">
                <i class="fas fa-eye"></i>
                View
            </button>
            <button class="btn btn-danger btn-small" onclick="deleteCrop(this)">
                <i class="fas fa-trash"></i>
                Delete
            </button>
        </div>
    `;
    
    cropsList.insertBefore(cropCard, cropsList.firstChild);
}

function initializeFilters() {
    // Crops filters
    const statusFilter = document.getElementById('statusFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', applyCropsFilters);
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', applyCropsFilters);
    }
    
    // Orders filters
    const orderStatusFilter = document.getElementById('orderStatusFilter');
    if (orderStatusFilter) {
        orderStatusFilter.addEventListener('change', applyOrdersFilters);
    }
}

function applyCropsFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;
    const cropCards = document.querySelectorAll('.crop-listing-card');
    
    cropCards.forEach(card => {
        let shouldShow = true;
        
        if (statusFilter && card.dataset.status !== statusFilter) {
            shouldShow = false;
        }
        
        if (categoryFilter && card.dataset.category !== categoryFilter) {
            shouldShow = false;
        }
        
        card.style.display = shouldShow ? 'grid' : 'none';
    });
}

function applyOrdersFilters() {
    const statusFilter = document.getElementById('orderStatusFilter').value;
    const orderCards = document.querySelectorAll('.order-card');
    
    orderCards.forEach(card => {
        const orderStatus = card.querySelector('.order-status');
        if (!orderStatus) return;
        
        const status = orderStatus.textContent.toLowerCase().trim();
        
        if (statusFilter === '' || status === statusFilter) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function initializeOrders() {
    // Initialize order action buttons
    const orderCards = document.querySelectorAll('.order-card');
    
    orderCards.forEach(card => {
        const acceptBtn = card.querySelector('.btn-primary');
        const messageBtn = card.querySelector('.btn-outline');
        const declineBtn = card.querySelector('.btn-danger');
        const deliveredBtn = card.querySelector('.btn-primary');
        
        if (acceptBtn && acceptBtn.textContent.includes('Accept')) {
            acceptBtn.addEventListener('click', () => acceptOrder(card));
        }
        
        if (messageBtn) {
            messageBtn.addEventListener('click', () => messagebuyer(card));
        }
        
        if (declineBtn) {
            declineBtn.addEventListener('click', () => declineOrder(card));
        }
        
        if (deliveredBtn && deliveredBtn.textContent.includes('Delivered')) {
            deliveredBtn.addEventListener('click', () => markAsDelivered(card));
        }
    });
}

function acceptOrder(orderCard) {
    const orderId = orderCard.querySelector('.order-id').textContent;
    
    if (confirm(`Are you sure you want to accept order ${orderId}?`)) {
        // Update status
        const statusBadge = orderCard.querySelector('.order-status');
        statusBadge.textContent = 'Confirmed';
        statusBadge.className = 'order-status confirmed';
        
        // Update buttons
        const actionsDiv = orderCard.querySelector('.order-actions');
        actionsDiv.innerHTML = `
            <button class="btn btn-primary btn-small" onclick="markAsDelivered(this.closest('.order-card'))">Mark as Delivered</button>
            <button class="btn btn-outline btn-small" onclick="messageUser(this.closest('.order-card'))">Message Buyer</button>
        `;
        
        showNotification(`Order ${orderId} accepted successfully!`, 'success');
    }
}

function declineOrder(orderCard) {
    const orderId = orderCard.querySelector('.order-id').textContent;
    
    if (confirm(`Are you sure you want to decline order ${orderId}?`)) {
        // Update status
        const statusBadge = orderCard.querySelector('.order-status');
        statusBadge.textContent = 'Cancelled';
        statusBadge.className = 'order-status cancelled';
        
        // Update buttons
        const actionsDiv = orderCard.querySelector('.order-actions');
        actionsDiv.innerHTML = `
            <button class="btn btn-outline btn-small" onclick="messageUser(this.closest('.order-card'))">Message Buyer</button>
        `;
        
        showNotification(`Order ${orderId} declined.`, 'info');
    }
}

function markAsDelivered(orderCard) {
    const orderId = orderCard.querySelector('.order-id').textContent;
    
    if (confirm(`Mark order ${orderId} as delivered?`)) {
        // Update status
        const statusBadge = orderCard.querySelector('.order-status');
        statusBadge.textContent = 'Completed';
        statusBadge.className = 'order-status completed';
        
        // Update buttons
        const actionsDiv = orderCard.querySelector('.order-actions');
        actionsDiv.innerHTML = `
            <button class="btn btn-outline btn-small" onclick="messageUser(this.closest('.order-card'))">Message Buyer</button>
        `;
        
        showNotification(`Order ${orderId} marked as delivered!`, 'success');
        
        // Update dashboard stats (simulate)
        updateDashboardStats();
    }
}

function messageUser(orderCard) {
    const buyerName = orderCard.querySelector('.buyer-info h4').textContent;
    showNotification(`Opening message thread with ${buyerName}...`, 'info');
    
    // In production, this would open a messaging interface
    setTimeout(() => {
        alert(`Messaging feature coming soon! You want to message ${buyerName}.`);
    }, 1000);
}

function messagesBuyer(orderCard) {
    messageUser(orderCard);
}

// Crop management functions
function editCrop(button) {
    const cropCard = button.closest('.crop-listing-card');
    const cropName = cropCard.querySelector('h3').textContent;
    
    showNotification(`Opening edit form for ${cropName}...`, 'info');
    
    // In production, this would populate the add-crop form with existing data
    setTimeout(() => {
        alert(`Edit functionality coming soon! You want to edit ${cropName}.`);
    }, 1000);
}

function viewCrop(button) {
    const cropCard = button.closest('.crop-listing-card');
    const cropName = cropCard.querySelector('h3').textContent;
    
    showNotification(`Opening detailed view for ${cropName}...`, 'info');
    
    // In production, this would show a detailed crop view
    setTimeout(() => {
        alert(`Detailed view coming soon! You want to view ${cropName}.`);
    }, 1000);
}

function deleteCrop(button) {
    const cropCard = button.closest('.crop-listing-card');
    const cropName = cropCard.querySelector('h3').textContent;
    
    if (confirm(`Are you sure you want to delete the listing for ${cropName}?`)) {
        cropCard.remove();
        showNotification(`${cropName} listing deleted successfully.`, 'success');
        
        // Update dashboard stats
        updateDashboardStats();
    }
}

function updateDashboardStats() {
    // Simulate updating dashboard statistics
    const activeListingsCount = document.querySelectorAll('.crop-listing-card[data-status="active"]').length;
    const statsCard = document.querySelector('.stat-content h3');
    if (statsCard) {
        statsCard.textContent = activeListingsCount;
    }
}

// Utility function for notifications (reuse from main.js)
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    Object.assign(notification.style, {
        position: 'fixed',
        top: '100px',
        right: '20px',
        padding: '12px 20px',
        backgroundColor: getNotificationColor(type),
        color: getNotificationTextColor(type),
        border: `1px solid ${getNotificationBorderColor(type)}`,
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '3000',
        animation: 'slideInRight 0.3s ease',
        maxWidth: '350px',
        wordWrap: 'break-word'
    });
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function getNotificationColor(type) {
    const colors = {
        success: '#d4edda',
        error: '#f8d7da',
        info: '#d1ecf1',
        warning: '#fff3cd'
    };
    return colors[type] || colors.info;
}

function getNotificationTextColor(type) {
    const colors = {
        success: '#155724',
        error: '#721c24',
        info: '#0c5460',
        warning: '#856404'
    };
    return colors[type] || colors.info;
}

function getNotificationBorderColor(type) {
    const colors = {
        success: '#c3e6cb',
        error: '#f5c6cb',
        info: '#bee5eb',
        warning: '#ffeeba'
    };
    return colors[type] || colors.info;
}

// Export functions for global access
window.FarmerPortal = {
    showSection,
    editCrop,
    viewCrop,
    deleteCrop,
    acceptOrder,
    declineOrder,
    markAsDelivered,
    messageUser,
    resetForm
};