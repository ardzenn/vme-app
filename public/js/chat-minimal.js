// Minimal chat widget implementation
(function() {
    // Only initialize once
    if (window.chatWidgetInitialized) {
        console.log('Chat widget already initialized');
        return;
    }
    window.chatWidgetInitialized = true;
    
    // Get current user ID from the page
    const currentUserId = document.body.dataset.userId;
    if (!currentUserId) {
        console.error('User ID not found. Cannot initialize chat widget.');
        return;
    }
    
    // Track current conversation
    let currentConversationId = null;
    
    // Get or create a conversation with the support team
    async function getOrCreateSupportConversation() {
        try {
            // First, try to find an existing support conversation
            const response = await fetch('/api/conversations', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
                }
            });
            
            const conversations = await response.json();
            if (response.ok && Array.isArray(conversations)) {
                // Look for an existing support conversation
                const supportConvo = conversations.find(conv => 
                    conv.isGroup && 
                    conv.groupName && 
                    conv.groupName.startsWith('Support:')
                );
                
                if (supportConvo) {
                    return supportConvo._id;
                }
                
                // If no support conversation exists, create a new one
                const createResponse = await fetch('/api/conversations/support', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
                    }
                });
                
                const data = await createResponse.json();
                if (data.success && data.conversation) {
                    return data.conversation._id;
                }
            }
            
            throw new Error('Failed to create or find support conversation');
        } catch (error) {
            console.error('Error getting support conversation:', error);
            throw error;
        }
    }
    
    console.log('Initializing minimal chat widget...');
    
    // Create chat widget elements
    const chatToggler = document.createElement('div');
    chatToggler.id = 'chat-widget-toggler';
    chatToggler.innerHTML = '<i class="fas fa-comment"></i>';
    
    const chatContainer = document.createElement('div');
    chatContainer.id = 'chat-widget-container';
    
    const chatHeader = document.createElement('div');
    chatHeader.className = 'chat-header';
    chatHeader.innerHTML = `
        <h5>Chat</h5>
        <button id="chat-widget-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    const chatMessages = document.createElement('div');
    chatMessages.id = 'chat-messages';
    chatMessages.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-comment-alt"></i>
            <p>Start a conversation!</p>
        </div>
    `;
    
    // Create message input area
    const messageInputContainer = document.createElement('div');
    messageInputContainer.className = 'message-input-container';
    messageInputContainer.innerHTML = `
        <div class="input-group">
            <div class="input-group-prepend">
                <button type="button" class="btn btn-outline-secondary" id="emoji-picker-btn">
                    <i class="far fa-smile"></i>
                </button>
                <button type="button" class="btn btn-outline-secondary" id="file-upload-btn">
                    <i class="fas fa-paperclip"></i>
                    <input type="file" id="file-upload-input" style="display: none;" multiple>
                </button>
            </div>
            <input type="text" id="message-input" class="form-control" placeholder="Type a message..." autocomplete="off">
            <div class="input-group-append">
                <button id="send-message-btn" class="btn btn-primary">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
        <div id="emoji-picker" class="emoji-picker"></div>
        <div id="file-preview" class="file-preview"></div>
    `;
    
    // Assemble the chat widget
    chatContainer.appendChild(chatHeader);
    chatContainer.appendChild(chatMessages);
    chatContainer.appendChild(messageInputContainer);
    document.body.appendChild(chatToggler);
    document.body.appendChild(chatContainer);
    
    // Get references to elements
    const closeBtn = document.getElementById('chat-widget-close');
    
    // Apply styles
    const styles = `
        #chat-widget-toggler {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 60px;
            height: 60px;
            background: #007bff;
            color: white;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 24px;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        
        #chat-widget-container {
            display: none;
            position: fixed;
            bottom: 100px;
            right: 20px;
            width: 350px;
            height: 500px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.15);
            z-index: 9998;
            flex-direction: column;
        }
        
        .chat-header {
            padding: 15px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .chat-header h5 {
            margin: 0;
            font-weight: 600;
        }
        
        .chat-header button {
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            color: #666;
        }
        
        #chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
        }
        
        .empty-state {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100%;
            color: #999;
            text-align: center;
        }
        
        .empty-state i {
            font-size: 40px;
            margin-bottom: 10px;
            opacity: 0.5;
        }
        
        .message-input-container {
            padding: 15px;
            border-top: 1px solid #eee;
            background: #f8f9fa;
        }
        
        .message-input-container .input-group {
            display: flex;
            position: relative;
        }
        
        .message-input-container input {
            border-top-right-radius: 0;
            border-bottom-right-radius: 0;
            border-right: none;
        }
        
        .message-input-container .btn-outline-secondary {
            border-color: #ced4da;
            color: #6c757d;
            background: white;
        }
        
        .message-input-container .btn-outline-secondary:hover {
            background: #f8f9fa;
        }
        
        .message-input-container .input-group-prepend .btn {
            border-right: none;
            border-top-right-radius: 0;
            border-bottom-right-radius: 0;
        }
        
        .message-input-container .input-group-append .btn {
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
        }
        
        .message-input-container button {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            padding: 0.375rem 0.5rem;
        }
        
        .message {
            margin-bottom: 10px;
            padding: 8px 12px;
            border-radius: 15px;
            max-width: 80%;
            word-wrap: break-word;
            position: relative;
        }
        
        .message-meta {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            font-size: 0.7em;
            margin-top: 4px;
            opacity: 0.8;
        }
        
        .message.sent .message-meta {
            color: rgba(255, 255, 255, 0.8);
        }
        
        .message.received .message-meta {
            color: rgba(0, 0, 0, 0.6);
        }
        
        .message-time {
            margin-right: 5px;
        }
        
        .message-status {
            font-size: 1.2em;
            line-height: 1;
        }
        
        .message.sent {
            background: #007bff;
            color: white;
            margin-left: auto;
            border-bottom-right-radius: 0;
        }
        
        .message.received {
            background: #f1f1f1;
            color: #333;
            margin-right: auto;
            border-bottom-left-radius: 0;
        }
        
        .emoji-picker {
            display: none;
            position: absolute;
            bottom: 100%;
            left: 0;
            width: 300px;
            height: 300px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow-y: auto;
            z-index: 10000;
            padding: 10px;
        }
        
        .emoji-picker.visible {
            display: block;
        }
        
        .emoji-item {
            display: inline-block;
            padding: 5px;
            font-size: 24px;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        .emoji-item:hover {
            transform: scale(1.2);
        }
        
        .file-preview {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-top: 5px;
        }
        
        .file-preview-item {
            position: relative;
            width: 60px;
            height: 60px;
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .file-preview-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .file-preview-item {
            position: relative;
            overflow: hidden;
            margin-bottom: 5px;
        }
        
        .file-upload-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: rgba(0,0,0,0.1);
            transition: opacity 0.3s;
        }
        
        .progress-bar {
            height: 100%;
            background: #007bff;
            width: 0%;
            transition: width 0.3s, background-color 0.3s;
            font-size: 10px;
            color: white;
            text-align: center;
            line-height: 1;
            padding: 1px 0;
        }
        
        .file-preview-item.upload-error .progress-bar {
            background: #dc3545;
        }
        
        .file-preview-item .remove-file {
            position: absolute;
            top: 5px;
            right: 5px;
            background: rgba(0,0,0,0.5);
            color: white;
            border: none;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            cursor: pointer;
            padding: 0;
            opacity: 0;
            transition: opacity 0.2s;
        }
        
        .file-preview-item:hover .remove-file {
            opacity: 1;
        }
    `;
    
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
    
    // Toggle function
    function toggleChat() {
        const isVisible = chatContainer.style.display === 'flex';
        chatContainer.style.display = isVisible ? 'none' : 'flex';
        chatToggler.innerHTML = isVisible ? '<i class="fas fa-comment"></i>' : '<i class="fas fa-times"></i>';
        console.log('Chat toggled. Visible:', !isVisible);
    }
    
    // Add event listeners
    chatToggler.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleChat();
        // Focus input when opening chat
        if (chatContainer.style.display === 'flex') {
            setTimeout(() => document.getElementById('message-input')?.focus(), 100);
        }
    });
    
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleChat();
        });
    }
    
    // Handle emoji picker
    const emojiPickerBtn = document.getElementById('emoji-picker-btn');
    const emojiPicker = document.getElementById('emoji-picker');
    const fileUploadBtn = document.getElementById('file-upload-btn');
    const fileUploadInput = document.getElementById('file-upload-input');
    const filePreview = document.getElementById('file-preview');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-message-btn');
    
    // Simple emoji list (you can expand this)
    const emojis = ['😀', '😂', '😍', '👍', '❤️', '🔥', '🎉', '🙏', '👋', '🤔', '😎', '🤷', '🙈', '💯'];
    
    // Populate emoji picker
    emojis.forEach(emoji => {
        const span = document.createElement('span');
        span.className = 'emoji-item';
        span.textContent = emoji;
        span.addEventListener('click', () => {
            messageInput.value += emoji;
            messageInput.focus();
            emojiPicker.classList.remove('visible');
        });
        emojiPicker.appendChild(span);
    });
    
    // Toggle emoji picker
    if (emojiPickerBtn) {
        emojiPickerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            emojiPicker.classList.toggle('visible');
        });
    }
    
    // Close emoji picker when clicking outside
    document.addEventListener('click', (e) => {
        if (!emojiPicker.contains(e.target) && e.target !== emojiPickerBtn) {
            emojiPicker.classList.remove('visible');
        }
    });
    
    // Handle file upload
    if (fileUploadBtn && fileUploadInput) {
        fileUploadBtn.addEventListener('click', () => fileUploadInput.click());
        
        fileUploadInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            
            for (const file of files) {
                if (!file.type.match('image.*')) {
                    alert('Only image files are supported for now');
                    continue;
                }
                
                // Show preview immediately
                const reader = new FileReader();
                reader.onload = (event) => {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'file-preview-item';
                    previewItem.innerHTML = `
                        <div class="file-upload-progress">
                            <div class="progress-bar" style="width: 0%"></div>
                        </div>
                        <img src="${event.target.result}" alt="${file.name}">
                        <button class="remove-file">&times;</button>
                    `;
                    
                    const removeBtn = previewItem.querySelector('.remove-file');
                    const progressBar = previewItem.querySelector('.progress-bar');
                    
                    removeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        previewItem.remove();
                    });
                    
                    filePreview.appendChild(previewItem);
                    
                    // Upload the file
                    uploadFile(file, progressBar, previewItem);
                };
                reader.readAsDataURL(file);
            }
            
            // Reset input to allow selecting the same file again
            fileUploadInput.value = '';
        });
    }
    
    // Upload file to server
    async function uploadFile(file, progressBar, previewItem) {
        if (!currentConversationId) {
            try {
                currentConversationId = await getOrCreateSupportConversation();
            } catch (error) {
                console.error('Failed to get conversation:', error);
                throw new Error('Failed to start chat. Please try again.');
            }
        }
        
        const formData = new FormData();
        formData.append('files', file);
        
        try {
            const xhr = new XMLHttpRequest();
            
            // Track upload progress
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    progressBar.style.width = `${percentComplete}%`;
                }
            };
            
            const response = await new Promise((resolve, reject) => {
                xhr.open('POST', `/api/conversations/${currentConversationId}/upload-multiple`, true);
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success && response.files && response.files.length > 0) {
                            // Return the first file since we're uploading one at a time here
                            resolve({ success: true, file: response.files[0] });
                        } else {
                            reject(new Error('No files in response'));
                        }
                    } else {
                        reject(new Error('Upload failed'));
                    }
                };
                xhr.onerror = () => reject(new Error('Network error'));
                xhr.send(formData);
            });
            
            if (response.success) {
                // Update the preview with the server URL
                const img = previewItem.querySelector('img');
                img.src = response.file.url;
                img.alt = response.file.originalName;
                
                // Update progress bar
                progressBar.style.width = '100%';
                setTimeout(() => {
                    const progressContainer = previewItem.querySelector('.file-upload-progress');
                    if (progressContainer) {
                        progressContainer.style.opacity = '0';
                        setTimeout(() => progressContainer.remove(), 300);
                    }
                }, 500);
                
                return response.file;
            } else {
                throw new Error(response.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            previewItem.classList.add('upload-error');
            progressBar.style.backgroundColor = '#dc3545';
            progressBar.textContent = 'Upload failed';
            throw error;
        }
    }
    
    // Initialize Socket.IO if available
    let socket;
    if (window.io) {
        socket = io({
            query: { userId: currentUserId },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });
        
        socket.on('connect', () => {
            console.log('Connected to WebSocket server');
            socket.emit('joinUserRoom', currentUserId);
        });
        
        socket.on('newMessage', (message) => {
            if (message.senderId !== currentUserId) {
                addMessageToChat(message.text, message.files || [], 'received');
            }
        });
    }
    
    // Handle sending messages
    async function sendMessage() {
        const messageText = messageInput.value.trim();
        const files = Array.from(filePreview.children).map(item => ({
            name: item.querySelector('img').alt,
            url: item.querySelector('img').src,
            type: 'image'
        }));
        
        if (!messageText && files.length === 0) return;
        
        // Get or create a conversation if none exists
        if (!currentConversationId) {
            try {
                currentConversationId = await getOrCreateSupportConversation();
            } catch (error) {
                console.error('Failed to get conversation:', error);
                alert('Failed to start chat. Please try again.');
                return;
            }
        }
        
        const tempMessageId = 'temp-' + Date.now();
        const messageElement = addMessageToChat(messageText, files, 'sent');
        messageElement.dataset.tempId = tempMessageId;
        
        messageInput.value = '';
        filePreview.innerHTML = '';
        
        try {
            // First upload files if any
            let uploadedFiles = [];
            if (files.length > 0) {
                try {
                    const formData = new FormData();
                    files.forEach(file => {
                        formData.append('files', file);
                    });
                    
                    const uploadResponse = await fetch(`/api/conversations/${currentConversationId}/upload-multiple`, {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
                        }
                    });
                    
                    const uploadData = await uploadResponse.json();
                    if (uploadData.success && uploadData.files) {
                        uploadedFiles = uploadData.files;
                    } else {
                        throw new Error('Failed to upload files');
                    }
                } catch (error) {
                    console.error('Error uploading files:', error);
                    throw new Error('Failed to upload files');
                }
            }
            
            // Then send the message with file references
            const response = await fetch(`/api/conversations/${currentConversationId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
                },
                body: JSON.stringify({
                    text: messageText,
                    files: uploadedFiles,
                    conversationId: currentConversationId
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.message) {
                if (messageElement) {
                    messageElement.dataset.messageId = data.message._id;
                    messageElement.dataset.tempId = '';
                    const status = messageElement.querySelector('.message-status');
                    if (status) status.textContent = '✓✓';
                }
                
                if (data.conversation && !currentConversationId) {
                    currentConversationId = data.conversation._id;
                }
                
            } else {
                throw new Error(data.message || 'Failed to send message');
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            const status = messageElement?.querySelector('.message-status');
            if (status) {
                status.textContent = '!';
                status.title = 'Failed to send. Click to retry.';
                status.style.color = '#dc3545';
                status.style.cursor = 'pointer';
                status.onclick = () => sendMessage();
            }
        }
    }
    
    function formatTime(date = new Date()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    function addMessageToChat(text, files = [], type) {
        // Remove empty state if it exists
        const emptyState = chatMessages.querySelector('.empty-state');
        if (emptyState && (text || files.length > 0)) {
            emptyState.remove();
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        
        let messageContent = '';
        
        // Add files if any
        if (files && files.length > 0) {
            files.forEach(file => {
                messageContent += `
                    <div class="message-file">
                        <img src="${file.url}" alt="${file.name}" style="max-width: 200px; max-height: 200px; border-radius: 8px; margin: 5px 0;">
                    </div>
                `;
            });
        }
        
        // Add text if any
        if (text) {
            messageContent += `<div class="message-text">${text}</div>`;
        }
        
        // Add timestamp and status
        messageContent += `
            <div class="message-meta">
                <span class="message-time">${formatTime()}</span>
                ${type === 'sent' ? '<span class="message-status">✓✓</span>' : ''}
            </div>
        `;
        
        messageElement.innerHTML = messageContent;
        chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return messageElement;
    }
    
    // Send message on button click
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    // Send message on Enter key
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    // Prevent clicks inside the chat from closing it
    chatContainer.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // Close chat when clicking outside
    document.addEventListener('click', function() {
        chatContainer.style.display = 'none';
        chatToggler.innerHTML = '<i class="fas fa-comment"></i>';
    });
    
    console.log('Minimal chat widget initialized!');
})();
