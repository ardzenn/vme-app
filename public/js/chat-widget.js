document.addEventListener('DOMContentLoaded', () => {
    const currentUserId = document.body.dataset.userId;
    const currentUser = JSON.parse(document.body.dataset.currentUser || '{}');
    if (!currentUserId) return;

    const socket = io({ query: { userId: currentUserId, userName: currentUser.firstName } });

    // --- Modal & Element Definitions ---
    const createGroupModal = new bootstrap.Modal(document.getElementById('createGroupModal'));
    const removeParticipantModal = new bootstrap.Modal(document.getElementById('removeParticipantModal'));
    const deleteGroupModal = new bootstrap.Modal(document.getElementById('deleteGroupModal'));
    const toggler = document.getElementById('chat-widget-toggler');
    const container = document.getElementById('chat-widget-container');
    const closeBtn = document.getElementById('chat-widget-close');
    const backBtn = document.getElementById('chat-back-btn');
    const conversationListBody = document.getElementById('conversation-list-body');
    const groupListBody = document.getElementById('group-list-body');
    const userListBody = document.getElementById('user-list-body');
    const userSearchInput = document.getElementById('user-search-input');
    const chatWindow = document.getElementById('widget-chat-window');
    const messageForm = document.getElementById('widget-message-form');
    const messageInput = document.getElementById('widget-message-input');
    const chatMessages = document.getElementById('widget-chat-messages');
    
    let allConversations = [];
    let currentConversation = null;

    // --- Helper Functions ---
    const appendMessage = (msg, chatBox) => {
        const isSent = msg.sender._id === currentUserId;
        const msgClass = isSent ? 'chat-message-sent' : 'chat-message-received';
        const profilePic = msg.sender.profilePicture || '/images/default-profile.png';
        const timestamp = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const userName = msg.sender.firstName || 'User';
        const msgHTML = `<div class="chat-message ${msgClass}"><img src="${profilePic}" class="chat-profile-pic"><div class="chat-bubble"><div class="username">${userName}</div><div class="chat-text">${msg.text}</div><div class="timestamp">${timestamp}</div></div></div>`;
        chatBox.innerHTML += msgHTML;
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    const openChat = async (convo) => {
        currentConversation = convo;
        const isGroup = convo.isGroup;
        const otherUser = convo.participants.find(p => p._id !== currentUserId);
        const displayName = isGroup ? convo.groupName : (otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Chat');
        const displayPic = isGroup ? '/images/group-default.png' : (otherUser ? otherUser.profilePicture : '/images/default-profile.png');
        
        document.getElementById('widget-recipient-name').textContent = displayName;
        document.getElementById('widget-recipient-pic').src = displayPic;
        
        chatWindow.classList.add('active');
        chatMessages.innerHTML = '<p class="text-center text-muted">Loading messages...</p>';
        try {
            const response = await fetch(`/api/conversations/${convo._id}/messages`);
            const messages = await response.json();
            chatMessages.innerHTML = '';
            messages.forEach(msg => appendMessage(msg, chatMessages));
        } catch (err) {
            chatMessages.innerHTML = '<p class="text-center text-danger">Could not load messages.</p>';
        }
    };

    const renderConversations = (convos) => {
        conversationListBody.innerHTML = '';
        groupListBody.innerHTML = '';
        
        convos.forEach(convo => {
            const isGroup = convo.isGroup;
            const otherUser = convo.participants.find(p => p._id !== currentUserId);
            const displayName = isGroup ? convo.groupName : (otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'User');
            const displayPic = isGroup ? '/images/group-default.png' : (otherUser ? otherUser.profilePicture : '/images/default-profile.png');
            
            const convoEl = document.createElement('div');
            convoEl.className = 'conversation';
            convoEl.innerHTML = `<img src="${displayPic}" alt="${displayName}"><div><strong>${displayName}</strong></div>`;
            convoEl.addEventListener('click', () => openChat(convo));

            if (isGroup) {
                groupListBody.appendChild(convoEl);
            }
            conversationListBody.appendChild(convoEl.cloneNode(true)).addEventListener('click', () => openChat(convo));
        });
    };

    const loadConversations = async () => {
        try {
            const res = await fetch('/api/conversations');
            allConversations = await res.json();
            renderConversations(allConversations);
        } catch(err) { console.error("Could not load conversations:", err); }
    };

    // --- Event Listeners ---
    toggler.addEventListener('click', () => container.classList.toggle('open'));
    closeBtn.addEventListener('click', () => container.classList.remove('open'));
    backBtn.addEventListener('click', () => {
        chatWindow.classList.remove('active');
        currentConversation = null;
    });

    userListBody.querySelectorAll('.new-chat-user').forEach(el => {
        el.addEventListener('click', async () => {
            const recipientId = el.dataset.recipientId;
            try {
                const response = await fetch('/api/conversations/findOrCreate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recipientId })
                });
                const conversation = await response.json();
                await loadConversations();
                openChat(conversation);
            } catch (err) { alert('Could not start chat.'); }
        });
    });
    
    userSearchInput.addEventListener('keyup', () => {
        const searchTerm = userSearchInput.value.toLowerCase();
        userListBody.querySelectorAll('.new-chat-user').forEach(userEl => {
            const name = userEl.textContent.toLowerCase();
            userEl.style.display = name.includes(searchTerm) ? 'flex' : 'none';
        });
    });



    // --- CORRECTED MESSAGE SENDING LOGIC ---
    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (!text || !currentConversation) return;

        // Simply emit the message to the server. Do NOT display it here.
        // The server will broadcast it back to ALL clients, including this one.
        socket.emit('sendMessage', { conversationId: currentConversation._id, text });

        // Clear the input field immediately
        messageInput.value = '';
    });

    document.getElementById('createGroupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const groupName = document.getElementById('groupName').value;
        const participants = Array.from(document.querySelectorAll('input[name="participants"]:checked')).map(cb => cb.value);
        try {
            const response = await fetch('/api/conversations/group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupName, participants })
            });
            const newGroup = await response.json();
            if(!response.ok) throw new Error(newGroup.message || 'Server error');
            
            socket.emit('joinNewGroup', newGroup._id);
            createGroupModal.hide();
            e.target.reset();
            
            await loadConversations();
            openChat(newGroup);
        } catch (err) {
            alert(`Failed to create group: ${err.message}`);
        }
    });
    
    // --- Socket.IO Listeners ---
    socket.on('newMessage', (msg) => {
        // When a new message arrives from the server, update the UI.
        // This now works for both the sender and the receiver.
        if (currentConversation && msg.conversation === currentConversation._id) {
            appendMessage(msg, chatMessages);
        }
        
        // Always refresh the conversation list to show the new "last message"
        loadConversations();
    });

    // Initial Load
    loadConversations();
});
