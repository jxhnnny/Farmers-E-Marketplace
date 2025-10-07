// Main JavaScript functionality for Farmers Marketplace

document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
    checkUserAuthenticationState();
    initializeNavigation();
    initializeModal();
    initializeSearch();
    initializeForms();
    initializeCropCards();
    initializeScrollEffects();
    
    // Load sample data
    loadSampleCrops();
});

// Check if user is logged in and update UI accordingly
async function checkUserAuthenticationState() {
    try {
        // Check if we have AuthAPI and UserManager available
        if (typeof UserManager === 'undefined' || typeof AuthAPI === 'undefined') {
            console.log('Auth system not available, staying in logged out state');
            return;
        }

        // Get stored user data
        const storedUser = UserManager.get();
        const isLoggedIn = UserManager.isLoggedIn();

        if (isLoggedIn && storedUser) {
            // User is logged in, show logged in state
            updateHomePageAuthState(true, storedUser);
            
            // Try to fetch fresh profile data
            try {
                const response = await AuthAPI.getProfile();
                if (response.success && response.data.user) {
                    updateHomePageAuthState(true, response.data.user);
                }
            } catch (error) {
                console.warn('Could not fetch fresh profile data:', error);
                // Keep using stored data
            }
        } else {
            // User is not logged in, show logged out state
            updateHomePageAuthState(false, null);
        }
    } catch (error) {
        console.error('Error checking authentication state:', error);
        // Default to logged out state on error
        updateHomePageAuthState(false, null);
    }
}

function updateHomePageAuthState(isLoggedIn, user) {
    const loggedOutNav = document.getElementById('loggedOutNav');
    const loggedInNav = document.getElementById('loggedInNav');
    const userWelcome = document.getElementById('homeUserWelcome');
    const userPortalLink = document.getElementById('userPortalLink');

    // Update navigation
    if (isLoggedIn && user) {
        // Show logged in state
        if (loggedOutNav) loggedOutNav.style.display = 'none';
        if (loggedInNav) loggedInNav.style.display = 'flex';
        
        // Update user welcome message
        if (userWelcome) {
            userWelcome.textContent = `Welcome, ${user.fullName}`;
        }
        
        // Update portal link based on user type
        if (userPortalLink && user.userType) {
            switch (user.userType) {
                case 'farmer':
                    userPortalLink.href = 'farmer-portal.html';
                    userPortalLink.innerHTML = '<i class="fas fa-tractor"></i> Farmer Portal';
                    break;
                case 'buyer':
                    userPortalLink.href = 'buyer-portal.html';
                    userPortalLink.innerHTML = '<i class="fas fa-shopping-cart"></i> Buyer Portal';
                    break;
                case 'admin':
                    userPortalLink.href = 'admin-panel.html';
                    userPortalLink.innerHTML = '<i class="fas fa-shield-alt"></i> Admin Panel';
                    break;
                default:
                    userPortalLink.href = 'marketplace-dashboard.html';
                    userPortalLink.innerHTML = '<i class="fas fa-tachometer-alt"></i> My Portal';
            }
        }
        
        // Show chat navigation for logged in users
        const chatNavItems = document.querySelectorAll('.logged-in-only');
        chatNavItems.forEach(item => {
            item.style.display = 'block';
        });
        
        // Personalize hero section
        updateHeroSection(user);
        
    } else {
        // Show logged out state
        if (loggedOutNav) loggedOutNav.style.display = 'flex';
        if (loggedInNav) loggedInNav.style.display = 'none';
        
        // Hide chat navigation for logged out users
        const chatNavItems = document.querySelectorAll('.logged-in-only');
        chatNavItems.forEach(item => {
            item.style.display = 'none';
        });
        
        // Reset hero section to default
        updateHeroSection(null);
    }
}

