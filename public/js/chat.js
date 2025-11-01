// Chat Application JavaScript
class ChatApp {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentConversation = null;
        this.conversations = new Map();
        this.onlineUsers = new Map();
        this.typingTimeouts = new Map();
        this.messageCache = new Map();
        this.connectionRetryCount = 0;
        this.maxRetries = 5;
        
        this.init();
    }

    async init() {
        // Check authentication
        await this.checkAuth();
        
        // Initialize Socket.IO
        this.initSocket();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial data
        await this.loadInitialData();
        
        // Check for URL parameters to auto-open conversation
        await this.handleURLParameters();
        
        // Show connection status
        this.updateConnectionStatus('connecting');
    }

    async checkAuth() {
        try {
            const token = TokenManager.get();
            if (!token) {
                window.location.href = '../index.html';
                return;
            }

            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                this.currentUser = userData.user;
                this.updateNavigation();
            } else {
                TokenManager.remove();
                window.location.href = '../index.html';
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '../index.html';
        }
    }

    async handleURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const farmerName = urlParams.get('farmer');
        const userId = urlParams.get('userId');
        
        if (farmerName || userId) {
            // Wait a bit for initial data to load
            setTimeout(async () => {
                try {
                    if (userId) {
                        // If we have userId, use it directly
                        await this.startConversationWithUser(userId);
                    } else if (farmerName) {
                        // If we have farmer name, find the user by name
                        await this.startConversationByName(farmerName);
                    }
                    
                    // Clear URL parameters after opening conversation
                    const url = new URL(window.location);
                    url.searchParams.delete('farmer');
                    url.searchParams.delete('userId');
                    window.history.replaceState({}, document.title, url.pathname);
                } catch (error) {
                    console.error('Error opening conversation from URL:', error);
                }
            }, 2000);
        }
    }

    initSocket() {
        const token = TokenManager.get();
        
        this.socket = io('/', {
            auth: {
                token: token
            },
            transports: ['websocket', 'polling']
        });

        // Connection events
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateConnectionStatus('connected');
            this.connectionRetryCount = 0;
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected:', reason);
            this.updateConnectionStatus('disconnected');
            
            if (reason === 'io server disconnect') {
                // Server disconnected, try to reconnect
                this.socket.connect();
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.updateConnectionStatus('disconnected');
            
            if (this.connectionRetryCount < this.maxRetries) {
                this.connectionRetryCount++;
                setTimeout(() => {
                    console.log(`Retrying connection (${this.connectionRetryCount}/${this.maxRetries})`);
                    this.socket.connect();
                }, 2000 * this.connectionRetryCount);
            }
        });

        // Chat events
        this.socket.on('new_message', (data) => {
            this.handleNewMessage(data);
        });

        this.socket.on('message_read', (data) => {
            this.handleMessageRead(data);
        });

        this.socket.on('user_online', (data) => {
            this.handleUserOnline(data);
        });

        this.socket.on('user_offline', (data) => {
            this.handleUserOffline(data);
        });

        this.socket.on('typing_start', (data) => {
            this.handleTypingStart(data);
        });

        this.socket.on('typing_stop', (data) => {
            this.handleTypingStop(data);
        });

        this.socket.on('online_users', (users) => {
            this.updateOnlineUsers(users);
        });
    }

    setupEventListeners() {
        // Message input
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const charCounter = document.getElementById('charCounter');

        if (messageInput) {
            messageInput.addEventListener('input', () => {
                this.handleInputChange();
                this.handleTyping();
            });

            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            messageInput.addEventListener('paste', (e) => {
                setTimeout(() => this.handleInputChange(), 0);
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // Search functionality
        const chatSearch = document.getElementById('chatSearch');
        if (chatSearch) {
            chatSearch.addEventListener('input', (e) => {
                this.searchConversations(e.target.value);
            });
        }

        const userSearch = document.getElementById('userSearch');
        if (userSearch) {
            userSearch.addEventListener('input', (e) => {
                this.searchUsers(e.target.value);
            });
        }

        // Modal controls
        const newChatBtn = document.getElementById('newChatBtn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => this.showNewChatModal());
        }

        // User type filter
        const userTypeRadios = document.querySelectorAll('input[name="userType"]');
        userTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.filterUsers();
            });
        });

        // Auto-resize textarea
        if (messageInput) {
            messageInput.addEventListener('input', this.autoResizeTextarea);
        }
    }

    async loadInitialData() {
        try {
            // Load conversations
            await this.loadConversations();
            
            // Load users for new chat modal
            await this.loadUsers();
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showToast('Failed to load chat data', 'error');
        }
    }

    async loadConversations() {
        try {
            const response = await fetch('/api/chat/conversations', {
                headers: {
                    'Authorization': `Bearer ${TokenManager.get()}`
                }
            });

            if (response.ok) {
                const conversations = await response.json();
                this.renderConversations(conversations);
            } else {
                throw new Error('Failed to load conversations');
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            this.showEmptyConversations();
        }
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/chat/users', {
                headers: {
                    'Authorization': `Bearer ${TokenManager.get()}`
                }
            });

            if (response.ok) {
                const users = await response.json();
                this.renderUsers(users);
            } else {
                throw new Error('Failed to load users');
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    renderConversations(conversations) {
        const container = document.getElementById('conversationsList');
        
        if (conversations.length === 0) {
            this.showEmptyConversations();
            return;
        }

        container.innerHTML = '';
        
        conversations.forEach(conversation => {
            const conversationEl = this.createConversationElement(conversation);
            container.appendChild(conversationEl);
            
            // Store conversation data
            this.conversations.set(conversation.partnerId, conversation);
        });
    }

    createConversationElement(conversation) {
        const div = document.createElement('div');
        div.className = 'conversation-item';
        div.dataset.partnerId = conversation.partnerId;
        
        const isOnline = this.onlineUsers.has(conversation.partnerId);
        const lastMessage = conversation.lastMessage || {};
        const timeAgo = lastMessage.createdAt ? this.formatTimeAgo(new Date(lastMessage.createdAt)) : '';
        
        div.innerHTML = `
            <div class="conversation-avatar">
                <img src="${conversation.partnerAvatar || 'images/logo.png'}" alt="${conversation.partnerName}">
                <div class="online-indicator ${isOnline ? 'online' : 'offline'}"></div>
            </div>
            <div class="conversation-info">
                <div class="conversation-header">
                    <div class="conversation-name">${conversation.partnerName}</div>
                    <div class="conversation-time">${timeAgo}</div>
                </div>
                <div class="conversation-preview">
                    <div class="last-message">
                        ${lastMessage.content ? this.truncateMessage(lastMessage.content) : 'No messages yet'}
                    </div>
                    ${conversation.unreadCount > 0 ? `<div class="unread-count">${conversation.unreadCount}</div>` : ''}
                </div>
            </div>
        `;
        
        div.addEventListener('click', () => this.openConversation(conversation));
        
        return div;
    }

    showEmptyConversations() {
        const container = document.getElementById('conversationsList');
        container.innerHTML = `
            <div class="empty-conversations">
                <div class="empty-icon">
                    <i class="fas fa-comments"></i>
                </div>
                <h3>No conversations yet</h3>
                <p>Start a new conversation to connect with farmers and buyers.</p>
                <button class="btn btn-primary" onclick="chatApp.showNewChatModal()">
                    <i class="fas fa-plus"></i>
                    Start New Chat
                </button>
            </div>
        `;
    }

    renderUsers(users) {
        const container = document.getElementById('usersGrid');
        const loadingEl = container.querySelector('.loading-users');
        
        if (loadingEl) {
            loadingEl.remove();
        }
        
        if (users.length === 0) {
            container.innerHTML = `
                <div class="no-users">
                    <p>No users found</p>
                </div>
            `;
            return;
        }

        // Clear existing users but keep any that might be there
        const existingUsers = container.querySelectorAll('.user-card');
        existingUsers.forEach(el => el.remove());
        
        users.forEach(user => {
            if (user._id === this.currentUser._id) return; // Skip current user
            
            const userEl = this.createUserElement(user);
            container.appendChild(userEl);
        });
    }

    createUserElement(user) {
        const div = document.createElement('div');
        div.className = 'user-card';
        div.dataset.userId = user._id;
        
        const isOnline = this.onlineUsers.has(user._id);
        
        div.innerHTML = `
            <div class="user-card-avatar">
                <img src="${user.avatar || 'images/logo.png'}" alt="${user.name}">
                ${isOnline ? '<div class="online-indicator online"></div>' : ''}
            </div>
            <h4>${user.name}</h4>
            <div class="user-type">${user.userType || 'User'}</div>
            ${user.location ? `<div class="user-location">${user.location}</div>` : ''}
        `;
        
        div.addEventListener('click', () => this.startNewConversation(user));
        
        return div;
    }

    async openConversation(conversation) {
        try {
            // Update UI to show this conversation as active
            document.querySelectorAll('.conversation-item').forEach(el => {
                el.classList.remove('active');
            });
            
            const conversationEl = document.querySelector(`[data-partner-id="${conversation.partnerId}"]`);
            if (conversationEl) {
                conversationEl.classList.add('active');
            }
            
            // Set current conversation
            this.currentConversation = conversation;
            
            // Show chat window
            this.showChatWindow(conversation);
            
            // Load messages
            await this.loadMessages(conversation.partnerId);
            
            // Mark messages as read
            this.markMessagesAsRead(conversation.partnerId);
            
        } catch (error) {
            console.error('Error opening conversation:', error);
            this.showToast('Failed to open conversation', 'error');
        }
    }

    showChatWindow(conversation) {
        const chatWelcome = document.getElementById('chatWelcome');
        const chatWindow = document.getElementById('chatWindow');
        
        if (chatWelcome) chatWelcome.style.display = 'none';
        if (chatWindow) chatWindow.style.display = 'flex';
        
        // Update chat header
        const partnerAvatar = document.getElementById('partnerAvatar');
        const partnerName = document.getElementById('partnerName');
        const partnerStatus = document.getElementById('partnerStatus');
        const partnerOnlineStatus = document.getElementById('partnerOnlineStatus');
        
        if (partnerAvatar) partnerAvatar.src = conversation.partnerAvatar || 'images/logo.png';
        if (partnerName) partnerName.textContent = conversation.partnerName;
        
        const isOnline = this.onlineUsers.has(conversation.partnerId);
        if (partnerStatus) {
            partnerStatus.textContent = isOnline ? 'Online' : 'Offline';
            partnerStatus.className = `partner-status ${isOnline ? 'online' : 'offline'}`;
        }
        
        if (partnerOnlineStatus) {
            partnerOnlineStatus.className = `online-indicator ${isOnline ? 'online' : 'offline'}`;
        }
    }

    async loadMessages(partnerId) {
        try {
            const messagesContainer = document.getElementById('messagesContainer');
            const loadingEl = document.getElementById('messagesLoading');
            
            if (loadingEl) loadingEl.style.display = 'flex';
            
            const response = await fetch(`/api/chat/messages/${partnerId}`, {
                headers: {
                    'Authorization': `Bearer ${TokenManager.get()}`
                }
            });

            if (response.ok) {
                const messages = await response.json();
                this.renderMessages(messages);
                
                // Cache messages
                this.messageCache.set(partnerId, messages);
            } else {
                throw new Error('Failed to load messages');
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            this.showToast('Failed to load messages', 'error');
        } finally {
            const loadingEl = document.getElementById('messagesLoading');
            if (loadingEl) loadingEl.style.display = 'none';
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messagesContainer');
        
        // Clear existing messages except loading indicator
        const existingMessages = container.querySelectorAll('.message');
        existingMessages.forEach(el => el.remove());
        
        messages.forEach(message => {
            const messageEl = this.createMessageElement(message);
            container.appendChild(messageEl);
        });
        
        // Scroll to bottom
        this.scrollToBottom();
    }

    createMessageElement(message) {
        const div = document.createElement('div');
        const isSent = message.senderId === this.currentUser._id;
        
        div.className = `message ${isSent ? 'sent' : 'received'}`;
        div.dataset.messageId = message._id;
        
        const avatar = isSent ? 
            (this.currentUser.avatar || 'images/logo.png') : 
            (this.currentConversation?.partnerAvatar || 'images/logo.png');
        
        div.innerHTML = `
            ${!isSent ? `
                <div class="message-avatar">
                    <img src="${avatar}" alt="Avatar">
                </div>
            ` : ''}
            <div class="message-content">
                <div class="message-bubble">
                    ${this.formatMessageContent(message.content)}
                </div>
                <div class="message-info">
                    <span class="message-time">${this.formatTime(new Date(message.createdAt))}</span>
                    ${isSent ? `
                        <div class="message-status ${this.getMessageStatus(message)}">
                            ${this.getMessageStatusIcon(message)}
                        </div>
                    ` : ''}
                </div>
            </div>
            ${isSent ? `
                <div class="message-avatar">
                    <img src="${avatar}" alt="Avatar">
                </div>
            ` : ''}
        `;
        
        return div;
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();
        
        if (!content || !this.currentConversation) {
            return;
        }
        
        try {
            const tempId = 'temp_' + Date.now();
            const tempMessage = {
                _id: tempId,
                content: content,
                senderId: this.currentUser._id,
                receiverId: this.currentConversation.partnerId,
                createdAt: new Date(),
                status: 'sending'
            };
            
            // Add message to UI immediately
            this.addMessageToUI(tempMessage);
            
            // Clear input
            messageInput.value = '';
            this.handleInputChange();
            
            // Stop typing indicator
            this.stopTyping();
            
            // Send via socket
            this.socket.emit('send_message', {
                receiverId: this.currentConversation.partnerId,
                content: content,
                tempId: tempId
            });
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.showToast('Failed to send message', 'error');
        }
    }

    addMessageToUI(message) {
        const container = document.getElementById('messagesContainer');
        const messageEl = this.createMessageElement(message);
        
        container.appendChild(messageEl);
        this.scrollToBottom();
        
        return messageEl;
    }

    handleNewMessage(data) {
        const { message, tempId } = data;
        
        if (tempId) {
            // Replace temporary message
            const tempElement = document.querySelector(`[data-message-id="${tempId}"]`);
            if (tempElement) {
                tempElement.remove();
            }
        }
        
        // Add new message to UI
        if (this.currentConversation && 
            (message.senderId === this.currentConversation.partnerId || 
             message.receiverId === this.currentConversation.partnerId)) {
            this.addMessageToUI(message);
        }
        
        // Update conversation list
        this.updateConversationList(message);
        
        // Show notification if not in current conversation
        if (!this.currentConversation || 
            message.senderId !== this.currentConversation.partnerId) {
            this.showMessageNotification(message);
        }
        
        // Mark as read if in current conversation
        if (this.currentConversation && 
            message.senderId === this.currentConversation.partnerId) {
            this.markMessagesAsRead(message.senderId);
        }
    }

    updateConversationList(message) {
        // Update existing conversation or create new one
        const partnerId = message.senderId === this.currentUser._id ? 
            message.receiverId : message.senderId;
        
        let conversation = this.conversations.get(partnerId);
        
        if (conversation) {
            conversation.lastMessage = message;
            conversation.updatedAt = message.createdAt;
            
            if (message.senderId !== this.currentUser._id) {
                conversation.unreadCount = (conversation.unreadCount || 0) + 1;
            }
        }
        
        // Re-render conversations to update order and content
        this.loadConversations();
    }

    markMessagesAsRead(partnerId) {
        if (this.socket && this.currentConversation?.partnerId === partnerId) {
            this.socket.emit('mark_read', { partnerId });
        }
    }

    handleMessageRead(data) {
        const { partnerId, messageIds } = data;
        
        // Update message status in UI
        messageIds.forEach(messageId => {
            const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
            if (messageEl) {
                const statusEl = messageEl.querySelector('.message-status');
                if (statusEl) {
                    statusEl.className = 'message-status read';
                    statusEl.innerHTML = '<i class="fas fa-check-double"></i>';
                }
            }
        });
        
        // Update conversation unread count
        const conversation = this.conversations.get(partnerId);
        if (conversation) {
            conversation.unreadCount = 0;
            
            const conversationEl = document.querySelector(`[data-partner-id="${partnerId}"]`);
            if (conversationEl) {
                const unreadEl = conversationEl.querySelector('.unread-count');
                if (unreadEl) {
                    unreadEl.remove();
                }
            }
        }
    }

    handleTyping() {
        if (!this.currentConversation) return;
        
        // Clear existing timeout
        const partnerId = this.currentConversation.partnerId;
        if (this.typingTimeouts.has(partnerId)) {
            clearTimeout(this.typingTimeouts.get(partnerId));
        }
        
        // Emit typing start
        this.socket.emit('typing_start', { receiverId: partnerId });
        
        // Set timeout to stop typing
        const timeout = setTimeout(() => {
            this.stopTyping();
        }, 3000);
        
        this.typingTimeouts.set(partnerId, timeout);
    }

    stopTyping() {
        if (!this.currentConversation) return;
        
        const partnerId = this.currentConversation.partnerId;
        this.socket.emit('typing_stop', { receiverId: partnerId });
        
        if (this.typingTimeouts.has(partnerId)) {
            clearTimeout(this.typingTimeouts.get(partnerId));
            this.typingTimeouts.delete(partnerId);
        }
    }

    handleTypingStart(data) {
        if (this.currentConversation?.partnerId === data.senderId) {
            this.showTypingIndicator(data.senderName);
        }
    }

    handleTypingStop(data) {
        if (this.currentConversation?.partnerId === data.senderId) {
            this.hideTypingIndicator();
        }
    }

    showTypingIndicator(senderName) {
        const typingIndicator = document.getElementById('typingIndicator');
        const typingText = document.getElementById('typingText');
        
        if (typingIndicator && typingText) {
            typingText.textContent = `${senderName} is typing`;
            typingIndicator.style.display = 'block';
            this.scrollToBottom();
        }
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.style.display = 'none';
        }
    }

    handleUserOnline(data) {
        this.onlineUsers.set(data.userId, data);
        this.updateUserOnlineStatus(data.userId, true);
    }

    handleUserOffline(data) {
        this.onlineUsers.delete(data.userId);
        this.updateUserOnlineStatus(data.userId, false);
    }

    updateOnlineUsers(users) {
        this.onlineUsers.clear();
        users.forEach(user => {
            this.onlineUsers.set(user.userId, user);
        });
        
        this.renderOnlineUsers();
        this.updateAllUserStatuses();
    }

    renderOnlineUsers() {
        const container = document.getElementById('onlineUsersList');
        const onlineUsersSection = document.getElementById('onlineUsers');
        const onlineCount = document.getElementById('onlineCount');
        
        if (!container || this.onlineUsers.size === 0) {
            if (onlineUsersSection) onlineUsersSection.style.display = 'none';
            return;
        }
        
        if (onlineUsersSection) onlineUsersSection.style.display = 'block';
        if (onlineCount) onlineCount.textContent = this.onlineUsers.size;
        
        container.innerHTML = '';
        
        Array.from(this.onlineUsers.values()).forEach(user => {
            if (user.userId === this.currentUser._id) return;
            
            const userEl = document.createElement('div');
            userEl.className = 'online-user';
            userEl.innerHTML = `
                <div class="online-user-avatar">
                    <img src="${user.avatar || 'images/logo.png'}" alt="${user.name}">
                    <div class="online-dot"></div>
                </div>
                <div class="online-user-name">${user.name}</div>
            `;
            
            userEl.addEventListener('click', () => {
                this.startNewConversationById(user.userId, user.name);
            });
            
            container.appendChild(userEl);
        });
    }

    updateUserOnlineStatus(userId, isOnline) {
        // Update in conversations list
        const conversationEl = document.querySelector(`[data-partner-id="${userId}"]`);
        if (conversationEl) {
            const indicator = conversationEl.querySelector('.online-indicator');
            if (indicator) {
                indicator.className = `online-indicator ${isOnline ? 'online' : 'offline'}`;
            }
        }
        
        // Update in current chat header
        if (this.currentConversation?.partnerId === userId) {
            const partnerStatus = document.getElementById('partnerStatus');
            const partnerOnlineStatus = document.getElementById('partnerOnlineStatus');
            
            if (partnerStatus) {
                partnerStatus.textContent = isOnline ? 'Online' : 'Offline';
                partnerStatus.className = `partner-status ${isOnline ? 'online' : 'offline'}`;
            }
            
            if (partnerOnlineStatus) {
                partnerOnlineStatus.className = `online-indicator ${isOnline ? 'online' : 'offline'}`;
            }
        }
        
        // Update in user modal
        const userCard = document.querySelector(`[data-user-id="${userId}"]`);
        if (userCard) {
            const existingIndicator = userCard.querySelector('.online-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
            
            if (isOnline) {
                const avatar = userCard.querySelector('.user-card-avatar');
                if (avatar) {
                    avatar.insertAdjacentHTML('beforeend', '<div class="online-indicator online"></div>');
                }
            }
        }
    }

    updateAllUserStatuses() {
        // Update all user statuses in conversations and UI
        document.querySelectorAll('[data-partner-id]').forEach(el => {
            const partnerId = el.dataset.partnerId;
            const isOnline = this.onlineUsers.has(partnerId);
            this.updateUserOnlineStatus(partnerId, isOnline);
        });
    }

    // UI Helper Methods
    handleInputChange() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const charCounter = document.getElementById('charCounter');
        
        if (!messageInput) return;
        
        const content = messageInput.value.trim();
        const length = messageInput.value.length;
        
        // Update character counter
        if (charCounter) {
            charCounter.textContent = `${length}/1000`;
        }
        
        // Update send button state
        if (sendBtn) {
            sendBtn.disabled = !content || length > 1000;
        }
        
        // Auto-resize textarea
        this.autoResizeTextarea(messageInput);
    }

    autoResizeTextarea(element) {
        if (typeof element === 'object' && element.target) {
            element = element.target;
        }
        
        element.style.height = 'auto';
        element.style.height = Math.min(element.scrollHeight, 120) + 'px';
    }

    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        if (container) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 100);
        }
    }

    // Modal Methods
    showNewChatModal() {
        const modal = document.getElementById('newChatModal');
        if (modal) {
            modal.style.display = 'block';
            this.loadUsers();
        }
    }

    closeNewChatModal() {
        const modal = document.getElementById('newChatModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async startNewConversation(user) {
        try {
            this.closeNewChatModal();
            
            // Check if conversation already exists
            let conversation = this.conversations.get(user._id);
            
            if (!conversation) {
                // Create new conversation object
                conversation = {
                    partnerId: user._id,
                    partnerName: user.name,
                    partnerAvatar: user.avatar,
                    lastMessage: null,
                    unreadCount: 0,
                    createdAt: new Date()
                };
                
                this.conversations.set(user._id, conversation);
            }
            
            // Open the conversation
            await this.openConversation(conversation);
            
        } catch (error) {
            console.error('Error starting new conversation:', error);
            this.showToast('Failed to start conversation', 'error');
        }
    }

    async startNewConversationById(userId, userName) {
        const user = {
            _id: userId,
            name: userName,
            avatar: this.onlineUsers.get(userId)?.avatar
        };
        
        await this.startNewConversation(user);
    }

    async startConversationWithUser(userId) {
        // Find user in online users or make API call to get user info
        let user = this.onlineUsers.get(userId);
        
        if (!user) {
            // If user not in online users, we need to get their info from API
            try {
                const response = await fetch(`/api/chat/user/${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${TokenManager.get()}`
                    }
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    user = userData.user;
                } else {
                    throw new Error('User not found');
                }
            } catch (error) {
                console.error('Error fetching user:', error);
                this.showToast('User not found', 'error');
                return;
            }
        }
        
        await this.startNewConversation(user);
    }

    async startConversationByName(farmerName) {
        // Look for user in the users list by name
        const usersContainer = document.getElementById('usersList');
        if (!usersContainer) {
            // Load users first
            await this.loadUsers();
        }
        
        // Find user by name in the loaded users
        const userItems = document.querySelectorAll('#usersList .user-item');
        let targetUser = null;
        
        for (const item of userItems) {
            const userName = item.querySelector('.user-name')?.textContent;
            if (userName && userName.toLowerCase().includes(farmerName.toLowerCase())) {
                const userId = item.getAttribute('data-user-id');
                const userAvatar = item.querySelector('.user-avatar')?.src;
                targetUser = {
                    _id: userId,
                    name: userName,
                    avatar: userAvatar
                };
                break;
            }
        }
        
        if (targetUser) {
            await this.startNewConversation(targetUser);
        } else {
            this.showToast(`Farmer "${farmerName}" not found`, 'error');
        }
    }

    closeChatWindow() {
        const chatWelcome = document.getElementById('chatWelcome');
        const chatWindow = document.getElementById('chatWindow');
        
        if (chatWindow) chatWindow.style.display = 'none';
        if (chatWelcome) chatWelcome.style.display = 'flex';
        
        // Clear current conversation
        this.currentConversation = null;
        
        // Remove active state from conversations
        document.querySelectorAll('.conversation-item').forEach(el => {
            el.classList.remove('active');
        });
    }

    // Search Methods
    searchConversations(query) {
        const conversations = document.querySelectorAll('.conversation-item');
        
        conversations.forEach(conv => {
            const name = conv.querySelector('.conversation-name').textContent.toLowerCase();
            const lastMessage = conv.querySelector('.last-message').textContent.toLowerCase();
            
            const matches = name.includes(query.toLowerCase()) || 
                           lastMessage.includes(query.toLowerCase());
            
            conv.style.display = matches ? 'flex' : 'none';
        });
    }

    searchUsers(query) {
        const users = document.querySelectorAll('.user-card');
        
        users.forEach(user => {
            const name = user.querySelector('h4').textContent.toLowerCase();
            const type = user.querySelector('.user-type').textContent.toLowerCase();
            
            const matches = name.includes(query.toLowerCase()) || 
                           type.includes(query.toLowerCase());
            
            user.style.display = matches ? 'block' : 'none';
        });
    }

    filterUsers() {
        const selectedType = document.querySelector('input[name="userType"]:checked').value;
        const users = document.querySelectorAll('.user-card');
        
        users.forEach(user => {
            const userType = user.querySelector('.user-type').textContent.toLowerCase();
            
            if (selectedType === 'all') {
                user.style.display = 'block';
            } else {
                user.style.display = userType === selectedType ? 'block' : 'none';
            }
        });
    }

    // Connection Status
    updateConnectionStatus(status) {
        const connectionStatus = document.getElementById('connectionStatus');
        const statusText = document.getElementById('statusText');
        
        if (!connectionStatus || !statusText) return;
        
        connectionStatus.className = 'connection-status show';
        
        const statusIndicator = connectionStatus.querySelector('.status-indicator');
        
        switch (status) {
            case 'connected':
                statusIndicator.className = 'status-indicator connected';
                statusText.textContent = 'Connected';
                // Hide after 2 seconds
                setTimeout(() => {
                    connectionStatus.classList.remove('show');
                }, 2000);
                break;
            case 'connecting':
                statusIndicator.className = 'status-indicator connecting';
                statusText.textContent = 'Connecting...';
                break;
            case 'disconnected':
                statusIndicator.className = 'status-indicator disconnected';
                statusText.textContent = 'Disconnected';
                break;
        }
    }

    // Notification Methods
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    showMessageNotification(message) {
        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(`New message from ${message.senderName}`, {
                body: this.truncateMessage(message.content),
                icon: 'images/logo.png',
                tag: `message-${message._id}`
            });
            
            notification.onclick = () => {
                window.focus();
                // Find and open conversation
                const conversation = this.conversations.get(message.senderId);
                if (conversation) {
                    this.openConversation(conversation);
                }
                notification.close();
            };
            
            setTimeout(() => notification.close(), 5000);
        }
        
        // Show in-app toast
        this.showToast(`New message from ${message.senderName}`, 'info');
    }

    // Utility Methods
    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    formatTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'now';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        if (days < 7) return `${days}d`;
        
        return date.toLocaleDateString();
    }

    truncateMessage(content, length = 50) {
        return content.length > length ? content.substring(0, length) + '...' : content;
    }

    formatMessageContent(content) {
        // Convert line breaks to <br> tags
        return content.replace(/\n/g, '<br>');
    }

    getMessageStatus(message) {
        if (message.status) return message.status;
        if (message.readAt) return 'read';
        if (message.deliveredAt) return 'delivered';
        return 'sent';
    }

    getMessageStatusIcon(message) {
        const status = this.getMessageStatus(message);
        
        switch (status) {
            case 'sending':
                return '<i class="fas fa-clock"></i>';
            case 'sent':
                return '<i class="fas fa-check"></i>';
            case 'delivered':
                return '<i class="fas fa-check-double"></i>';
            case 'read':
                return '<i class="fas fa-check-double"></i>';
            default:
                return '<i class="fas fa-check"></i>';
        }
    }

    // Navigation Methods
    updateNavigation() {
        const navUserName = document.getElementById('navUserName');
        const userPortalLink = document.getElementById('userPortalLink');
        
        if (navUserName && this.currentUser) {
            navUserName.textContent = this.currentUser.name;
        }
        
        if (userPortalLink && this.currentUser) {
            const portalUrl = this.currentUser.userType === 'farmer' ? 
                'farmer-portal.html' : 'buyer-portal.html';
            userPortalLink.href = portalUrl;
        }
    }
}

// Global functions
function handleLogout() {
    localStorage.removeItem('token');
    window.location.href = '../index.html';
}

function showNewChatModal() {
    if (window.chatApp) {
        window.chatApp.showNewChatModal();
    }
}

function closeNewChatModal() {
    if (window.chatApp) {
        window.chatApp.closeNewChatModal();
    }
}

function closeChatWindow() {
    if (window.chatApp) {
        window.chatApp.closeChatWindow();
    }
}

// Initialize chat app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // Handle modal clicks
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('newChatModal');
        if (e.target === modal) {
            closeNewChatModal();
        }
    });
    
    // Handle escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeNewChatModal();
        }
    });
});