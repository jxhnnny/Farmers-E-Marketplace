// Marketplace Dashboard JavaScript functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    initializeNavigation();
    initializeCharts();
    loadDashboardData();
});

function initializeDashboard() {
    // Initialize responsive sidebar
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
            if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 1024) {
            sidebar.classList.remove('active');
        }
    });
}

function initializeNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        // Skip external links
        if (item.getAttribute('href').includes('.html')) {
            return;
        }
        
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            showSection(target);
            
            // Update active menu item
            menuItems.forEach(mi => {
                if (!mi.getAttribute('href').includes('.html')) {
                    mi.classList.remove('active');
                }
            });
            this.classList.add('active');
            
            // Close sidebar on mobile after navigation
            if (window.innerWidth <= 1024) {
                document.querySelector('.sidebar').classList.remove('active');
            }
        });
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
        
        // Trigger any section-specific initialization
        initializeSection(sectionId);
    }
}

function initializeSection(sectionId) {
    switch (sectionId) {
        case 'marketplace-analytics':
            refreshAnalytics();
            break;
        case 'trends':
            loadTrends();
            break;
        case 'farmers-spotlight':
            loadFarmersSpotlight();
            break;
        case 'supply-demand':
            loadSupplyDemand();
            break;
        case 'recent-activity':
            loadRecentActivity();
            break;
    }
}

function initializeCharts() {
    // Initialize progress bars and animations
    animateProgressBars();
    animateCounters();
}

function animateProgressBars() {
    const progressBars = document.querySelectorAll('.factor-fill, .category-fill, .progress-fill');
    
    progressBars.forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0%';
        
        setTimeout(() => {
            bar.style.width = width;
        }, 500);
    });
}

function animateCounters() {
    const counters = document.querySelectorAll('.stat-content h3');
    
    counters.forEach(counter => {
        const target = counter.textContent;
        const isPrice = target.includes('N$');
        const isMillion = target.includes('M');
        
        let numericValue;
        if (isPrice && isMillion) {
            numericValue = parseFloat(target.replace('N$ ', '').replace('M', '')) * 1000000;
        } else {
            numericValue = parseInt(target.replace(/[^0-9]/g, ''));
        }
        
        if (!isNaN(numericValue)) {
            animateNumber(counter, 0, numericValue, 2000, target);
        }
    });
}

function animateNumber(element, start, end, duration, originalText) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        
        if (current >= end) {
            element.textContent = originalText;
            clearInterval(timer);
        } else {
            if (originalText.includes('N$') && originalText.includes('M')) {
                element.textContent = `N$ ${(current / 1000000).toFixed(1)}M`;
            } else if (originalText.includes(',')) {
                element.textContent = Math.floor(current).toLocaleString();
            } else {
                element.textContent = Math.floor(current);
            }
        }
    }, 16);
}

function loadDashboardData() {
    // Simulate loading real-time data
    updateHealthScore();
    refreshActivityFeed();
    updateStats();
}

function updateHealthScore() {
    const scoreValue = document.querySelector('.score-value');
    const scoreLabel = document.querySelector('.score-label');
    
    // Simulate dynamic health score calculation
    const scores = [92, 94, 89, 96, 91];
    const currentScore = scores[Math.floor(Math.random() * scores.length)];
    
    scoreValue.textContent = currentScore;
    
    if (currentScore >= 90) {
        scoreLabel.textContent = 'Excellent';
        scoreLabel.style.color = '#28a745';
    } else if (currentScore >= 75) {
        scoreLabel.textContent = 'Good';
        scoreLabel.style.color = '#ffc107';
    } else {
        scoreLabel.textContent = 'Needs Attention';
        scoreLabel.style.color = '#dc3545';
    }
    
    // Update the circular progress
    const circle = document.querySelector('.score-circle');
    const percentage = (currentScore / 100) * 360;
    circle.style.background = `conic-gradient(#28a745 0deg, #28a745 ${percentage}deg, #e9ecef ${percentage}deg, #e9ecef 360deg)`;
}