function updateHeroSection(user) {
    const heroTitle = document.getElementById('heroTitle');
    const heroSubtitle = document.getElementById('heroSubtitle');
    const heroButtons = document.getElementById('heroButtons');
    
    if (user) {
        // Personalized content for logged in users
        const firstName = user.fullName.split(' ')[0];
        
        if (heroTitle) {
            heroTitle.innerHTML = `Welcome back, <span class="highlight">${firstName}!</span>`;
        }
        
        if (heroSubtitle) {
            let personalizedSubtitle = '';
            switch (user.userType) {
                case 'farmer':
                    personalizedSubtitle = user.farmName 
                        ? `Ready to manage ${user.farmName} and connect with buyers? Access your farmer portal to list crops and track orders.`
                        : `Ready to share your fresh produce with the community? Access your farmer portal to list crops and connect with buyers.`;
                    break;
                case 'buyer':
                    personalizedSubtitle = user.businessName 
                        ? `Find quality crops for ${user.businessName}. Browse fresh produce from local farmers and place orders directly.`
                        : `Discover fresh, quality produce from local farmers. Browse crops and place orders directly from the source.`;
                    break;
                case 'admin':
                    personalizedSubtitle = `Monitor the platform's health and support the farming community. Access your admin tools to manage users and oversee operations.`;
                    break;
                default:
                    personalizedSubtitle = `Explore fresh produce from local Namibian farmers and support sustainable agriculture.`;
            }
            heroSubtitle.textContent = personalizedSubtitle;
        }
        
        if (heroButtons && user.userType) {
            // Show user's specific portal button prominently
            let portalButton = '';
            let secondaryButton = '';
            
            switch (user.userType) {
                case 'farmer':
                    portalButton = `
                        <a href="farmer-portal.html" class="btn btn-primary btn-large">
                            <i class="fas fa-tachometer-alt"></i>
                            Go to My Portal
                        </a>`;
                    secondaryButton = `
                        <a href="marketplace-dashboard.html" class="btn btn-secondary btn-large">
                            <i class="fas fa-store"></i>
                            Browse Marketplace
                        </a>`;
                    break;
                case 'buyer':
                    portalButton = `
                        <a href="buyer-portal.html" class="btn btn-primary btn-large">
                            <i class="fas fa-tachometer-alt"></i>
                            Go to My Portal
                        </a>`;
                    secondaryButton = `
                        <a href="marketplace-dashboard.html" class="btn btn-secondary btn-large">
                            <i class="fas fa-shopping-cart"></i>
                            Browse Crops
                        </a>`;
                    break;
                case 'admin':
                    portalButton = `
                        <a href="admin-panel.html" class="btn btn-primary btn-large">
                            <i class="fas fa-shield-alt"></i>
                            Admin Panel
                        </a>`;
                    secondaryButton = `
                        <a href="marketplace-dashboard.html" class="btn btn-secondary btn-large">
                            <i class="fas fa-chart-bar"></i>
                            View Analytics
                        </a>`;
                    break;
            }
            
            heroButtons.innerHTML = portalButton + secondaryButton;
        }
    } else {
        // Default content for logged out users
        if (heroTitle) {
            heroTitle.innerHTML = 'For the Love of <span class="highlight">Fresh Produce</span>';
        }
        
        if (heroSubtitle) {
            heroSubtitle.textContent = 'Connecting Namibian farmers directly with buyers since 2025. Supporting local agriculture and bringing fresh, quality crops from farm to table.';
        }
        
        if (heroButtons) {
            heroButtons.innerHTML = `
                <a href="farmer-portal.html" class="btn btn-primary btn-large">
                    <i class="fas fa-seedling"></i>
                    Sell Your Crops
                </a>
                <a href="buyer-portal.html" class="btn btn-secondary btn-large">
                    <i class="fas fa-shopping-cart"></i>
                    Buy Fresh Produce
                </a>`;
        }
    }
}

