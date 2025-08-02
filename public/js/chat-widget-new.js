// Simple chat widget implementation
(function() {
    // Only initialize once
    if (window.chatWidgetInitialized) return;
    window.chatWidgetInitialized = true;
    
    // Initialize global variables
    window.processedMessageIds = new Set();
    
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Initializing chat widget...');
        
        // Basic DOM elements
        const chatToggler = document.getElementById('chat-widget-toggler');
        const chatContainer = document.getElementById('chat-widget-container');
        const closeBtn = document.getElementById('chat-widget-close');
        
        if (!chatToggler || !chatContainer) {
            console.error('Chat widget elements not found');
            return;
        }
        
        // Toggle chat visibility
        function toggleChat() {
            chatContainer.classList.toggle('show');
        }
        
        // Event listeners
        chatToggler.addEventListener('click', toggleChat);
        if (closeBtn) {
            closeBtn.addEventListener('click', toggleChat);
        }
        
        // Initialize WebSocket connection
        const currentUserId = document.body.dataset.userId;
        if (!currentUserId) {
            console.error('User ID not found');
            return;
        }
        
        const socket = io({ 
            query: { userId: currentUserId },
            reconnectionAttempts: 3,
            reconnectionDelay: 1000
        });
        
        // Store socket for cleanup
        window.chatWidgetSocket = socket;
        
        // Basic message handling
        socket.on('connect', function() {
            console.log('Connected to chat server');
        });
        
        // Clean up on page unload
        window.addEventListener('beforeunload', function() {
            if (socket) {
                socket.disconnect();
            }
        });
        
        console.log('Chat widget initialized');
    });
})();