function refreshActivityFeed() {
    const activityList = document.querySelector('.activity-list');
    
    const activities = [
        {
            icon: 'fas fa-plus',
            iconColor: 'text-green',
            content: '<strong>Green Valley Farms</strong> listed 500kg of organic tomatoes',
            time: generateRandomTime()
        },
        {
            icon: 'fas fa-shopping-cart',
            iconColor: 'text-blue',
            content: '<strong>Sarah Mitchell</strong> purchased 50kg of maize from Desert Bloom Farm',
            time: generateRandomTime()
        },
        {
            icon: 'fas fa-star',
            iconColor: 'text-yellow',
            content: '<strong>Oasis Vegetables</strong> received a 5-star rating from John Smith',
            time: generateRandomTime()
        },
        {
            icon: 'fas fa-truck',
            iconColor: 'text-purple',
            content: `Order #ORD-2024-${Math.floor(Math.random() * 9000) + 1000} delivered successfully to Windhoek`,
            time: generateRandomTime()
        },
        {
            icon: 'fas fa-user-plus',
            iconColor: 'text-teal',
            content: '<strong>Sunrise Organic Farm</strong> joined the marketplace',
            time: generateRandomTime()
        }
    ];
    
    // Sort activities by time (newest first)
    activities.sort((a, b) => a.timeValue - b.timeValue);
    
    activityList.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="${activity.icon} ${activity.iconColor}"></i>
            </div>
            <div class="activity-content">
                ${activity.content}
                <div class="activity-time">${activity.time}</div>
            </div>
        </div>
    `).join('');
}

function generateRandomTime() {
    const minutes = Math.floor(Math.random() * 120) + 1;
    
    if (minutes < 60) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
        const hours = Math.floor(minutes / 60);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
}

function updateStats() {
    // Simulate real-time stat updates
    const statChanges = document.querySelectorAll('.stat-change');
    
    statChanges.forEach(change => {
        const isPositive = Math.random() > 0.2; // 80% chance of positive change
        const percentage = (Math.random() * 30 + 1).toFixed(1);
        
        change.className = `stat-change ${isPositive ? 'positive' : 'negative'}`;
        change.innerHTML = `
            <i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i>
            ${isPositive ? '+' : '-'}${percentage}%
        `;
    });
}

function refreshAnalytics() {
    // Update category statistics
    const categoryItems = document.querySelectorAll('.category-item');
    
    categoryItems.forEach(item => {
        const fill = item.querySelector('.category-fill');
        const percent = item.querySelector('.category-percent');
        
        const randomPercentage = Math.floor(Math.random() * 40 + 40);
        fill.style.width = `${randomPercentage}%`;
        percent.textContent = `${randomPercentage}%`;
    });
    
    // Update regional statistics
    const regionItems = document.querySelectorAll('.region-item');
    
    regionItems.forEach(item => {
        const fill = item.querySelector('.progress-fill');
        const count = item.querySelector('.region-count');
        
        const randomCount = Math.floor(Math.random() * 300 + 100);
        const randomPercentage = Math.floor(Math.random() * 60 + 20);
        
        fill.style.width = `${randomPercentage}%`;
        count.textContent = `${randomCount} farmers`;
    });
}

function loadTrends() {
    // Placeholder for trends loading
    console.log('Loading market trends...');
}

function loadFarmersSpotlight() {
    // Placeholder for farmers spotlight
    console.log('Loading farmers spotlight...');
}

function loadSupplyDemand() {
    // Placeholder for supply & demand analysis
    console.log('Loading supply & demand analysis...');
}

function loadRecentActivity() {
    // Placeholder for extended activity feed
    console.log('Loading recent activity...');
}

// Export report functionality
function exportReport() {
    showNotification('Generating report...', 'info');
    
    setTimeout(() => {
        showNotification('Report exported successfully!', 'success');
        
        // In production, this would trigger actual report generation
        const reportData = {
            timestamp: new Date().toISOString(),
            stats: gatherCurrentStats(),
            analytics: gatherAnalyticsData()
        };
        
        console.log('Report data:', reportData);
    }, 2000);
}

function gatherCurrentStats() {
    const statCards = document.querySelectorAll('.stat-card');
    const stats = {};
    
    statCards.forEach((card, index) => {
        const value = card.querySelector('.stat-content h3').textContent;
        const label = card.querySelector('.stat-content p').textContent;
        const change = card.querySelector('.stat-change').textContent;
        
        stats[`stat_${index}`] = {
            value,
            label,
            change
        };
    });
    
    return stats;
}

function gatherAnalyticsData() {
    return {
        healthScore: document.querySelector('.score-value').textContent,
        categoryStats: Array.from(document.querySelectorAll('.category-item')).map(item => ({
            name: item.querySelector('.category-name').textContent,
            percentage: item.querySelector('.category-percent').textContent
        })),
        regionStats: Array.from(document.querySelectorAll('.region-item')).map(item => ({
            name: item.querySelector('.region-name').textContent,
            count: item.querySelector('.region-count').textContent
        }))
    };
}

// Quick actions menu
function showQuickActions() {
    const actions = [
        'Add Featured Crop',
        'Send Announcement',
        'Generate Report',
        'Refresh Analytics',
        'Contact Support'
    ];
    
    const actionsList = actions.map(action => `<li onclick="performQuickAction('${action}')">${action}</li>`).join('');
    
    showNotification(`
        <div class="quick-actions-menu">
            <h4>Quick Actions</h4>
            <ul>${actionsList}</ul>
        </div>
    `, 'info', 5000);
}

function performQuickAction(action) {
    switch (action) {
        case 'Add Featured Crop':
            showNotification('Opening featured crop selection...', 'info');
            break;
        case 'Send Announcement':
            showNotification('Opening announcement composer...', 'info');
            break;
        case 'Generate Report':
            exportReport();
            break;
        case 'Refresh Analytics':
            refreshAnalytics();
            showNotification('Analytics refreshed!', 'success');
            break;
        case 'Contact Support':
            showNotification('Opening support channel...', 'info');
            break;
    }
}

// Auto-refresh dashboard data
function startAutoRefresh() {
    setInterval(() => {
        refreshActivityFeed();
        updateHealthScore();
        updateStats();
    }, 30000); // Refresh every 30 seconds
}

// Utility function for notifications
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = message;
    
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
    }, duration);
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

// Initialize auto-refresh
startAutoRefresh();

// Handle header action buttons
document.addEventListener('click', function(e) {
    if (e.target.closest('.header-actions .btn')) {
        const button = e.target.closest('.btn');
        
        if (button.textContent.includes('Export Report')) {
            exportReport();
        } else if (button.textContent.includes('Quick Actions')) {
            showQuickActions();
        }
    }
});

// Export functions for global access
window.MarketplaceDashboard = {
    showSection,
    refreshAnalytics,
    exportReport,
    showQuickActions,
    performQuickAction
};