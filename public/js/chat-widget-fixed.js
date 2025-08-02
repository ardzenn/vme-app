// Chat Widget - Fixed Implementation
(function() {
    // State
    let isInitialized = false;
    let isOpen = false;
    
    // DOM Elements
    let toggler, container, closeBtn, chatMessages;
    
    // Initialize the chat widget
    function initChatWidget(options = {}) {
        if (isInitialized) {
            console.log('Chat widget already initialized');
            return;
        }
        
        console.log('Initializing chat widget with options:', options);
        
        // Get DOM elements
        toggler = document.getElementById('chat-widget-toggler');
        container = document.getElementById('chat-widget-container');
        closeBtn = document.getElementById('chat-widget-close');
        chatMessages = document.getElementById('chat-messages');
        
        if (!toggler || !container) {
            console.error('Required chat widget elements not found');
            return;
        }
        
        // Set up event listeners
        toggler.addEventListener('click', toggleChat);
        if (closeBtn) {
            closeBtn.addEventListener('click', toggleChat);
        }
        
        // Show the toggler
        toggler.style.display = 'flex';
        
        // Set initial state
        isInitialized = true;
        isOpen = false;
        updateUI();
        
        console.log('Chat widget initialized successfully');
    }
    
    // Toggle chat open/closed
    function toggleChat(e) {
        if (e) e.preventDefault();
        isOpen = !isOpen;
        updateUI();
    }
    
    // Update UI based on state
    function updateUI() {
        if (isOpen) {
            container.style.display = 'flex';
            toggler.classList.add('active');
        } else {
            container.style.display = 'none';
            toggler.classList.remove('active');
        }
    }
    
    // Expose to window
    window.initChatWidget = initChatWidget;
    
    // Auto-initialize if script is loaded after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.initChatWidget();
        });
    } else {
        // DOM is already loaded
        setTimeout(() => window.initChatWidget(), 0);
    }
})();