// Handle logout from home page
async function handleHomeLogout() {
    try {
        if (typeof AuthAPI !== 'undefined' && AuthAPI.logout) {
            await AuthAPI.logout();
        } else {
            // Fallback: clear localStorage directly
            if (typeof UserManager !== 'undefined') {
                UserManager.remove();
            }
            if (typeof TokenManager !== 'undefined') {
                TokenManager.remove();
            }
        }
        
        // Update UI to logged out state
        updateHomePageAuthState(false, null);
        
        // Optionally scroll to top or show a message
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error during logout:', error);
        // Still update UI even if API call fails
        updateHomePageAuthState(false, null);
    }
}

// Navigation functionality
function initializeNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Mobile menu toggle
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // Smooth scrolling for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
                
                // Close mobile menu if open
                hamburger?.classList.remove('active');
                navMenu?.classList.remove('active');
            }
        });
    });

    // Handle user type selection
    const userTypeSelector = document.getElementById('userType');
    if (userTypeSelector) {
        userTypeSelector.addEventListener('change', function() {
            const userType = this.value;
            if (userType) {
                openRegistrationModal(userType);
            }
        });
    }

    // Initialize user dropdown functionality
    initializeUserDropdown();
}

// User dropdown functionality
function initializeUserDropdown() {
    const dropdownBtns = document.querySelectorAll('.dropdown-btn');
    
    dropdownBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = this.parentElement;
            const dropdownContent = dropdown.querySelector('.dropdown-content');
            
            // Close all other dropdowns
            document.querySelectorAll('.user-dropdown').forEach(userDropdown => {
                if (userDropdown !== dropdown) {
                    userDropdown.classList.remove('active');
                }
            });
            
            // Toggle current dropdown
            dropdown.classList.toggle('active');
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.user-dropdown')) {
            document.querySelectorAll('.user-dropdown').forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        }
    });
}

// Modal functionality
function initializeModal() {
    const modal = document.getElementById('registrationModal');
    const closeBtn = document.querySelector('.close');
    const registerButtons = document.querySelectorAll('[href="#register"], [href="#register-farmer"], [href="#register-buyer"]');
    const loginButtons = document.querySelectorAll('[href="#login"]');
    
    // Open modal for registration buttons
    registerButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            let userType = '';
            
            if (href === '#register-farmer') userType = 'farmer';
            else if (href === '#register-buyer') userType = 'buyer';
            
            openRegistrationModal(userType);
        });
    });

    // Login button functionality (placeholder)
    loginButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            showLoginForm();
        });
    });

    // Close modal
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

function openRegistrationModal(userType = '') {
    const modal = document.getElementById('registrationModal');
    modal.style.display = 'block';
    
    if (userType) {
        switchTab(userType);
    }
}

