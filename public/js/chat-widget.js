// Chat widget initialization
window.initChatWidget = (function() {
    // Initialize global variables
    window.processedMessageIds = new Set();
    window.chatWidgetInitialized = false;
    
    // Main chat widget function
    function initChatWidget(options = {}) {
        // Prevent multiple initializations
        if (window.chatWidgetInitialized) {
            console.log('Chat widget already initialized');
            return;
        }
        
        console.log('Initializing chat widget with options:', options);
        window.chatWidgetInitialized = true;
        
        // Set current user from options or data attributes
        const currentUser = {
            _id: options.currentUserId || document.body.dataset.userId,
            firstName: options.currentUserName || 'User',
            profilePicture: options.currentUserAvatar || '/images/default-profile.png'
        };
        
        if (!currentUser._id) {
            console.error('User ID not found. Cannot initialize chat widget.');
            return;
        }
    
    // Clear any existing socket listeners to prevent duplicates
    if (window.chatWidgetSocket) {
        window.chatWidgetSocket.off('newMessage');
    }
    const chatContainer = document.getElementById('chat-widget-container');
    if (!chatContainer) return; // Exit if chat widget container doesn't exist
    
    const currentUserId = document.body.dataset.userId;
    if (!currentUserId) {
        console.error('User ID not found. Cannot initialize chat widget.');
        return;
    }

    // State management
    let allConversations = [];
    let allUsers = [];
    let currentConversation = null;
    let unreadCounts = {};
    let currentlyTyping = {};
    let typingTimeout;
    let emojiPickerVisible = false;
    let gifPickerVisible = false;
    let selectedFiles = [];

    // Clean up any existing socket connection completely
    if (window.chatWidgetSocket) {
        window.chatWidgetSocket.off('newMessage');
        window.chatWidgetSocket.disconnect();
        delete window.chatWidgetSocket;
    }

    // Initialize Socket.IO with user ID and force new connection
    const socket = io({ 
        query: { userId: currentUserId },
        forceNew: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000
    }
    );
    
    window.chatWidgetSocket = socket; // Store socket for cleanup
    
    // Track pending message IDs to prevent duplicates
    if (!window.chatWidgetPendingMessages) {
        window.chatWidgetPendingMessages = new Set();
    }
    
    // Track processed message IDs globally
    if (!window.processedMessageIds) {
        window.processedMessageIds = new Set();
    }
    
    // Set up the message event listener
    socket.on('newMessage', handleNewMessage);
    
    // Define scrollToBottom function only if not already defined
    if (!window.chatWidgetScrollToBottom) {
        window.chatWidgetScrollToBottom = function() {
            const messagesContainer = document.getElementById('chat-messages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        };
        
        // Add resize event listener
        window.addEventListener('resize', window.chatWidgetScrollToBottom);
    }

    // Single handler for new messages with aggressive deduplication
    const handleNewMessage = (message) => {
        if (!message) return;
        
        const messageKey = message._id || message.tempId;
        if (!messageKey) return;
        
        // Skip if we've already processed this message
        if (window.chatWidgetPendingMessages.has(messageKey) || window.processedMessageIds.has(messageKey)) {
            console.log('Skipping duplicate message (already processed):', messageKey);
            return;
        }
        
        // Mark this message as processed immediately
        window.chatWidgetPendingMessages.add(messageKey);
        window.processedMessageIds.add(messageKey);
        
        // Clean up old pending messages to prevent memory leaks
        if (window.chatWidgetPendingMessages.size > 100) {
            const first = window.chatWidgetPendingMessages.values().next().value;
            if (first) window.chatWidgetPendingMessages.delete(first);
        }
        
        console.log('Processing message:', { 
            id: message._id, 
            tempId: message.tempId, 
            text: message.text,
            pending: Array.from(window.chatWidgetPendingMessages),
            processed: Array.from(window.processedMessageIds).slice(-5) // Last 5 for debugging
        }
    );
        
        // Handle our own messages that were sent optimistically
        if (message.sender._id === currentUserId) {
            // If we have a temp message with this tempId, update it with the server's version
            if (message.tempId) {
                const existingIndex = window.messages?.findIndex(m => m.tempId === message.tempId);
                if (existingIndex !== -1) {
                    // Update the existing message with the server's version
                    const updatedMessage = { ...window.messages[existingIndex], ...message };
                    window.messages[existingIndex] = updatedMessage;
                    
                    // Update the message element in the DOM
                    const messageElement = document.querySelector(`[data-message-id="${message.tempId}"]`);
                    if (messageElement) {
                        messageElement.setAttribute('data-message-id', message._id);
                        const statusElement = messageElement.querySelector('.message-status');
                        if (statusElement) {
                            statusElement.innerHTML = '<i class="fas fa-check text-muted" title="Sent"></i>';
                        }
                    }
                    return; // Skip the rest of the function
                }
            }
            // If we get here, it's probably a duplicate, so ignore it
            return;
        }
        
        // For messages from other users or system messages
        if (!window.messages?.some(m => m._id === message._id)) {
            
            // If we have a temporary message with the same tempId, replace it
            if (message.tempId) {
                const existingIndex = window.messages?.findIndex(m => m.tempId === message.tempId);
                if (existingIndex !== -1) {
                    // Update the existing message with the server's version
                    window.messages[existingIndex] = message;
                    
                    // Update the message element in the DOM
                    const messageElement = document.querySelector(`[data-message-id="${message.tempId}"]`);
                    if (messageElement) {
                        messageElement.setAttribute('data-message-id', message._id);
                        const statusElement = messageElement.querySelector('.message-status');
                        if (statusElement) {
                            statusElement.innerHTML = '<i class="fas fa-check text-muted" title="Sent"></i>';
                        }
                    }
                    return;
                }
            }
            
            // If we get here, it's a completely new message
            if (!window.messages) window.messages = [];
            window.messages.push(message);
            
            // Only append to UI if we're in the correct conversation
            if (currentConversation && currentConversation._id === message.conversationId) {
                appendMessage(message);
                scrollToBottom();
            } else {
                // Update unread count for other conversations
                (unreadCounts[message.conversationId] = (unreadCounts[message.conversationId] || 0) + 1);
                updateOverallUnreadBadge();
                renderAllLists();
            }
        }
    });

    // Emoji data - in a real app, you might want to load this from a library
    const emojiData = {
        smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚'],
        people: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊'],
        animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦄'],
        food: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🥐'],
        travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚜', '🚲', '🛵', '🏍', '✈️', '🚀', '🛸', '🚁']
    };

    // GIPHY API configuration - replace with your API key
    const GIPHY_API_KEY = 'YOUR_GIPHY_API_KEY'; // You'll need to get this from GIPHY

    const toggler = document.getElementById('chat-widget-toggler');
    const container = document.getElementById('chat-widget-container');
    const closeBtn = document.getElementById('chat-widget-close');
    const backBtn = document.getElementById('chat-back-btn');
    const widgetListView = document.getElementById('widget-list-view');
    const widgetChatView = document.getElementById('widget-chat-view');
    
    // Show the toggler and container
    if (toggler) toggler.style.display = 'flex';
    if (container) container.style.display = 'flex';
    
    // Toggle chat visibility
    function toggleChat() {
        if (container) {
            container.style.display = container.style.display === 'none' ? 'flex' : 'none';
        }
    }
    
    // Add event listeners for toggling
    if (toggler) {
        toggler.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleChat();
        }
    );
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            toggleChat();
        }
    );
    }

    const conversationListBody = document.getElementById('conversation-list-body');
    const groupListBody = document.getElementById('group-list-body');
    const userListBody = document.getElementById('user-list-body');
    const createGroupUserList = document.getElementById('group-participants-list-modal');

    const chatSearchInput = document.getElementById('chat-search-input');
    const groupSearchInput = document.getElementById('group-search-input');
    const userSearchInput = document.getElementById('user-search-input');

    const recipientNameEl = document.getElementById('widget-recipient-name');
    const recipientPicEl = document.getElementById('widget-recipient-pic');
    const chatHeaderInfo = document.getElementById('chat-header-info');
    const manageBtnContainer = document.getElementById('manage-group-button-container');
    const maximizeBtn = document.getElementById('maximize-chat-btn');
    const chatMessages = document.getElementById('widget-chat-messages');
    const messageForm = document.getElementById('widget-message-form');
    const messageInput = document.getElementById('message-input');
    const emojiPickerBtn = document.getElementById('emoji-picker-btn');
    const emojiPickerContainer = document.getElementById('emoji-picker-container');
    const gifPickerBtn = document.getElementById('gif-picker-btn');
    const gifPickerContainer = document.getElementById('gif-picker-container');
    const fileUploadBtn = document.getElementById('file-upload-btn');
    const fileUploadInput = document.getElementById('file-upload');
    const filePreviewsContainer = document.getElementById('file-previews-container');
    const filePreviews = document.getElementById('file-previews');
    const typingIndicator = document.getElementById('typing-indicator');
    const widgetUnreadBadge = document.getElementById('widget-unread-badge');

    const createGroupModal = new bootstrap.Modal(document.getElementById('createGroupModal'));
    const removeParticipantModal = new bootstrap.Modal(document.getElementById('removeParticipantModal'));
    const deleteGroupModal = new bootstrap.Modal(document.getElementById('deleteGroupModal'));
    const groupInfoModal = new bootstrap.Modal(document.getElementById('groupInfoModal'));

    const renderConversationItem = (convo) => {
        if (!convo) return document.createElement('div'); // Return empty div if no conversation
        
        const isGroup = convo.isGroup || false;
        const otherUser = !isGroup && Array.isArray(convo.participants) ? 
            convo.participants.find(p => p && p._id !== currentUserId) : null;
            
        const displayName = isGroup ? 
            (convo.groupName || 'Group Chat') : 
            (otherUser ? `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim() || 'User' : 'User');
            
        const displayPic = isGroup ? 
            '/images/group-default.png' : 
            (otherUser?.profilePicture || '/images/default-profile.png');
            
        const lastMsg = convo.lastMessage || {};
        let lastMessageText = 'No messages yet.';
        
        if (lastMsg && lastMsg.sender) {
            const senderName = lastMsg.sender.firstName || 'Someone';
            const messageText = lastMsg.text || '';
            const truncatedText = messageText.length > 25 ? 
                `${messageText.substring(0, 25)}...` : messageText;
                
            lastMessageText = messageText ? 
                `${senderName}: ${truncatedText}` : 
                `${senderName} sent an attachment`;
        }

        const unreadCount = unreadCounts[convo._id] || 0;
        const badgeHTML = unreadCount > 0 ? `<span class="badge bg-primary rounded-pill">${unreadCount}</span>` : '';
        const fontWeight = unreadCount > 0 ? 'fw-bold' : '';

        const el = document.createElement('div');
        el.className = 'conversation-item';
        el.dataset.name = displayName.toLowerCase();

        el.innerHTML = `
            <div class="d-flex align-items-center flex-grow-1" data-convo-id="${convo._id}">
                <img src="${displayPic}" alt="${displayName}">
                <div class="text-truncate">
                    <strong class="${fontWeight}">${displayName}</strong>
                    <p class="text-muted mb-0 small text-truncate ${fontWeight}">${lastMessageText}</p>
                </div>
            </div>
            <button class="hide-convo-btn" data-convo-id="${convo._id}" title="Hide Conversation">&times;</button>
            <div class="ms-auto ps-2">${badgeHTML}</div>
            `;

        el.querySelector('.d-flex').addEventListener('click', () => openChat(convo));
        return el;
    };

    const addHideButtonListeners = () => {
        document.querySelectorAll('.hide-convo-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const convoId = e.currentTarget.dataset.convoId;
                if (confirm('Hide this conversation? It will re-appear if you receive a new message.')) {
                    try {
                        await fetch(`/api/conversations/${convoId}/hide`, { method: 'PATCH' });
                        e.currentTarget.closest('.conversation-item').remove();
                    } catch (err) {
                        alert('Could not hide conversation.');
                    }
                }
            }
    );
        }
    );
    };

    const renderAllLists = () => {
        conversationListBody.innerHTML = '';
        groupListBody.innerHTML = '';
        allConversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        allConversations.forEach(convo => {
            const item = renderConversationItem(convo);
            conversationListBody.appendChild(item);
            if (convo.isGroup) {
                const groupItem = renderConversationItem(convo);
                groupListBody.appendChild(groupItem);
            }
        }
    );

        addHideButtonListeners();
    };

    const renderUserList = () => {
        userListBody.innerHTML = '';
        createGroupUserList.innerHTML = '';
        allUsers.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'conversation-item';
            userItem.dataset.name = `${user.firstName} ${user.lastName}`.toLowerCase();
            userItem.innerHTML = `
                <img src="${user.profilePicture || '/images/default-profile.png'}" alt="${user.firstName}">
                <div><strong>${user.firstName} ${user.lastName}</strong></div>`;
            userItem.addEventListener('click', () => startNewChat(user._id));
            userListBody.appendChild(userItem);

            const groupUserItem = document.createElement('div');
            groupUserItem.className = 'form-check p-2';
            groupUserItem.innerHTML = `
                <input class="form-check-input" type="checkbox" name="participants" value="${user._id}" id="modal-user-${user._id}">
                <label class="form-check-label" for="modal-user-${user._id}">${user.firstName} ${user.lastName}</label>`;
            createGroupUserList.appendChild(groupUserItem);
        }
    );
    };

    const loadInitialData = async () => {
        try {
            // Show loading state
            conversationListBody.innerHTML = '<div class="text-center p-3"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
            
            const [convosRes, usersRes] = await Promise.all([
                fetch('/api/conversations').catch(err => {
                    console.error('Failed to fetch conversations:', err);
                    return { ok: false, status: 'Network Error' };
                }),
                fetch('/api/users').catch(err => {
                    console.error('Failed to fetch users:', err);
                    return { ok: false, status: 'Network Error' };
                })
            ]);

            // Handle API errors
            if (!convosRes.ok) {
                throw new Error(`Failed to load conversations: ${convosRes.status || 'Network Error'}`);
            }
            if (!usersRes.ok) {
                throw new Error(`Failed to load users: ${usersRes.status || 'Network Error'}`);
            }

            // Parse responses
            try {
                allConversations = await convosRes.json() || [];
                allUsers = await usersRes.json() || [];
                
                // Ensure we have valid data
                if (!Array.isArray(allConversations) || !Array.isArray(allUsers)) {
                    throw new Error('Invalid data format received from server');
                }

                renderAllLists();
                renderUserList();
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
                throw new Error('Failed to parse server response');
            }
        } catch (err) {
            console.error('Could not load initial chat data:', err);
            // Show error message to user
            conversationListBody.innerHTML = `
                <div class="alert alert-danger m-3" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Failed to load chat data. Please try again later.
                    <div class="small text-muted mt-1">${err.message}</div>
                </div>
                <button class="btn btn-sm btn-outline-primary w-100" onclick="location.reload()">
                    <i class="fas fa-sync-alt me-1"></i> Retry
                </button>
            `;
        }
    };

    const openChat = async (convo) => {
        currentConversation = convo;
        const isGroup = convo.isGroup;
        const otherUser = !isGroup ? convo.participants.find(p => p._id !== currentUserId) : null;
        const displayName = isGroup ? convo.groupName : (otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Chat');
        const displayPic = isGroup ? '/images/group-default.png' : (otherUser?.profilePicture || '/images/default-profile.png');

        recipientNameEl.textContent = displayName;
        recipientPicEl.src = displayPic;
        maximizeBtn.href = `/chat?convoId=${convo._id}`;

        manageBtnContainer.innerHTML = '';
        chatHeaderInfo.onclick = null;
        if (isGroup) {
            chatHeaderInfo.style.cursor = 'pointer';
            chatHeaderInfo.onclick = () => showGroupInfoModal(convo);
            if (convo.groupAdmin === currentUserId) {
                manageBtnContainer.innerHTML = `
                <div class="dropdown">
                    <button class="btn btn-sm btn-light rounded-circle" type="button" data-bs-toggle="dropdown" title="Group actions"><i class="fas fa-ellipsis-h"></i></button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="#" id="remove-participant-action">Remove Member</a></li>
                        <li><a class="dropdown-item text-danger" href="#" id="delete-group-action">Delete Group</a></li>
                    </ul>
                </div>`;
                document.getElementById('remove-participant-action').addEventListener('click', handleRemoveParticipant);
                document.getElementById('delete-group-action').addEventListener('click', handleDeleteGroup);
            }
        } else {
            chatHeaderInfo.style.cursor = 'default';
        }

        widgetListView.style.display = 'none';
        widgetChatView.classList.add('active');

        chatMessages.innerHTML = '<p class="text-center text-muted">Loading...</p>';
        try {
            const response = await fetch(`/api/conversations/${convo._id}/messages`);
            if (!response.ok) throw new Error("Failed to fetch messages");
            const messages = await response.json();
            chatMessages.innerHTML = '';
            messages.forEach(msg => appendMessage(msg, chatMessages));
        } catch (e) {
            chatMessages.innerHTML = '<p class="text-center text-danger">Could not load messages.</p>';
        }

        if (unreadCounts[convo._id]) {
            delete unreadCounts[convo._id];
            updateOverallUnreadBadge();
            renderAllLists();
        }
    };

    const goBackToList = () => {
        currentConversation = null;
        widgetChatView.classList.remove('active');
        widgetListView.style.display = 'flex';
        typingIndicator.style.display = 'none';
    };

    const scrollToBottom = () => {
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    };

    const appendMessage = (msg, chatBox = chatMessages) => {
        try {
            if (!msg || !msg.sender) {
                console.error('Invalid message format:', msg);
                return;
            }

            const isSent = msg.sender._id === currentUserId;
            const msgClass = isSent ? 'sent' : 'received';
            const profilePic = msg.sender.profilePicture || '/images/default-profile.png';
            const timestamp = msg.createdAt ? 
                new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // Create message element
            const messageElement = document.createElement('div');
            messageElement.className = `chat-message ${msgClass}`;
            messageElement.dataset.messageId = msg._id || `temp-${Date.now()}`;
            
            // Add profile picture for received messages
            if (!isSent) {
                const profilePicElement = document.createElement('img');
                profilePicElement.src = profilePic;
                profilePicElement.className = 'chat-profile-pic';
                profilePicElement.alt = `${msg.sender.firstName || 'User'}'s profile`;
                messageElement.appendChild(profilePicElement);
            }
            
            // Create message bubble
            const bubbleElement = document.createElement('div');
            bubbleElement.className = 'chat-bubble';
            
            // Add username for group chats
            if (!isSent && currentConversation?.isGroup) {
                const usernameElement = document.createElement('div');
                usernameElement.className = 'username';
                usernameElement.textContent = msg.sender.firstName || 'User';
                bubbleElement.appendChild(usernameElement);
            }
            
            // Add message content
            if (msg.text) {
                const textElement = document.createElement('div');
                textElement.className = 'chat-text';
                textElement.textContent = msg.text;
                bubbleElement.appendChild(textElement);
            }
            
            // Add attachments if any
            if (msg.attachments && msg.attachments.length > 0) {
                // Handle multiple attachments
                msg.attachments.forEach(attachment => {
                    const attachmentElement = document.createElement('div');
                    attachmentElement.className = 'mb-2';
                    
                    if (attachment.type === 'image' || attachment.type === 'gif') {
                        // Handle image/GIF attachments
                        const imgContainer = document.createElement('div');
                        imgContainer.className = 'position-relative d-inline-block';
                        
                        const img = document.createElement('img');
                        img.src = attachment.url;
                        img.alt = attachment.name || 'Sent image';
                        img.className = 'img-fluid rounded';
                        img.style.maxHeight = '200px';
                        img.style.maxWidth = '100%';
                        img.loading = 'lazy';
                        img.style.cursor = 'pointer';
                        img.onerror = () => { 
                            img.style.display = 'none';
                            // Show file info if image fails to load
                            const fileInfo = document.createElement('div');
                            fileInfo.className = 'p-2 border rounded bg-light';
                            fileInfo.innerHTML = `
                                <i class="fas fa-file-image me-2"></i>
                                <a href="${attachment.url}" target="_blank" class="text-decoration-none">
                                    ${attachment.name || 'Image'}
                                </a>
                            `;
                            attachmentElement.appendChild(fileInfo);
                        };
                        img.onclick = () => window.open(attachment.url, '_blank');
                        
                        imgContainer.appendChild(img);
                        attachmentElement.appendChild(imgContainer);
                        
                    } else {
                        // Handle other file types
                        const fileElement = document.createElement('div');
                        fileElement.className = 'p-2 border rounded bg-light';
                        
                        // Determine icon based on file type
                        let fileIcon = 'fa-file';
                        const fileExt = (attachment.name || '').split('.').pop().toLowerCase();
                        
                        if (['pdf'].includes(fileExt)) fileIcon = 'fa-file-pdf';
                        else if (['doc', 'docx'].includes(fileExt)) fileIcon = 'fa-file-word';
                        else if (['xls', 'xlsx'].includes(fileExt)) fileIcon = 'fa-file-excel';
                        else if (['ppt', 'pptx'].includes(fileExt)) fileIcon = 'fa-file-powerpoint';
                        else if (['zip', 'rar', '7z'].includes(fileExt)) fileIcon = 'fa-file-archive';
                        else if (['mp3', 'wav', 'ogg'].includes(fileExt)) fileIcon = 'fa-file-audio';
                        else if (['mp4', 'mov', 'avi', 'wmv'].includes(fileExt)) fileIcon = 'fa-file-video';
                        
                        fileElement.innerHTML = `
                            <div class="d-flex align-items-center">
                                <i class="fas ${fileIcon} fa-2x text-muted me-2"></i>
                                <div class="flex-grow-1 overflow-hidden">
                                    <div class="text-truncate" title="${attachment.name || 'File'}">
                                        <a href="${attachment.url}" target="_blank" class="text-decoration-none text-dark">
                                            ${attachment.name || 'Download file'}
                                        </a>
                                    </div>
                                    <div class="small text-muted">${formatFileSize(attachment.size || 0)}</div>
                                </div>
                                <a href="${attachment.url}" download class="ms-2 text-decoration-none" title="Download">
                                    <i class="fas fa-download text-primary"></i>
                                </a>
                            </div>
                        `;
                        attachmentElement.appendChild(fileElement);
                    }
                    
                    bubbleElement.appendChild(attachmentElement);
                }
    );
            }
            
            // Add timestamp and status
            const metaElement = document.createElement('div');
            metaElement.className = 'message-meta d-flex align-items-center';
            metaElement.style.gap = '5px';
            
            const timeElement = document.createElement('span');
            timeElement.className = 'timestamp text-muted small';
            timeElement.textContent = timestamp;
            metaElement.appendChild(timeElement);
            
            // Add status indicator for sent messages
            if (isSent) {
                const statusElement = document.createElement('span');
                statusElement.className = 'message-status';
                if (msg.status === 'sending') {
                    statusElement.innerHTML = '<i class="fas fa-circle-notch fa-spin text-muted"></i>';
                } else if (msg.status === 'sent') {
                    statusElement.innerHTML = '<i class="fas fa-check text-muted"></i>';
                } else if (msg.status === 'delivered') {
                    statusElement.innerHTML = '<i class="fas fa-check-double text-muted"></i>';
                } else if (msg.status === 'read') {
                    statusElement.innerHTML = '<i class="fas fa-check-double text-primary"></i>';
                } else if (msg.status === 'error') {
                    statusElement.innerHTML = '<i class="fas fa-exclamation-circle text-danger"></i>';
                    statusElement.title = 'Failed to send. Click to retry.';
                    statusElement.style.cursor = 'pointer';
                    statusElement.onclick = () => {
                        // Retry sending the message
                        statusElement.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i>';
                        sendMessage(msg.text, msg.attachments?.[0]?.url, msg.type);
                        messageElement.remove();
                    };
                }
                metaElement.appendChild(statusElement);
            }
            
            bubbleElement.appendChild(metaElement);
            messageElement.appendChild(bubbleElement);
            
            // Add to chat
            chatBox.appendChild(messageElement);
            
            // Auto-scroll to bottom if this is the latest message
            if (isSent || !msg.status || msg.status !== 'sending') {
                scrollToBottom();
            }
        } catch (error) {
            console.error('Error appending message:', error, msg);
        }
    };
    
    // Helper function to format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const startNewChat = async (recipientId) => {
        try {
            const res = await fetch('/api/conversations/findOrCreate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipientId })
            }
    );
            if (!res.ok) throw new Error('Server returned an error');

            const conversation = await res.json();

            const existingConvoIndex = allConversations.findIndex(c => c._id === conversation._id);
            if (existingConvoIndex === -1) {
                allConversations.unshift(conversation);
            }
            renderAllLists();
            openChat(conversation);
        } catch (err) {
            console.error("Error starting new chat:", err);
            alert('Could not start chat.');
        }
    };

    const showGroupInfoModal = (convo) => {
        const participantListModal = document.getElementById('group-participant-list-modal-view');
        document.getElementById('groupInfoModalTitle').textContent = convo.groupName;
        document.getElementById('group-member-count').textContent = convo.participants.length;
        participantListModal.innerHTML = '';
        convo.participants.forEach(p => {
            const isAdmin = p._id === convo.groupAdmin;
            const item = document.createElement('li');
            item.className = 'list-group-item d-flex align-items-center';
            item.innerHTML = `
                <img src="${p.profilePicture || '/images/default-profile.png'}" class="rounded-circle me-3" width="40" height="40">
                <span>${p.firstName} ${p.lastName}</span>
                ${isAdmin ? '<span class="badge bg-primary rounded-pill ms-auto">Admin</span>' : ''}`;
            participantListModal.appendChild(item);
        }
    );
        groupInfoModal.show();
    };

    function handleRemoveParticipant() {
        if (!currentConversation) return;
        const listContainer = document.getElementById('remove-participant-list');
        listContainer.innerHTML = '';
        currentConversation.participants.forEach(p => {
            if (p._id !== currentConversation.groupAdmin) {
                const item = document.createElement('div');
                item.className = 'list-group-item d-flex justify-content-between align-items-center';
                item.innerHTML = `<span>${p.firstName} ${p.lastName}</span><button class="btn btn-sm btn-danger remove-btn">&times;</button>`;
                item.querySelector('.remove-btn').onclick = async () => {
                    if (confirm(`Remove ${p.firstName} from the group?`)) {
                        await fetch(`/api/conversations/${currentConversation._id}/participants/${p._id}`, { method: 'DELETE' });
                        removeParticipantModal.hide();
                        goBackToList();
                        loadInitialData();
                    }
                };
                listContainer.appendChild(item);
            }
        }
    );
        removeParticipantModal.show();
    }

    function handleDeleteGroup() {
        deleteGroupModal.show();
    }

    const updateOverallUnreadBadge = () => {
        const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
        if (totalUnread > 0) {
            widgetUnreadBadge.textContent = totalUnread > 9 ? '9+' : totalUnread;
            widgetUnreadBadge.style.display = 'block';
        } else {
            widgetUnreadBadge.style.display = 'none';
        }
    };

    // Initialize Emoji Picker
    const initEmojiPicker = () => {
        const emojiContainer = document.getElementById('emoji-container');
        const emojiCategories = document.querySelectorAll('.emoji-categories button');

        // Populate emoji container with default category
        updateEmojiCategory('smileys');

        // Add category click handlers
        emojiCategories.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.closest('button').dataset.category;
                updateEmojiCategory(category);

                // Update active state
                emojiCategories.forEach(b => b.classList.remove('active'));
                e.target.closest('button').classList.add('active');
            }
    );
        }
    );

        // Show/hide emoji picker
        emojiPickerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            emojiPickerVisible = !emojiPickerVisible;
            emojiPickerContainer.style.display = emojiPickerVisible ? 'block' : 'none';

            // Hide GIF picker if visible
            if (gifPickerVisible) {
                gifPickerVisible = false;
                gifPickerContainer.style.display = 'none';
            }
        }
    );

        // Close picker when clicking outside
        document.addEventListener('click', (e) => {
            if (!emojiPickerContainer.contains(e.target) && e.target !== emojiPickerBtn) {
                emojiPickerVisible = false;
                emojiPickerContainer.style.display = 'none';
            }
        }
    );
    };

    // Update emoji category display
    const updateEmojiCategory = (category) => {
        const emojiContainer = document.getElementById('emoji-container');
        emojiContainer.innerHTML = emojiData[category].map(emoji =>
            `<button type="button" class="btn btn-emoji" data-emoji="${emoji}" style="font-size: 1.5rem; border: none; background: none; cursor: pointer;">
                ${emoji}
            </button>`
        ).join('');

        // Add emoji click handlers
        document.querySelectorAll('.btn-emoji').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const emoji = e.target.closest('button').dataset.emoji;
                messageInput.textContent += emoji;
                messageInput.focus();
            }
    );
        }
    );
    };

    // Initialize GIF picker with null checks
    const initGifPicker = () => {
        try {
            if (!gifPickerBtn || !gifPickerContainer) {
                console.warn('GIF picker elements not found. GIF functionality will be disabled.');
                return;
            }

            // Toggle GIF picker
            gifPickerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                gifPickerVisible = !gifPickerVisible;
                gifPickerContainer.style.display = gifPickerVisible ? 'block' : 'none';

                // Hide emoji picker if visible
                if (emojiPickerVisible) {
                    emojiPickerVisible = false;
                    emojiPickerContainer.style.display = 'none';
                }

                // Load trending GIFs when first opened
                const trendingGifsEl = document.getElementById('trending-gifs');
                if (gifPickerVisible && trendingGifsEl && trendingGifsEl.children.length === 0) {
                    fetchTrendingGifs();
                }
            }
    );

            // Close picker when clicking outside
            document.addEventListener('click', (e) => {
                if (gifPickerContainer && !gifPickerContainer.contains(e.target) && e.target !== gifPickerBtn) {
                    gifPickerVisible = false;
                    gifPickerContainer.style.display = 'none';
                }
            }
    );

            // Search GIFs
            const searchGifBtn = document.getElementById('search-gif-btn');
            const gifSearchInput = document.getElementById('gif-search');

            if (searchGifBtn) {
                searchGifBtn.addEventListener('click', searchGifs);
            }

            if (gifSearchInput) {
                gifSearchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        searchGifs();
                    }
                }
    );
            }
        } catch (error) {
            console.error('Error initializing GIF picker:', error);
        }
    };

    // Fetch trending GIFs from GIPHY
    const fetchTrendingGifs = async () => {
        try {
            const response = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=10`);
            const data = await response.json();
            const trendingContainer = document.getElementById('trending-gifs');
            trendingContainer.innerHTML = data.data.map(gif =>
                `<img src="${gif.images.fixed_height_small.url}"
                      class="gif-thumbnail"
                      data-gif-url="${gif.images.original.url}"
                      style="width: 90px; height: 90px; object-fit: cover; cursor: pointer; border-radius: 4px;">`
            ).join('');

            // Add click handlers to GIF thumbnails
            document.querySelectorAll('.gif-thumbnail').forEach(img => {
                img.addEventListener('click', () => {
                    const gifUrl = img.dataset.gifUrl;
                    sendMessage('', gifUrl, 'gif');
                    gifPickerVisible = false;
                    gifPickerContainer.style.display = 'none';
                }
    );
            }
    );
        } catch (error) {
            console.error('Error fetching trending GIFs:', error);
        }
    };

    // Search GIFs from GIPHY
    const searchGifs = async () => {
        const searchTerm = document.getElementById('gif-search').value.trim();
        if (!searchTerm) return;

        try {
            const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=15`);
            const data = await response.json();
            const gifResults = document.getElementById('gif-results');

            if (data.data.length === 0) {
                gifResults.innerHTML = '<div class="text-center w-100 py-3 text-muted">No GIFs found</div>';
                return;
            }

            gifResults.innerHTML = data.data.map(gif =>
                `<img src="${gif.images.fixed_height_small.url}"
                      class="gif-thumbnail"
                      data-gif-url="${gif.images.original.url}"
                      style="width: 90px; height: 90px; object-fit: cover; cursor: pointer; border-radius: 4px;">`
            ).join('');

            // Add click handlers to GIF thumbnails
            document.querySelectorAll('.gif-thumbnail').forEach(img => {
                img.addEventListener('click', () => {
                    const gifUrl = img.dataset.gifUrl;
                    sendMessage('', gifUrl, 'gif');
                    gifPickerVisible = false;
                    gifPickerContainer.style.display = 'none';
                }
    );
            }
    );
        } catch (error) {
            console.error('Error searching GIFs:', error);
            document.getElementById('gif-results').innerHTML = '<div class="text-center w-100 py-3 text-muted">Error loading GIFs</div>';
        }
    };

    // Initialize file upload
    const initFileUpload = () => {
        const fileInput = document.getElementById('file-upload');
        const fileUploadBtn = document.getElementById('file-upload-btn');
        const filePreviews = document.getElementById('file-previews');

        fileUploadBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            // Add files to selected files array
            selectedFiles = [...selectedFiles, ...files];
            updateFilePreviews();

            // Show file previews container
            document.getElementById('file-previews').style.display = 'block';

            // Reset file input
            fileInput.value = '';
        }
    );
    };

    // Update file previews
    const updateFilePreviews = () => {
        const filePreviewsContainer = document.getElementById('file-previews-container');
        filePreviewsContainer.innerHTML = '';

        selectedFiles.forEach((file, index) => {
            const previewElement = document.createElement('div');
            previewElement.className = 'position-relative';

            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewElement.innerHTML = `
                        <div class="border rounded p-1 bg-white">
                            <img src="${e.target.result}" alt="${file.name}" style="width: 60px; height: 60px; object-fit: cover;">
                            <button type="button" class="btn-close position-absolute top-0 end-0 m-1" data-index="${index}" style="font-size: 0.5rem;"></button>
                            <div class="small text-truncate" style="max-width: 60px;">${file.name}</div>
                        </div>
                    `;
                };
                reader.readAsDataURL(file);
            } else {
                previewElement.innerHTML = `
                    <div class="border rounded p-2 bg-white">
                        <i class="far fa-file"></i>
                        <div class="small text-truncate" style="max-width: 100px;">${file.name}</div>
                        <button type="button" class="btn-close position-absolute top-0 end-0 m-1" data-index="${index}" style="font-size: 0.5rem;"></button>
                    </div>
                `;
            }

            filePreviewsContainer.appendChild(previewElement);
        }
    );

        // Add event listeners to remove buttons
        document.querySelectorAll('.btn-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.target.closest('button').dataset.index);
                selectedFiles.splice(index, 1);
                updateFilePreviews();

                // Hide file previews container if no files
                if (selectedFiles.length === 0) {
                    document.getElementById('file-previews').style.display = 'none';
                }
            }
    );
        }
    );
    };

    // Enhanced message sending with support for files and different message types
    const sendMessage = async (text, attachments = [], messageType = 'text') => {
        // If no text and no attachments, don't send anything
        if ((!text || text.trim() === '') && (!attachments || attachments.length === 0)) {
            return;
        }
        
        // Clear any existing message tracking to prevent memory leaks
        if (window.processedMessageIds.size > 1000) {
            window.processedMessageIds = new Set(Array.from(window.processedMessageIds).slice(-500));
        }

        // Create a temporary message with a loading state
        const tempMessageId = 'temp-' + Date.now();
        const messageData = {
            _id: tempMessageId,
            tempId: tempMessageId, // Add tempId for WebSocket tracking
            conversationId: currentConversation._id,
            sender: {
                _id: currentUserId,
                firstName: 'You',
                lastName: '',
                profilePicture: document.body.dataset.profilePicture || ''
            },
            text: (text || '').trim(),
            type: messageType,
            status: 'sending',
            createdAt: new Date(),
            attachments: Array.isArray(attachments) ? attachments : []
        };

        // If attachments is a string (for backward compatibility), convert it to the new format
        if (typeof attachments === 'string' && attachments) {
            messageData.attachments = [{
                url: attachments,
                type: messageType,
                name: 'file',
                size: 0
            }];
        }

        // Add to messages array and render
        if (!window.messages) window.messages = [];
        window.messages.push(messageData);
        const messageElement = appendMessage(messageData);
        scrollToBottom();

        try {
            // Prepare the request payload
        const payload = {
            text: text ? text.trim() : undefined,
            type: messageType,
            tempMessageId: tempMessageId // Include temp ID for reference
        };

        // Handle attachments if present
        if (attachments && attachments.length > 0) {
            payload.attachments = attachments.map(attachment => ({
                url: attachment.url,
                type: attachment.type || 'file',
                name: attachment.name || 'file',
                size: attachment.size
            }));
        }

        // Send to server
        const response = await fetch(`/api/conversations/${currentConversation._id}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest' // To identify AJAX requests
            },
            body: JSON.stringify(payload)
        }
    );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && data.message) {
                // Update the message in the messages array
                const messageIndex = window.messages.findIndex(m => m._id === tempMessageId);
                if (messageIndex !== -1) {
                    // Keep the same object reference to maintain UI state
                    const updatedMessage = { ...window.messages[messageIndex], ...data.message, status: 'sent' };
                    window.messages[messageIndex] = updatedMessage;
                    
                    // Update the message element in the DOM
                    const messageElement = document.querySelector(`[data-message-id="${tempMessageId}"]`);
                    if (messageElement) {
                        messageElement.setAttribute('data-message-id', data.message._id);
                        const statusElement = messageElement.querySelector('.message-status');
                        if (statusElement) {
                            statusElement.innerHTML = '<i class="fas fa-check text-muted" title="Sent"></i>';
                        }
                    }
                }
            } else {
                throw new Error(data.message || 'Failed to send message');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            // Update message status to failed
            const messageIndex = window.messages.findIndex(m => m._id === tempMessageId);
            if (messageIndex !== -1) {
                window.messages[messageIndex].status = 'failed';
                const messageElement = document.querySelector(`[data-message-id="${tempMessageId}"]`);
                if (messageElement) {
                    const statusElement = messageElement.querySelector('.message-status');
                    if (statusElement) {
                        statusElement.innerHTML = '<i class="fas fa-exclamation-circle text-danger" title="Failed to send. Click to retry."></i>';
                        statusElement.style.cursor = 'pointer';
                        statusElement.onclick = () => {
                            // Retry sending the message
                            const msg = window.messages[messageIndex];
                            if (msg) {
                                statusElement.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i>';
                                sendMessage(msg.text, msg.attachments || [], msg.type);
                                messageElement.remove();
                            }
                        };
                    }
                }
            }
            
            // Show error toast
            const toast = document.createElement('div');
            toast.className = 'toast align-items-center text-white bg-danger border-0 position-fixed bottom-0 end-0 m-3';
            toast.setAttribute('role', 'alert');
            toast.setAttribute('aria-live', 'assertive');
            toast.setAttribute('aria-atomic', 'true');
            toast.innerHTML = `
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Failed to send message. Click to retry.
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            `;
            document.body.appendChild(toast);
            const bsToast = new bootstrap.Toast(toast, { autohide: true, delay: 5000 });
            bsToast.show();
            
            // Remove toast after it's hidden
            toast.addEventListener('hidden.bs.toast', () => {
                toast.remove();
            }
    );
        }
    };

    // Event Listeners
    toggler.addEventListener('click', (e) => {
        e.stopPropagation();
        container.classList.toggle('open');
        if (container.classList.contains('open') && currentConversation) {
            markMessagesAsRead(currentConversation._id);
        }
    }
    );

    closeBtn.addEventListener('click', () => container.classList.remove('open'));
    backBtn.addEventListener('click', goBackToList);

    // Initialize UI components
    initEmojiPicker();
    initGifPicker();
    initFileUpload();

    // Handle message form submission
    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentConversation) return;
        
        const text = messageInput.textContent.trim();
        if (text || selectedFiles.length > 0) {
            try {
                // Show sending state
                const sendBtn = messageForm.querySelector('button[type="submit"]');
                const originalBtnContent = sendBtn.innerHTML;
                sendBtn.disabled = true;
                sendBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
                
                // If there are files to upload, handle them first
                if (selectedFiles.length > 0) {
                    const formData = new FormData();
                    
                    // Add files to form data
                    selectedFiles.forEach(file => {
                        formData.append('files', file);
                    }
    );
                    
                    // Show uploading state
                    const uploadProgress = document.createElement('div');
                    uploadProgress.className = 'alert alert-info d-flex align-items-center mb-2';
                    uploadProgress.innerHTML = `
                        <div class="spinner-border spinner-border-sm me-2" role="status">
                            <span class="visually-hidden">Uploading...</span>
                        </div>
                        <div class="flex-grow-1">Uploading ${selectedFiles.length} file(s)...</div>
                    `;
                    chatMessages.appendChild(uploadProgress);
                    
                    // Scroll to show the upload progress
                    scrollToBottom();
                    
                    try {
                        // Upload files to our new endpoint
                        const uploadResponse = await fetch(`/api/conversations/${currentConversation._id}/upload-multiple`, {
                            method: 'POST',
                            body: formData
                        }
    );
                        
                        // Remove upload progress
                        uploadProgress.remove();
                        
                        if (!uploadResponse.ok) {
                            let errorMessage = 'Failed to upload files';
                            try {
                                const errorData = await uploadResponse.json();
                                errorMessage = errorData.message || errorMessage;
                            } catch (e) {
                                console.error('Error parsing error response:', e);
                            }
                            throw new Error(errorMessage);
                        }
                        
                        const { success, files: uploadedFiles, error } = await uploadResponse.json();
                        
                        if (!success || !uploadedFiles || uploadedFiles.length === 0) {
                            throw new Error(error || 'No files were uploaded successfully');
                        }
                        
                        // Send a single message with all file attachments
                        const attachments = uploadedFiles.map(file => ({
                            url: file.url,
                            type: file.type,
                            name: file.originalName || file.fileName || 'file',
                            size: file.size
                        }));
                        
                        // Send message with attachments
                        sendMessage(text, attachments);
                        
                        // Clear files after successful send
                        selectedFiles = [];
                        filePreviews.style.display = 'none';
                        filePreviewsContainer.innerHTML = '';
                        
                        // Clear text input
                        messageInput.textContent = '';
                        
                    } catch (error) {
                        console.error('File upload error:', error);
                        // Show error message to user
                        const errorAlert = document.createElement('div');
                        errorAlert.className = 'alert alert-danger alert-dismissible fade show mt-2';
                        errorAlert.role = 'alert';
                        errorAlert.innerHTML = `
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            ${error.message || 'Failed to upload files. Please try again.'}
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        `;
                        chatMessages.appendChild(errorAlert);
                        scrollToBottom();
                        
                        // Auto-dismiss error after 10 seconds
                        setTimeout(() => {
                            errorAlert.remove();
                        }, 10000);
                        
                        throw error; // Re-throw to be caught by the outer catch
                    }
                } else {
                    // Send text message only if there's text content
                    if (text) {
                        await sendMessage(text);
                        messageInput.textContent = ''; // Clear input after sending
                    }
                }
                
                // Clear input
                messageInput.textContent = '';
                
            } catch (error) {
                console.error('Error sending message:', error);
                // Show error message to user
                const errorAlert = document.createElement('div');
                errorAlert.className = 'alert alert-danger alert-dismissible fade show mt-2';
                errorAlert.role = 'alert';
                errorAlert.innerHTML = `
                    Failed to send message. Please try again.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                `;
                chatMessages.appendChild(errorAlert);
                
                // Auto-dismiss error after 5 seconds
                setTimeout(() => {
                    errorAlert.remove();
                }, 5000);
            } finally {
                // Reset send button
                const sendBtn = messageForm.querySelector('button[type="submit"]');
                if (sendBtn) {
                    sendBtn.disabled = false;
                    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
                }
            }
        }
    }
    );

    // Handle typing indicator and message input
    messageInput.addEventListener('input', () => {
        if (!currentConversation) return;
        
        // Emit typing event
        socket.emit('typing', {
            conversationId: currentConversation._id,
            userId: currentUserId
        }
    );
        
        // Clear previous timeout
        if (typingTimeout) clearTimeout(typingTimeout);
        
        // Set timeout to stop typing indicator after 2 seconds of inactivity
        typingTimeout = setTimeout(() => {
            socket.emit('stopTyping', {
                conversationId: currentConversation._id,
                userId: currentUserId
            }
    );
        }, 2000);
    }
    );
    
    // Handle Enter key for new line with Shift+Enter, send with Enter
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const text = messageInput.textContent.trim();
            if (text || selectedFiles.length > 0) {
                sendMessage(text);
            }
        }
    }
    );


    
    document.getElementById('createGroupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const groupName = document.getElementById('groupName').value;
        const participants = Array.from(document.querySelectorAll('#group-participants-list-modal input:checked')).map(cb => cb.value);
        try {
            const res = await fetch('/api/conversations/group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupName, participants })
            }
    );
            if (!res.ok) throw new Error('Failed to create group');
            const newGroup = await res.json();
            socket.emit('joinNewGroup', newGroup._id);
            allConversations.unshift(newGroup);
            renderAllLists();
            createGroupModal.hide();
            e.target.reset();
            openChat(newGroup);
        } catch(err) {
            alert('Failed to create group.');
        }
    }
    );

    document.getElementById('confirm-delete-group-btn').addEventListener('click', async () => {
        if (!currentConversation) return;
        try {
            await fetch(`/api/conversations/${currentConversation._id}`, { method: 'DELETE' });
            deleteGroupModal.hide();
            goBackToList();
            loadInitialData();
        } catch (err) {
            alert('Could not delete group.');
        }
    }
    );

    const setupSearch = (inputElement, listContainer) => {
        inputElement.addEventListener('keyup', () => {
            const searchTerm = inputElement.value.toLowerCase();
            listContainer.querySelectorAll('.conversation-item').forEach(el => {
                const name = el.dataset.name || '';
                el.style.display = name.includes(searchTerm) ? 'flex' : 'none';
            }
    );
        }
    );
    };
    setupSearch(chatSearchInput, conversationListBody);
    setupSearch(groupSearchInput, groupListBody);
    setupSearch(userSearchInput, userListBody);

    // ADDED: Logic for the "Get IT Support" button
    const supportBtn = document.getElementById('get-it-support-btn');
    if (supportBtn) {
        supportBtn.addEventListener('click', async () => {
            supportBtn.disabled = true;
            supportBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Starting...';
            try {
                const response = await fetch('/api/conversations/support', { method: 'POST' });
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.message || 'Server error');
                }
                
                if (!allConversations.some(c => c._id === result.conversation._id)) {
                    allConversations.unshift(result.conversation);
                    renderAllLists();
                }

                container.classList.add('open');
                openChat(result.conversation);

            } catch (err) {
                alert(`Could not start support chat: ${err.message}`);
            } finally {
                supportBtn.disabled = false;
                supportBtn.innerHTML = '<i class="fas fa-headset"></i> Get IT Support';
            }
        }
    );
    }

    socket.on('newMessage', (msg) => {
        const convoIndex = allConversations.findIndex(c => c._id === msg.conversation);
        if (convoIndex > -1) {
            allConversations[convoIndex].lastMessage = msg;
            allConversations[convoIndex].updatedAt = msg.createdAt;
        } else {
            loadInitialData();
            return;
        }

        if (currentConversation && msg.conversation === currentConversation._id) {
            appendMessage(msg, chatMessages);
        } else {
            unreadCounts[msg.conversation] = (unreadCounts[msg.conversation] || 0) + 1;
            if (!container.classList.contains('open')) {
                 toggler.classList.add('shake');
                 setTimeout(()=> toggler.classList.remove('shake'), 600);
            }
        }
        renderAllLists();
        updateOverallUnreadBadge();
    }
    );

    socket.on('userTyping', ({ conversationId, sender }) => {
        if (currentConversation && conversationId === currentConversation._id) {
            currentlyTyping[sender.id] = sender.name;
            const typers = Object.values(currentlyTyping).join(', ');
            typingIndicator.textContent = `${typers} is typing...`;
            typingIndicator.style.display = 'block';
        }
    }
    );

    socket.on('userStoppedTyping', ({ conversationId, senderId }) => {
        if (currentConversation && conversationId === currentConversation._id) {
            delete currentlyTyping[senderId];
            const typers = Object.values(currentlyTyping);
            if (typers.length > 0) {
                typingIndicator.textContent = `${typers.join(', ')} is typing...`;
            } else {
                typingIndicator.style.display = 'none';
            }
        }
    }
    );

    // ADDED: Listener for IT users to receive new support chats in real-time
    socket.on('newConversation', (newConvo) => {
        allConversations.unshift(newConvo);
        renderAllLists();
        if (!container.classList.contains('open')) {
             toggler.classList.add('shake');
             setTimeout(()=> toggler.classList.remove('shake'), 600);
        }
    }
    );

    // Initialize the chat widget
    loadInitialData();
};

// Scroll chat to bottom
const scrollToBottom = () => {
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
};

    // Expose the main function for external initialization
    return initChatWidget;
})();