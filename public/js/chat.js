document.addEventListener('DOMContentLoaded', () => {
    const currentUserId = document.body.dataset.userId;
    if (!currentUserId) return;

    // --- GET CONVERSATION ID FROM URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('convoId');
    if (!conversationId) {
        document.getElementById('full-chat-messages').innerHTML = '<p class="text-center text-danger">Error: No conversation ID provided.</p>';
        return;
    }

    // --- ELEMENT SELECTORS ---
    const chatHeader = document.getElementById('full-chat-header');
    const chatMessages = document.getElementById('full-chat-messages');
    const messageForm = document.getElementById('full-message-form');
    const messageInput = document.getElementById('full-message-input');
    const sendButton = messageForm.querySelector('button');
    const typingIndicator = document.getElementById('full-typing-indicator');

    // --- STATE ---
    let currentConversation = null;
    let currentlyTyping = {};
    let typingTimeout;
    const socket = io({ query: { userId: currentUserId } });

    // --- HELPER FUNCTIONS ---
    const appendMessage = (msg) => {
        const isSent = msg.sender._id === currentUserId;
        const msgClass = isSent ? 'sent' : 'received';
        const profilePic = msg.sender.profilePicture || '/images/default-profile.png';
        const timestamp = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const msgHTML = `
            <div class="chat-message ${msgClass}">
                ${!isSent ? `<img src="${profilePic}" class="chat-profile-pic">` : ''}
                <div class="chat-bubble">
                    ${!isSent ? `<div class="username">${msg.sender.firstName}</div>` : ''}
                    <div class="chat-text">${msg.text}</div>
                    <div class="timestamp">${timestamp}</div>
                </div>
            </div>`;
        chatMessages.innerHTML += msgHTML;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    // --- INITIAL LOAD ---
    const loadChat = async () => {
        try {
            // Fetch conversation details to get participant info
            const convoRes = await fetch('/api/conversations'); // This could be improved with a /api/conversations/:id endpoint
            if (!convoRes.ok) throw new Error('Could not fetch conversation details');
            const allConvos = await convoRes.json();
            currentConversation = allConvos.find(c => c._id === conversationId);

            if (!currentConversation) throw new Error('Conversation not found or you are not a member.');

            // Update Header
            const isGroup = currentConversation.isGroup;
            const otherUser = !isGroup ? currentConversation.participants.find(p => p._id !== currentUserId) : null;
            const displayName = isGroup ? currentConversation.groupName : (otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Chat');
            const displayPic = isGroup ? '/images/group-default.png' : (otherUser?.profilePicture || '/images/default-profile.png');
            chatHeader.innerHTML += `<img src="${displayPic}" alt="${displayName}"><h4>${displayName}</h4>`;

            // Fetch messages
            const messagesRes = await fetch(`/api/conversations/${conversationId}/messages`);
            if (!messagesRes.ok) throw new Error('Could not load messages');
            const messages = await messagesRes.json();
            chatMessages.innerHTML = ''; // Clear "loading" text
            messages.forEach(appendMessage);

            // Enable form
            messageInput.disabled = false;
            sendButton.disabled = false;

        } catch (error) {
            chatMessages.innerHTML = `<p class="text-center text-danger">${error.message}</p>`;
        }
    };

    // --- EVENT LISTENERS ---
    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (!text) return;

        socket.emit('sendMessage', { conversationId, text });
        messageInput.value = '';
        socket.emit('stopTyping', { conversationId });
    });

    messageInput.addEventListener('input', () => {
        socket.emit('startTyping', { conversationId });
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit('stopTyping', { conversationId });
        }, 1500);
    });

    // --- SOCKET LISTENERS ---
    socket.on('connect', () => {
        loadChat();
    });

    socket.on('newMessage', (msg) => {
        if (msg.conversation === conversationId) {
            appendMessage(msg);
        }
    });

    socket.on('userTyping', ({ conversationId: convoId, sender }) => {
        if (convoId === conversationId) {
            currentlyTyping[sender.id] = sender.name;
            typingIndicator.textContent = `${Object.values(currentlyTyping).join(', ')} is typing...`;
            typingIndicator.style.display = 'block';
        }
    });

    socket.on('userStoppedTyping', ({ conversationId: convoId, senderId }) => {
        if (convoId === conversationId) {
            delete currentlyTyping[senderId];
            const typers = Object.values(currentlyTyping);
            if (typers.length > 0) {
                typingIndicator.textContent = `${typers.join(', ')} is typing...`;
            } else {
                typingIndicator.style.display = 'none';
            }
        }
    });
});