function switchTab(tabName) {
    // Remove active class from all tabs and contents
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab and content
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

function showLoginForm() {
    // Create and show login modal
    const existingModal = document.getElementById('loginModal');
    if (existingModal) {
        existingModal.style.display = 'block';
        return;
    }
    
    const loginModalHTML = `
        <div id="loginModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Login to Your Account</h2>
                    <span class="close" onclick="closeLoginModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div id="loginErrorContainer"></div>
                    <div id="loginMessageContainer"></div>
                    <form id="loginForm">
                        <div class="form-group">
                            <label for="loginEmail">Email Address</label>
                            <input type="email" id="loginEmail" name="email" required>
                        </div>
                        <div class="form-group">
                            <label for="loginPassword">Password</label>
                            <input type="password" id="loginPassword" name="password" required>
                        </div>
                        <button type="submit" class="btn-primary">Login</button>
                    </form>
                    <div class="form-footer">
                        <p><a href="#" onclick="showForgotPasswordForm()">Forgot your password?</a></p>
                        <p>Don't have an account? <a href="#" onclick="closeLoginModal(); openRegistrationModal()">Sign up here</a></p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', loginModalHTML);
    document.getElementById('loginModal').style.display = 'block';
    
    // Add event listener for form submission
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    APIUtils.clearMessages('loginErrorContainer');
    
    try {
        LoadingManager.showButton(submitButton, 'Signing In...');
        
        const loginData = {
            email: document.getElementById('loginEmail').value.trim(),
            password: document.getElementById('loginPassword').value
        };
        
        const response = await AuthAPI.login(loginData);
        
        if (response.success) {
            APIUtils.showSuccessMessage('Login successful! Redirecting...', 'loginMessageContainer');
            
            // Update home page authentication state immediately
            checkUserAuthenticationState();
            
            setTimeout(() => {
                closeLoginModal();
                APIUtils.redirectBasedOnUserType();
            }, 1500);
        }
        
    } catch (error) {
        console.error('Login error:', error);
        APIUtils.showErrorMessage(error, 'loginErrorContainer');
    } finally {
        LoadingManager.hideButton(submitButton);
    }
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'none';
        modal.remove();
    }
}

// Search and filter functionality
function initializeSearch() {
    const searchInput = document.getElementById('cropSearch');
    const searchBtn = document.querySelector('.search-btn');
    const regionFilter = document.getElementById('regionFilter');
    const cropTypeFilter = document.getElementById('cropTypeFilter');
    const priceFilter = document.getElementById('priceFilter');

    // Search functionality
    if (searchInput && searchBtn) {
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    // Filter functionality
    [regionFilter, cropTypeFilter, priceFilter].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', applyFilters);
        }
    });
}

function performSearch() {
    const searchTerm = document.getElementById('cropSearch').value.toLowerCase();
    const cropCards = document.querySelectorAll('.crop-card');
    
    cropCards.forEach(card => {
        const cropName = card.querySelector('.crop-name').textContent.toLowerCase();
        const farmerName = card.querySelector('.crop-farmer').textContent.toLowerCase();
        const location = card.querySelector('.crop-location').textContent.toLowerCase();
        
        const matches = cropName.includes(searchTerm) || 
                       farmerName.includes(searchTerm) || 
                       location.includes(searchTerm);
        
        card.style.display = matches ? 'block' : 'none';
    });
}

function applyFilters() {
    const regionFilter = document.getElementById('regionFilter').value;
    const cropTypeFilter = document.getElementById('cropTypeFilter').value;
    const priceFilter = document.getElementById('priceFilter').value;
    const cropCards = document.querySelectorAll('.crop-card');
    
    cropCards.forEach(card => {
        let shouldShow = true;
        
        // Region filter
        if (regionFilter) {
            const location = card.querySelector('.crop-location').textContent.toLowerCase();
            if (!location.includes(regionFilter.toLowerCase())) {
                shouldShow = false;
            }
        }
        
        // Crop type filter (would need to be implemented with data attributes)
        if (cropTypeFilter) {
            const cropType = card.dataset.cropType || '';
            if (cropType !== cropTypeFilter) {
                shouldShow = false;
            }
        }
        
        // Price filter
        if (priceFilter) {
            const priceText = card.querySelector('.crop-price').textContent;
            const price = parseFloat(priceText.replace(/[^\d.]/g, ''));
            
            switch (priceFilter) {
                case 'low':
                    if (price >= 50) shouldShow = false;
                    break;
                case 'medium':
                    if (price < 50 || price > 100) shouldShow = false;
                    break;
                case 'high':
                    if (price <= 100) shouldShow = false;
                    break;
            }
        }
        
        card.style.display = shouldShow ? 'block' : 'none';
    });
}

// Form handling
function initializeForms() {
    const farmerForm = document.getElementById('farmerRegistrationForm');
    const buyerForm = document.getElementById('buyerRegistrationForm');
    
    if (farmerForm) {
        farmerForm.addEventListener('submit', handleFarmerRegistration);
    }
    
    if (buyerForm) {
        buyerForm.addEventListener('submit', handleBuyerRegistration);
    }
}

async function handleFarmerRegistration(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    APIUtils.clearMessages('farmerErrorContainer');
    
    try {
        LoadingManager.showButton(submitButton, 'Creating Account...');
        
        const farmerData = {
            fullName: document.getElementById('farmerName').value.trim(),
            email: document.getElementById('farmerEmail').value.trim(),
            phone: document.getElementById('farmerPhone').value.trim(),
            region: document.getElementById('farmerRegion').value.trim(),
            password: document.getElementById('farmerPassword').value,
            confirmPassword: document.getElementById('farmerConfirmPassword').value,
            userType: 'farmer',
            farmName: document.getElementById('farmName')?.value?.trim() || '',
            farmSize: parseFloat(document.getElementById('farmSize')?.value) || 0,
            farmingExperience: parseInt(document.getElementById('farmingExperience')?.value) || 0,
            farmLocation: document.getElementById('farmLocation')?.value?.trim() || ''
        };
        
        // Validate passwords match
        if (farmerData.password !== farmerData.confirmPassword) {
            throw new Error('Passwords do not match!');
        }
        
        // Remove confirmPassword before sending
        delete farmerData.confirmPassword;
        
        const response = await AuthAPI.register(farmerData);
        
        if (response.success) {
            APIUtils.showSuccessMessage('Registration successful! Redirecting to your portal...', 'farmerMessageContainer');
            
            // Update home page authentication state
            checkUserAuthenticationState();
            
            // Close modal and reset form
            setTimeout(() => {
                document.getElementById('registrationModal').style.display = 'none';
                e.target.reset();
                window.location.href = '/farmer-portal.html';
            }, 2000);
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        APIUtils.showErrorMessage(error, 'farmerErrorContainer');
    } finally {
        LoadingManager.hideButton(submitButton);
    }
}

async function handleBuyerRegistration(e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    APIUtils.clearMessages('buyerErrorContainer');
    
    try {
        LoadingManager.showButton(submitButton, 'Creating Account...');
        
        const buyerData = {
            fullName: document.getElementById('buyerName').value.trim(),
            email: document.getElementById('buyerEmail').value.trim(),
            phone: document.getElementById('buyerPhone').value.trim(),
            region: document.getElementById('buyerLocation').value.trim(),
            password: document.getElementById('buyerPassword').value,
            confirmPassword: document.getElementById('buyerConfirmPassword').value,
            userType: 'buyer',
            businessName: document.getElementById('businessName')?.value?.trim() || ''
        };
        
        // Validate passwords match
        if (buyerData.password !== buyerData.confirmPassword) {
            throw new Error('Passwords do not match!');
        }
        
        // Remove confirmPassword before sending
        delete buyerData.confirmPassword;
        
        const response = await AuthAPI.register(buyerData);
        
        if (response.success) {
            APIUtils.showSuccessMessage('Registration successful! Redirecting to your portal...', 'buyerMessageContainer');
            
            // Update home page authentication state
            checkUserAuthenticationState();
            
            // Close modal and reset form
            setTimeout(() => {
                document.getElementById('registrationModal').style.display = 'none';
                e.target.reset();
                window.location.href = '/buyer-portal.html';
            }, 2000);
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        APIUtils.showErrorMessage(error, 'buyerErrorContainer');
    } finally {
        LoadingManager.hideButton(submitButton);
    }
}

// Crop card interactions
function initializeCropCards() {
    const cropCards = document.querySelectorAll('.crop-card');
    
    cropCards.forEach(card => {
        // Add to cart buttons
        const addToCartBtn = card.querySelector('.btn-primary');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', function() {
                const cropName = card.querySelector('.crop-name').textContent;
                handleAddToCart(cropName, card);
            });
        }
        
        // Contact farmer buttons
        const contactBtn = card.querySelector('.btn-outline');
        if (contactBtn) {
            contactBtn.addEventListener('click', function() {
                const farmerName = card.querySelector('.crop-farmer').textContent.replace('by ', '');
                const cropName = card.querySelector('.crop-name').textContent;
                handleContactFarmer(farmerName, cropName);
            });
        }
        
        // Card hover effects (handled by CSS, but we can add additional JS effects here)
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

function handleAddToCart(cropName, card) {
    // Here you would normally add to a shopping cart system
    const price = card.querySelector('.crop-price').textContent;
    const farmer = card.querySelector('.crop-farmer').textContent;
    
    console.log(`Adding to cart: ${cropName} at ${price} from ${farmer}`);
    
    // Show confirmation
    showNotification(`${cropName} added to cart!`, 'success');
    
    // Update cart count (if you have a cart counter in the header)
    updateCartCount();
}

function handleContactFarmer(farmerName, cropName) {
    // Redirect to chat page with farmer parameter
    console.log(`Opening chat with ${farmerName} about ${cropName}`);
    
    const chatUrl = `public/chat.html?farmer=${encodeURIComponent(farmerName)}&crop=${encodeURIComponent(cropName)}`;
    window.location.href = chatUrl;
}

// Scroll effects
function initializeScrollEffects() {
    // Navbar background on scroll
    window.addEventListener('scroll', function() {
        const header = document.querySelector('.header');
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
    
    // Animate elements on scroll (intersection observer)
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    document.querySelectorAll('.crop-card, .step-card, .support-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Load crops from API
async function loadSampleCrops() {
    const cropContainer = document.getElementById('cropContainer') || document.querySelector('.crop-grid');
    if (!cropContainer) return;
    
    try {
        LoadingManager.show(cropContainer, 'Loading fresh crops...');
        
        const response = await CropsAPI.getCrops({ limit: 12, status: 'available' });
        
        if (response.success && response.data.crops.length > 0) {
            displayCrops(response.data.crops, cropContainer);
        } else {
            cropContainer.innerHTML = '<p class="no-crops">No crops available at the moment. Check back soon!</p>';
        }
        
    } catch (error) {
        console.error('Failed to load crops:', error);
        cropContainer.innerHTML = `
            <div class="error-message">
                <p>Unable to load crops. Please try again later.</p>
                <button onclick="loadSampleCrops()" class="btn-primary">Retry</button>
            </div>
        `;
    }
}

function displayCrops(crops, container) {
    const cropsHTML = crops.map(crop => {
        const imageUrl = crop.images && crop.images.length > 0 
            ? `/uploads/${crop.images[0]}` 
            : 'images/default-crop.jpg';
        
        const priceFormatted = APIUtils.formatCurrency(crop.pricePerKg);
        const farmerName = crop.farmer?.fullName || crop.farmer?.farmName || 'Unknown Farmer';
        const location = `${crop.location?.city || ''}, ${crop.location?.region || ''}`.trim();
        
        return `
            <div class="crop-card" data-crop-id="${crop._id}">
                <div class="crop-image">
                    <img src="${imageUrl}" alt="${crop.name}" onerror="this.src='images/default-crop.jpg'">
                    ${crop.organicCertified ? '<span class="organic-badge">Organic</span>' : ''}
                </div>
                <div class="crop-info">
                    <h3 class="crop-name">${crop.name}</h3>
                    <p class="farmer-name">by ${farmerName}</p>
                    <p class="crop-location">${location}</p>
                    <div class="crop-details">
                        <span class="quantity">${crop.quantityAvailable}${crop.unit}</span>
                        <span class="price">${priceFormatted}/kg</span>
                    </div>
                    <div class="crop-category">
                        <span class="category-tag">${crop.category}</span>
                    </div>
                    <div class="crop-actions">
                        <button class="btn-primary" onclick="viewCropDetails('${crop._id}')">
                            View Details
                        </button>
                        ${UserManager.getUserType() === 'buyer' ? 
                            `<button class="btn-secondary" onclick="contactFarmer('${crop.farmer._id || crop.farmer}')">
                                Contact Farmer
                            </button>` : ''
                        }
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = cropsHTML;
}

// View crop details function
async function viewCropDetails(cropId) {
    try {
        const response = await CropsAPI.getCrop(cropId);
        
        if (response.success) {
            showCropModal(response.data.crop);
        }
    } catch (error) {
        console.error('Failed to load crop details:', error);
        APIUtils.showErrorMessage(error);
    }
}

// Show crop details modal
function showCropModal(crop) {
    const modalHTML = `
        <div id="cropModal" class="modal">
            <div class="modal-content crop-modal">
                <div class="modal-header">
                    <h2>${crop.name}</h2>
                    <span class="close" onclick="closeCropModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="crop-details-content">
                        <div class="crop-images">
                            ${crop.images && crop.images.length > 0 ? 
                                crop.images.map(img => `<img src="/uploads/${img}" alt="${crop.name}">`).join('') :
                                '<img src="images/default-crop.jpg" alt="No image available">'
                            }
                        </div>
                        <div class="crop-info-detailed">
                            <p><strong>Category:</strong> ${crop.category}</p>
                            <p><strong>Farmer:</strong> ${crop.farmer?.fullName || 'Unknown'}</p>
                            <p><strong>Farm:</strong> ${crop.farmer?.farmName || 'N/A'}</p>
                            <p><strong>Location:</strong> ${crop.location?.address}, ${crop.location?.city}, ${crop.location?.region}</p>
                            <p><strong>Available Quantity:</strong> ${crop.quantityAvailable} ${crop.unit}</p>
                            <p><strong>Price:</strong> ${APIUtils.formatCurrency(crop.pricePerKg)}/kg</p>
                            <p><strong>Harvest Date:</strong> ${APIUtils.formatDate(crop.harvestDate)}</p>
                            <p><strong>Best Before:</strong> ${APIUtils.formatDate(crop.expiryDate)}</p>
                            ${crop.organicCertified ? '<p><strong>Certification:</strong> Organic Certified ✓</p>' : ''}
                            <div class="crop-description">
                                <strong>Description:</strong>
                                <p>${crop.description}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('cropModal').style.display = 'block';
}

function closeCropModal() {
    const modal = document.getElementById('cropModal');
    if (modal) {
        modal.style.display = 'none';
        modal.remove();
    }
}

// Utility functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '100px',
        right: '20px',
        padding: '12px 20px',
        backgroundColor: type === 'success' ? '#d4edda' : '#f8f9fa',
        color: type === 'success' ? '#155724' : '#333',
        border: `1px solid ${type === 'success' ? '#c3e6cb' : '#dee2e6'}`,
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '3000',
        animation: 'slideInRight 0.3s ease'
    });
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function updateCartCount() {
    // Update cart counter in navigation
    // This would integrate with your cart system
    let cartCount = parseInt(localStorage.getItem('cartCount') || '0');
    cartCount++;
    localStorage.setItem('cartCount', cartCount);
    
    // Update display if cart counter exists
    const cartCounter = document.querySelector('.cart-counter');
    if (cartCounter) {
        cartCounter.textContent = cartCount;
    }
}

// Additional CSS for notifications
const notificationStyles = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;

// Add notification styles to head
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Contact farmer from crop card
function contactFarmerFromCard(button) {
    const cropCard = button.closest('.crop-card');
    const cropName = cropCard.querySelector('.crop-name')?.textContent || 'Unknown Crop';
    const farmerElement = cropCard.querySelector('.crop-farmer');
    
    let farmerName = 'Unknown Farmer';
    if (farmerElement) {
        // Extract farmer name from "by John Kazhila" format
        farmerName = farmerElement.textContent.replace(/^by\s+/i, '').trim();
    }
    
    // Use existing handleContactFarmer function
    handleContactFarmer(farmerName, cropName);
}

// Initialize contact farmer buttons on page load
function initializeContactFarmerButtons() {
    // Add click handlers to all contact farmer buttons that don't already have onclick
    const contactButtons = document.querySelectorAll('button:not([onclick])');
    contactButtons.forEach(button => {
        const buttonText = button.textContent.trim();
        if (buttonText.includes('Contact Farmer') || buttonText.includes('Contact')) {
            button.addEventListener('click', () => contactFarmerFromCard(button));
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeContactFarmerButtons);

// Export functions for use in other files (if needed)
window.FarmersMarketplace = {
    openRegistrationModal,
    switchTab,
    performSearch,
    applyFilters,
    showNotification,
    contactFarmerFromCard,
    handleContactFarmer
};