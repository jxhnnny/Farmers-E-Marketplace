// Admin Panel JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize admin panel functionality
    loadUserInfo();
    initializeSidebar();
    initializeContentSections();
    initializeModals();
    initializeTables();
    
    console.log('Admin panel initialized successfully');
});

// Load and display admin user information
async function loadUserInfo() {
    try {
        // Check if user is logged in
        if (!AuthAPI || !AuthAPI.getProfile) {
            console.warn('AuthAPI not available');
            return;
        }

        // Get user info from localStorage first
        const storedUser = UserManager.get();
        if (storedUser) {
            updateAdminDisplay(storedUser);
        }

        // Fetch fresh profile data
        const response = await AuthAPI.getProfile();
        if (response.success && response.data.user) {
            updateAdminDisplay(response.data.user);
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        // Fallback to stored user data
        const storedUser = UserManager.get();
        if (storedUser) {
            updateAdminDisplay(storedUser);
        }
    }
}

function updateAdminDisplay(user) {
    // Update admin name in header
    const adminNameElement = document.getElementById('adminName');
    if (adminNameElement) {
        adminNameElement.textContent = user.fullName || 'Admin User';
    }

    // Update dashboard title to be more personalized
    const dashboardTitle = document.getElementById('adminDashboardTitle');
    if (dashboardTitle) {
        dashboardTitle.textContent = `Welcome ${user.fullName?.split(' ')[0] || 'Admin'} - Administration Dashboard`;
    }

    // Update subtitle with admin-specific message
    const dashboardSubtitle = document.getElementById('adminDashboardSubtitle');
    if (dashboardSubtitle) {
        dashboardSubtitle.textContent = `Managing the Namibian Farmers Marketplace platform and user community`;
    }
}

// Sidebar Navigation
function initializeSidebar() {
    const menuItems = document.querySelectorAll('.menu-item');
    const hamburger = document.querySelector('.hamburger');
    const sidebar = document.querySelector('.sidebar');
    
    // Handle menu item clicks
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all menu items
            menuItems.forEach(mi => mi.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Show corresponding content section
            const targetId = this.getAttribute('href').replace('#', '');
            showSection(targetId);
        });
    });
    
    // Handle mobile hamburger menu
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && 
            !sidebar.contains(e.target) && 
            !hamburger.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });
}

// Content Section Management
function initializeContentSections() {
    // Show the dashboard by default
    showSection('dashboard');
}

function showSection(sectionId) {
    // Hide all content sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show the target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update page title
    updatePageTitle(sectionId);
}

function updatePageTitle(sectionId) {
    const titles = {
        'dashboard': 'Administration Dashboard',
        'user-management': 'User Management',
        'crop-moderation': 'Crop Moderation',
        'transaction-monitoring': 'Transaction Monitoring',
        'reports-analytics': 'Reports & Analytics',
        'system-settings': 'System Settings',
        'security-logs': 'Security Logs',
        'support-tickets': 'Support Tickets',
        'notifications': 'System Notifications'
    };
    
    const title = titles[sectionId] || 'Admin Panel';
    document.title = `${title} - Farmers Market`;
}

// Modal Management
function initializeModals() {
    const modals = document.querySelectorAll('.modal');
    const closeButtons = document.querySelectorAll('.close');
    
    // Close modal when clicking close button
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Close modal when clicking outside
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
}

// Table Functionality
function initializeTables() {
    // Add search functionality to user table
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', function() {
            filterUserTable(this.value);
        });
    }
    
    // Add filter functionality
    const filters = ['userTypeFilter', 'userStatusFilter'];
    filters.forEach(filterId => {
        const filter = document.getElementById(filterId);
        if (filter) {
            filter.addEventListener('change', function() {
                filterUserTable();
            });
        }
    });
}

function filterUserTable(searchTerm = '') {
    const table = document.getElementById('usersTableBody');
    if (!table) return;
    
    const rows = table.querySelectorAll('tr');
    const typeFilter = document.getElementById('userTypeFilter')?.value || '';
    const statusFilter = document.getElementById('userStatusFilter')?.value || '';
    
    rows.forEach(row => {
        const name = row.querySelector('.user-name')?.textContent.toLowerCase() || '';
        const email = row.querySelector('.user-email')?.textContent.toLowerCase() || '';
        const type = row.querySelector('.badge')?.textContent.toLowerCase() || '';
        const status = row.querySelector('.status-badge')?.textContent.toLowerCase() || '';
        
        const matchesSearch = searchTerm === '' || 
            name.includes(searchTerm.toLowerCase()) || 
            email.includes(searchTerm.toLowerCase());
        
        const matchesType = typeFilter === '' || type.includes(typeFilter);
        const matchesStatus = statusFilter === '' || status.includes(statusFilter);
        
        if (matchesSearch && matchesType && matchesStatus) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Admin Actions
function openAnnouncementModal() {
    const modal = document.getElementById('announcementModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeAnnouncementModal() {
    const modal = document.getElementById('announcementModal');
    if (modal) {
        modal.style.display = 'none';
        
        // Clear form
        const form = document.getElementById('announcementForm');
        if (form) {
            form.reset();
        }
    }
}

function generateSystemReport() {
    // Show loading state
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Generating...';
    button.disabled = true;
    
    // Simulate report generation
    setTimeout(() => {
        alert('System report generated successfully!');
        button.textContent = originalText;
        button.disabled = false;
    }, 2000);
}

// Form Handling
document.addEventListener('submit', function(e) {
    if (e.target.id === 'announcementForm') {
        e.preventDefault();
        handleAnnouncementSubmission();
    }
});

function handleAnnouncementSubmission() {
    const title = document.getElementById('announcementTitle')?.value;
    const message = document.getElementById('announcementMessage')?.value;
    const audience = document.getElementById('announcementAudience')?.value;
    const priority = document.getElementById('announcementPriority')?.value;
    
    if (!title || !message) {
        alert('Please fill in all required fields.');
        return;
    }
    
    // Simulate sending announcement
    console.log('Sending announcement:', { title, message, audience, priority });
    
    // Show success message
    alert(`Announcement "${title}" sent successfully to ${audience}!`);
    
    // Close modal
    closeAnnouncementModal();
}

// User Management Actions
function viewUserProfile(userId) {
    console.log('Viewing profile for user:', userId);
    alert(`Opening profile for user ${userId}`);
}

function editUser(userId) {
    console.log('Editing user:', userId);
    alert(`Opening edit form for user ${userId}`);
}

function suspendUser(userId) {
    if (confirm('Are you sure you want to suspend this user?')) {
        console.log('Suspending user:', userId);
        alert(`User ${userId} has been suspended`);
    }
}

// Moderation Actions
function approveContent(contentId) {
    console.log('Approving content:', contentId);
    alert(`Content ${contentId} has been approved`);
}

function requestChanges(contentId) {
    const reason = prompt('Please enter the reason for requesting changes:');
    if (reason) {
        console.log('Requesting changes for content:', contentId, 'Reason:', reason);
        alert(`Change request sent for content ${contentId}`);
    }
}

function rejectContent(contentId) {
    if (confirm('Are you sure you want to reject this content?')) {
        const reason = prompt('Please enter the reason for rejection:');
        if (reason) {
            console.log('Rejecting content:', contentId, 'Reason:', reason);
            alert(`Content ${contentId} has been rejected`);
        }
    }
}

// Utility Functions
function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Make functions globally available
window.showSection = showSection;
window.openAnnouncementModal = openAnnouncementModal;
window.closeAnnouncementModal = closeAnnouncementModal;
window.generateSystemReport = generateSystemReport;