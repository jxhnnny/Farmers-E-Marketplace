// Buyer Portal JavaScript functionality

// Shopping cart state
let shoppingCart = [];

document.addEventListener('DOMContentLoaded', function() {
    // Check user role before loading the portal
    checkBuyerAccess().then(() => {
        loadUserInfo();
        initializeBuyerPortal();
        initializeFilters();
        initializeCart();
        initializeCheckout();
        loadCartFromStorage();
        updateCartDisplay();
    });
});

// Check if user has buyer access
async function checkBuyerAccess() {
    try {
        // First check if user is logged in
        if (!UserManager.isLoggedIn()) {
            redirectToLogin();
            return;
        }

        // Check user type from localStorage first
        const userType = UserManager.getUserType();
        if (userType && userType !== 'buyer' && userType !== 'admin') {
            redirectUnauthorized(userType);
            return;
        }

        // Verify with server
        const response = await fetch('/api/auth/check-role/buyer', {
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
    alert('Please log in to access the buyer portal.');
    window.location.href = '/index.html';
}

function redirectUnauthorized(userRole) {
    let message = 'Access denied. This portal is for buyers only.';
    let redirectUrl = '/index.html';
    
    if (userRole === 'farmer') {
        message = 'This portal is for buyers only. You will be redirected to the farmer portal.';
        redirectUrl = '/farmer-portal.html';
    } else if (userRole === 'admin') {
        message = 'As an admin, you can access all portals. Redirecting to admin panel.';
        redirectUrl = '/admin-panel.html';
    }
    
    alert(message);
    window.location.href = redirectUrl;
}

function updateNavigationVisibility(userType) {
    // Hide/show navigation items based on user role
    const farmerOnlyLinks = document.querySelectorAll('.farmer-only');
    const adminOnlyLinks = document.querySelectorAll('.admin-only');
    
    if (userType === 'admin') {
        // Admin can see all links
        farmerOnlyLinks.forEach(link => link.style.display = 'inline-block');
        adminOnlyLinks.forEach(link => link.style.display = 'inline-block');
    } else {
        // Non-admin users can't see other portal links
        farmerOnlyLinks.forEach(link => link.style.display = 'none');
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

    // Update browse title to be more personalized
    const browseTitle = document.getElementById('browseTitle');
    if (browseTitle) {
        browseTitle.textContent = `Welcome ${user.fullName.split(' ')[0]}, Browse Fresh Produce`;
    }

    // Update subtitle with business information if available
    const browseSubtitle = document.getElementById('browseSubtitle');
    if (browseSubtitle) {
        if (user.businessName) {
            browseSubtitle.textContent = `Sourcing quality crops for ${user.businessName} from local farmers across Namibia`;
        } else {
            browseSubtitle.textContent = `Find quality crops from local farmers across Namibia`;
        }
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

function initializeBuyerPortal() {
    // Initialize sidebar navigation
    const menuItems = document.querySelectorAll('.menu-item');
    
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
    
    // Initialize view toggles
    const viewToggles = document.querySelectorAll('.view-toggle');
    viewToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            viewToggles.forEach(vt => vt.classList.remove('active'));
            this.classList.add('active');
            
            const view = this.getAttribute('data-view');
            toggleView(view);
        });
    });
    
    // Handle responsive sidebar
    const hamburger = document.querySelector('.hamburger');
    const sidebar = document.querySelector('.sidebar');
    
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }
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

function toggleView(view) {
    const cropsContainer = document.getElementById('cropsContainer');
    if (view === 'list') {
        cropsContainer.classList.add('list-view');
    } else {
        cropsContainer.classList.remove('list-view');
    }
}

function initializeFilters() {
    // Search functionality
    const searchInput = document.getElementById('cropSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    // Filter change handlers
    const filters = ['categoryFilter', 'regionFilter', 'priceFilter', 'sortFilter'];
    filters.forEach(filterId => {
        const filterElement = document.getElementById(filterId);
        if (filterElement) {
            filterElement.addEventListener('change', applyFilters);
        }
    });
    
    // Checkbox filters
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });
}

function performSearch() {
    const searchTerm = document.getElementById('cropSearchInput').value.toLowerCase();
    const cropCards = document.querySelectorAll('.crop-card');
    let visibleCount = 0;
    
    cropCards.forEach(card => {
        const cropName = card.querySelector('.crop-name').textContent.toLowerCase();
        const farmerName = card.querySelector('.farmer-name').textContent.toLowerCase();
        const location = card.querySelector('.crop-location').textContent.toLowerCase();
        const description = card.querySelector('.crop-description').textContent.toLowerCase();
        
        const matches = searchTerm === '' || 
                       cropName.includes(searchTerm) || 
                       farmerName.includes(searchTerm) || 
                       location.includes(searchTerm) || 
                       description.includes(searchTerm);
        
        if (matches) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    updateResultsCount(visibleCount);
}

function applyFilters() {
    const category = document.getElementById('categoryFilter').value;
    const region = document.getElementById('regionFilter').value;
    const priceRange = document.getElementById('priceFilter').value;
    const sort = document.getElementById('sortFilter').value;
    
    // Get selected growing methods
    const growingMethods = Array.from(document.querySelectorAll('input[name="growingMethod"]:checked'))
                               .map(cb => cb.value);
    
    // Get selected delivery options
    const deliveryOptions = Array.from(document.querySelectorAll('input[name="deliveryOption"]:checked'))
                                .map(cb => cb.value);
    
    const cropCards = Array.from(document.querySelectorAll('.crop-card'));
    let visibleCards = [];
    
    cropCards.forEach(card => {
        let shouldShow = true;
        
        // Category filter
        if (category && card.dataset.category !== category) {
            shouldShow = false;
        }
        
        // Region filter
        if (region) {
            const location = card.querySelector('.crop-location').textContent.toLowerCase();
            if (!location.includes(region.toLowerCase())) {
                shouldShow = false;
            }
        }
        
        // Price filter
        if (priceRange && shouldShow) {
            const price = parseFloat(card.dataset.price);
            const [min, max] = priceRange.includes('+') 
                ? [parseFloat(priceRange.replace('+', '')), Infinity]
                : priceRange.split('-').map(p => parseFloat(p));
            
            if (price < min || price > max) {
                shouldShow = false;
            }
        }
        
        // Growing method filter
        if (growingMethods.length > 0 && shouldShow) {
            const badges = Array.from(card.querySelectorAll('.badge'))
                              .map(badge => badge.className.split(' ')[1]);
            const hasMethod = growingMethods.some(method => 
                badges.includes(method) || badges.includes(method.replace('-', ''))
            );
            if (!hasMethod) {
                shouldShow = false;
            }
        }
        
        // Delivery options filter
        if (deliveryOptions.length > 0 && shouldShow) {
            const availableOptions = Array.from(card.querySelectorAll('.delivery-option'))
                                         .map(option => option.textContent.toLowerCase());
            const hasOption = deliveryOptions.some(option => 
                availableOptions.some(available => 
                    available.includes(option.toLowerCase().replace('-', ' '))
                )
            );
            if (!hasOption) {
                shouldShow = false;
            }
        }
        
        if (shouldShow) {
            visibleCards.push(card);
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
    
    // Apply sorting
    if (sort && visibleCards.length > 0) {
        sortCards(visibleCards, sort);
    }
    
    updateResultsCount(visibleCards.length);
}

function sortCards(cards, sortBy) {
    const container = document.getElementById('cropsContainer');
    
    cards.sort((a, b) => {
        switch (sortBy) {
            case 'price-low':
                return parseFloat(a.dataset.price) - parseFloat(b.dataset.price);
            case 'price-high':
                return parseFloat(b.dataset.price) - parseFloat(a.dataset.price);
            case 'quantity':
                const qtyA = parseInt(a.querySelector('.quantity-available span').textContent);
                const qtyB = parseInt(b.querySelector('.quantity-available span').textContent);
                return qtyB - qtyA;
            case 'rating':
                const ratingA = parseFloat(a.querySelector('.rating-text').textContent.replace(/[()]/g, ''));
                const ratingB = parseFloat(b.querySelector('.rating-text').textContent.replace(/[()]/g, ''));
                return ratingB - ratingA;
            case 'newest':
            default:
                return 0; // Keep original order for newest
        }
    });
    
    // Re-append sorted cards
    cards.forEach(card => container.appendChild(card));
}

function clearFilters() {
    // Reset all filters
    document.getElementById('categoryFilter').value = '';
    document.getElementById('regionFilter').value = '';
    document.getElementById('priceFilter').value = '';
    document.getElementById('sortFilter').value = 'newest';
    document.getElementById('cropSearchInput').value = '';
    
    // Uncheck all checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    // Show all cards
    document.querySelectorAll('.crop-card').forEach(card => card.style.display = 'block');
    
    updateResultsCount(document.querySelectorAll('.crop-card').length);
}

function updateResultsCount(count) {
    document.getElementById('resultsCount').textContent = count;
}

// Quantity controls
function decreaseQty(button) {
    const input = button.parentNode.querySelector('.qty-input');
    const min = parseInt(input.getAttribute('min')) || 1;
    const current = parseInt(input.value);
    if (current > min) {
        input.value = current - 1;
    }
}

function increaseQty(button) {
    const input = button.parentNode.querySelector('.qty-input');
    const max = parseInt(input.getAttribute('max')) || 1000;
    const current = parseInt(input.value);
    if (current < max) {
        input.value = current + 1;
    }
}

// Favorite functionality
function toggleFavorite(button) {
    const icon = button.querySelector('i');
    if (icon.classList.contains('far')) {
        icon.classList.remove('far');
        icon.classList.add('fas');
        button.classList.add('active');
        showNotification('Added to favorites!', 'success');
    } else {
        icon.classList.remove('fas');
        icon.classList.add('far');
        button.classList.remove('active');
        showNotification('Removed from favorites.', 'info');
    }
}

// Cart functionality
function initializeCart() {
    updateCartCount();
}

function addToCart(button) {
    const cropCard = button.closest('.crop-card');
    const quantityInput = cropCard.querySelector('.qty-input');
    const quantity = parseInt(quantityInput.value);
    
    const cropData = {
        id: Date.now(), // Simple ID generation
        name: cropCard.querySelector('.crop-name').textContent,
        farmer: cropCard.querySelector('.farmer-name').textContent,
        price: parseFloat(cropCard.dataset.price),
        quantity: quantity,
        image: cropCard.querySelector('.crop-image').src,
        location: cropCard.querySelector('.crop-location').textContent
    };
    
    // Check if item already exists in cart
    const existingItemIndex = shoppingCart.findIndex(item => 
        item.name === cropData.name && item.farmer === cropData.farmer
    );
    
    if (existingItemIndex >= 0) {
        shoppingCart[existingItemIndex].quantity += quantity;
        showNotification(`Updated ${cropData.name} quantity in cart!`, 'success');
    } else {
        shoppingCart.push(cropData);
        showNotification(`${cropData.name} added to cart!`, 'success');
    }
    
    saveCartToStorage();
    updateCartCount();
    updateCartDisplay();
}

function removeFromCart(index) {
    const item = shoppingCart[index];
    shoppingCart.splice(index, 1);
    saveCartToStorage();
    updateCartCount();
    updateCartDisplay();
    showNotification(`${item.name} removed from cart.`, 'info');
}

function updateCartQuantity(index, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(index);
        return;
    }
    
    shoppingCart[index].quantity = newQuantity;
    saveCartToStorage();
    updateCartDisplay();
}

function clearCart() {
    if (shoppingCart.length === 0) return;
    
    if (confirm('Are you sure you want to clear your cart?')) {
        shoppingCart = [];
        saveCartToStorage();
        updateCartCount();
        updateCartDisplay();
        showNotification('Cart cleared.', 'info');
    }
}

function updateCartCount() {
    const totalItems = shoppingCart.reduce((sum, item) => sum + item.quantity, 0);
    
    const cartCountElements = document.querySelectorAll('#cartCount, #sidebarCartCount');
    cartCountElements.forEach(element => {
        element.textContent = totalItems;
        element.style.display = totalItems > 0 ? 'flex' : 'none';
    });
}

function updateCartDisplay() {
    const cartEmpty = document.getElementById('cartEmpty');
    const cartItems = document.getElementById('cartItems');
    const cartSummary = document.getElementById('cartSummary');
    
    if (shoppingCart.length === 0) {
        cartEmpty.style.display = 'block';
        cartItems.style.display = 'none';
        cartSummary.style.display = 'none';
        return;
    }
    
    cartEmpty.style.display = 'none';
    cartItems.style.display = 'block';
    cartSummary.style.display = 'block';
    
    // Render cart items
    cartItems.innerHTML = shoppingCart.map((item, index) => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-farmer">from ${item.farmer}</div>
                <div class="cart-item-price">N$${item.price}/kg</div>
            </div>
            <div class="cart-item-quantity">
                <button class="qty-btn" onclick="updateCartQuantity(${index}, ${item.quantity - 1})">-</button>
                <input type="number" value="${item.quantity}" min="1" class="qty-input" 
                       onchange="updateCartQuantity(${index}, parseInt(this.value))">
                <button class="qty-btn" onclick="updateCartQuantity(${index}, ${item.quantity + 1})">+</button>
            </div>
            <div class="cart-item-total">N$${(item.price * item.quantity).toFixed(2)}</div>
            <div class="cart-item-actions">
                <button class="btn btn-danger btn-small" onclick="removeFromCart(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    // Update summary
    const subtotal = shoppingCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 50; // Fixed delivery fee
    const total = subtotal + deliveryFee;
    
    document.getElementById('cartSubtotal').textContent = `N$${subtotal.toFixed(2)}`;
    document.getElementById('estimatedDelivery').textContent = `N$${deliveryFee.toFixed(2)}`;
    document.getElementById('cartTotal').textContent = `N$${total.toFixed(2)}`;
}

function saveCartToStorage() {
    localStorage.setItem('shoppingCart', JSON.stringify(shoppingCart));
}

function loadCartFromStorage() {
    const stored = localStorage.getItem('shoppingCart');
    if (stored) {
        shoppingCart = JSON.parse(stored);
    }
}

function showCart() {
    showSection('cart');
    // Update menu active state
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelector('[href="#cart"]').classList.add('active');
}

// Contact farmer
function contactFarmer(button) {
    const cropCard = button.closest('.crop-card');
    const farmerName = cropCard.querySelector('.farmer-name').textContent;
    const cropName = cropCard.querySelector('.crop-name').textContent;
    
    showNotification(`Opening chat with ${farmerName}...`, 'info');
    
    // Redirect to chat page with farmer parameter
    const chatUrl = `chat.html?farmer=${encodeURIComponent(farmerName)}&crop=${encodeURIComponent(cropName)}`;
    window.location.href = chatUrl;
}

// Checkout functionality
function initializeCheckout() {
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', handleCheckout);
    }
    
    // Close modal functionality
    const closeBtn = document.querySelector('#checkoutModal .close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeCheckout);
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('checkoutModal');
    if (modal) {
        window.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeCheckout();
            }
        });
    }
}

function proceedToCheckout() {
    if (shoppingCart.length === 0) {
        showNotification('Your cart is empty!', 'error');
        return;
    }
    
    // Populate checkout modal
    populateCheckoutSummary();
    
    // Show modal
    document.getElementById('checkoutModal').style.display = 'block';
}

function populateCheckoutSummary() {
    const checkoutItems = document.getElementById('checkoutItems');
    const subtotal = shoppingCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 50;
    const total = subtotal + deliveryFee;
    
    // Populate items
    checkoutItems.innerHTML = shoppingCart.map(item => `
        <div class="checkout-item">
            <span>${item.name} (${item.quantity}kg) - ${item.farmer}</span>
            <span>N$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');
    
    // Update totals
    document.getElementById('checkoutSubtotal').textContent = `N$${subtotal.toFixed(2)}`;
    document.getElementById('checkoutTotal').textContent = `N$${total.toFixed(2)}`;
}

function handleCheckout(e) {
    e.preventDefault();
    
    const orderData = {
        items: shoppingCart,
        delivery: {
            address: document.getElementById('deliveryAddress').value,
            phone: document.getElementById('contactPhone').value,
            date: document.getElementById('deliveryDate').value
        },
        notes: document.getElementById('orderNotes').value,
        total: shoppingCart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 50
    };
    
    // Validate required fields
    if (!orderData.delivery.address || !orderData.delivery.phone) {
        showNotification('Please fill in all required fields.', 'error');
        return;
    }
    
    // Simulate order processing
    showNotification('Processing your order...', 'info');
    
    setTimeout(() => {
        // Generate order ID
        const orderId = 'ORD-' + Date.now().toString().slice(-6);
        
        showNotification(`Order ${orderId} placed successfully!`, 'success');
        
        // Clear cart
        shoppingCart = [];
        saveCartToStorage();
        updateCartCount();
        updateCartDisplay();
        
        // Close checkout modal
        closeCheckout();
        
        // Show orders section
        showSection('my-orders');
        
        // Add order to orders list (in production, this would come from server)
        addOrderToList(orderData, orderId);
    }, 2000);
}

function closeCheckout() {
    document.getElementById('checkoutModal').style.display = 'none';
    document.getElementById('checkoutForm').reset();
}

function addOrderToList(orderData, orderId) {
    const ordersList = document.querySelector('.orders-list');
    if (!ordersList) return;
    
    const orderCard = document.createElement('div');
    orderCard.className = 'buyer-order-card';
    
    const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    orderCard.innerHTML = `
        <div class="order-header">
            <div class="order-info">
                <div class="order-id">#${orderId}</div>
                <div class="order-date">Placed on ${today}</div>
            </div>
            <div class="order-status pending">Pending</div>
        </div>
        <div class="order-content">
            <div class="order-items">
                ${orderData.items.map(item => `
                    <div class="order-item">
                        <img src="${item.image}" alt="${item.name}" class="item-image">
                        <div class="item-details">
                            <h4>${item.name}</h4>
                            <p>From: ${item.farmer}</p>
                            <p>${item.quantity}kg × N$${item.price}/kg</p>
                        </div>
                        <div class="item-total">N$${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                `).join('')}
            </div>
            <div class="order-summary">
                <div class="delivery-info">
                    <i class="fas fa-truck"></i>
                    <span>Processing order...</span>
                </div>
                <div class="order-total">
                    <strong>Total: N$${orderData.total.toFixed(2)}</strong>
                </div>
            </div>
        </div>
        <div class="order-actions">
            <button class="btn btn-outline btn-small">
                <i class="fas fa-comment"></i>
                Contact Farmer
            </button>
            <button class="btn btn-secondary btn-small">
                <i class="fas fa-eye"></i>
                Track Order
            </button>
        </div>
    `;
    
    ordersList.insertBefore(orderCard, ordersList.firstChild);
}

// Load more crops
function loadMoreCrops() {
    showNotification('Loading more crops...', 'info');
    
    // Simulate loading more crops
    setTimeout(() => {
        showNotification('No more crops to load at this time.', 'info');
    }, 1000);
}

// Utility function for notifications
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
window.BuyerPortal = {
    showSection,
    toggleFavorite,
    addToCart,
    contactFarmer,
    proceedToCheckout,
    clearCart,
    performSearch,
    applyFilters,
    clearFilters,
    loadMoreCrops,
    increaseQty,
    decreaseQty
};