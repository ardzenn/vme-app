document.addEventListener('DOMContentLoaded', () => {
    const currentUserId = document.body.dataset.userId;
    const currentUser = JSON.parse(document.body.dataset.currentUser || '{}');
    if (!currentUserId) return;

    const socket = io();

    // --- Modal Instances & Element Definitions ---
    const createGroupModal = new bootstrap.Modal(document.getElementById('createGroupModal'));
    const removeParticipantModal = new bootstrap.Modal(document.getElementById('removeParticipantModal'));
    const deleteGroupModal = new bootstrap.Modal(document.getElementById('deleteGroupModal'));
    const groupInfoModal = new bootstrap.Modal(document.getElementById('groupInfoModal'));
    const toggler = document.getElementById('chat-widget-toggler');
    const container = document.getElementById('chat-widget-container');
    const closeBtn = document.getElementById('chat-widget-close');
    const backBtn = document.getElementById('chat-back-btn');
    const conversationListBody = document.getElementById('conversation-list-body');
    const groupListBody = document.getElementById('group-list-body');
    const userListBody = document.getElementById('user-list-body');
    const chatSearchInput = document.getElementById('chat-search-input');
    const groupSearchInput = document.getElementById('group-search-input');
    const userSearchInput = document.getElementById('user-search-input');
    const chatWindow = document.getElementById('widget-chat-window');
    const chatHeaderInfo = document.getElementById('chat-header-info');
    const messageForm = document.getElementById('widget-message-form');
    const messageInput = document.getElementById('widget-message-input');
    const chatMessages = document.getElementById('widget-chat-messages');
    const manageBtnContainer = document.getElementById('manage-group-button-container');
    const groupInfoView = document.getElementById('widget-group-info-view');
    const infoBackBtn = document.getElementById('info-back-btn');
    const participantList = document.getElementById('group-participant-list');
    const typingIndicator = document.getElementById('typing-indicator');
    const widgetUnreadBadge = document.getElementById('widget-unread-badge');

    let allConversations = [];
    let currentConversation = null;
    let typingTimeout;
    let unreadCounts = {};
    let currentlyTyping = {};

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

        manageBtnContainer.innerHTML = '';
        chatHeaderInfo.classList.remove('is-group');
        chatHeaderInfo.onclick = null;

        if (isGroup) {
            chatHeaderInfo.classList.add('is-group');
            chatHeaderInfo.style.cursor = 'pointer';
            chatHeaderInfo.onclick = () => showGroupInfo(convo);

            if (convo.groupAdmin === currentUserId) {
                const manageBtnHTML = `
                <div class="dropdown">
                    <button class="btn btn-sm btn-light" type="button" data-bs-toggle="dropdown">⋮</button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li><a class="dropdown-item" href="#" id="remove-participant-action">Remove Participant</a></li>
                        <li><a class="dropdown-item text-danger" href="#" id="delete-group-action">Delete Group</a></li>
                    </ul>
                </div>`;
                manageBtnContainer.innerHTML = manageBtnHTML;
                document.getElementById('remove-participant-action').addEventListener('click', handleRemoveParticipant);
                document.getElementById('delete-group-action').addEventListener('click', handleDeleteGroup);
            }
        } else {
            chatHeaderInfo.style.cursor = 'default';
        }
        
        chatWindow.classList.add('active');
        groupInfoView.classList.remove('active');
        
        chatMessages.innerHTML = '<p class="text-center text-muted">Loading messages...</p>';
        try {
            const response = await fetch(`/api/conversations/${convo._id}/messages`);
            const messages = await response.json();
            chatMessages.innerHTML = '';
            messages.forEach(msg => appendMessage(msg, chatMessages));
        } catch (err) {
            chatMessages.innerHTML = '<p class="text-center text-danger">Could not load messages.</p>';
        }

        if (unreadCounts[convo._id]) {
            delete unreadCounts[convo._id];
        }
        renderConversations(allConversations);
        updateOverallUnreadBadge();
    };

    const showGroupInfo = (convo) => {
        const participantListModal = document.getElementById('group-participant-list-modal-view');
        document.getElementById('groupInfoModalTitle').textContent = convo.groupName;
        document.getElementById('group-member-count').textContent = convo.participants.length;
        participantListModal.innerHTML = '';

        convo.participants.forEach(p => {
            const isAdmin = p._id === convo.groupAdmin;
            const item = document.createElement('li');
            item.className = 'list-group-item d-flex align-items-center participant-list-item';
            item.innerHTML = `
                <img src="${p.profilePicture || '/images/default-profile.png'}" class="rounded-circle me-3" width="40" height="40" style="object-fit: cover;">
                <span>${p.firstName} ${p.lastName}</span>
                ${isAdmin ? '<span class="badge bg-primary rounded-pill ms-auto">Admin</span>' : ''}
            `;
            participantListModal.appendChild(item);
        });
        
        groupInfoModal.show();
    };

    const renderConversations = (convos) => {
        conversationListBody.innerHTML = '';
        groupListBody.innerHTML = '';
        
        convos.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        convos.forEach(convo => {
            const isGroup = convo.isGroup;
            const otherUser = convo.participants.find(p => p._id !== currentUserId);
            const displayName = isGroup ? convo.groupName : (otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'User');
            const displayPic = isGroup ? '/images/group-default.png' : (otherUser ? otherUser.profilePicture : '/images/default-profile.png');
            const lastMessageText = convo.lastMessage ? `${convo.lastMessage.sender.firstName}: ${convo.lastMessage.text}` : 'No messages yet.';
            
            const convoEl = document.createElement('div');
            convoEl.className = 'conversation';
            convoEl.dataset.convoId = convo._id;
            convoEl.dataset.name = displayName.toLowerCase();
            
            const unreadCount = unreadCounts[convo._id] || 0;
            const badgeHTML = unreadCount > 0 ? `<span class="badge bg-primary rounded-pill ms-auto unread-badge">${unreadCount}</span>` : '';

            convoEl.innerHTML = `
                <img src="${displayPic}" alt="${displayName}">
                <div>
                    <strong>${displayName}</strong>
                    <p class="text-muted mb-0 small">${lastMessageText}</p>
                </div>
                ${badgeHTML}`;
            
            convoEl.addEventListener('click', () => openChat(convo));

            if (isGroup) {
                const groupElClone = convoEl.cloneNode(true);
                groupElClone.addEventListener('click', () => openChat(convo));
                groupListBody.appendChild(groupElClone);
            }
            conversationListBody.appendChild(convoEl);
        });
    };

    const updateOverallUnreadBadge = () => {
        const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
        if (totalUnread > 0) {
            widgetUnreadBadge.textContent = totalUnread > 9 ? '9+' : totalUnread;
            widgetUnreadBadge.style.display = 'block';
        } else {
            widgetUnreadBadge.style.display = 'none';
        }
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
    infoBackBtn.addEventListener('click', () => {
        groupInfoView.classList.remove('active');
    });

    const setupSearch = (inputElement, listContainer) => {
        if (!inputElement) return;
        inputElement.addEventListener('keyup', () => {
            const searchTerm = inputElement.value.toLowerCase();
            listContainer.querySelectorAll('.conversation').forEach(el => {
                const name = el.dataset.name || el.textContent.toLowerCase();
                el.style.display = name.includes(searchTerm) ? 'flex' : 'none';
            });
        });
    };
    setupSearch(chatSearchInput, conversationListBody);
    setupSearch(groupSearchInput, groupListBody);
    setupSearch(userSearchInput, userListBody);

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

    messageInput.addEventListener('input', () => {
        if (!currentConversation) return;
        socket.emit('startTyping', { conversationId: currentConversation._id });
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit('stopTyping', { conversationId: currentConversation._id });
        }, 1500);
    });

    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (!text || !currentConversation) return;
        socket.emit('sendMessage', { conversationId: currentConversation._id, text });
        messageInput.value = '';
        socket.emit('stopTyping', { conversationId: currentConversation._id });
    });

    document.getElementById('createGroupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const groupName = document.getElementById('groupName').value;
        const participants = Array.from(document.querySelectorAll('#group-participants-list-modal input[name="participants"]:checked')).map(cb => cb.value);
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
    
    function handleRemoveParticipant() {
        const listContainer = document.getElementById('remove-participant-list');
        listContainer.innerHTML = '';
        currentConversation.participants.forEach(p => {
            if (p._id !== currentUserId) {
                const item = document.createElement('div');
                item.className = 'list-group-item d-flex justify-content-between align-items-center';
                item.innerHTML = `<span>${p.firstName} ${p.lastName}</span><button class="btn btn-sm btn-danger remove-btn">&times;</button>`;
                item.querySelector('.remove-btn').onclick = async () => {
                    if (confirm(`Are you sure you want to remove ${p.firstName}?`)) {
                        await fetch(`/api/conversations/${currentConversation._id}/participants/${p._id}`, { method: 'DELETE' });
                        removeParticipantModal.hide();
                        chatWindow.classList.remove('active');
                        loadConversations();
                    }
                };
                listContainer.appendChild(item);
            }
        });
        removeParticipantModal.show();
    }
    
    function handleDeleteGroup() {
        deleteGroupModal.show();
    }

    document.getElementById('confirm-delete-group-btn').addEventListener('click', async () => {
        if (!currentConversation) return;
        await fetch(`/api/conversations/${currentConversation._id}`, { method: 'DELETE' });
        deleteGroupModal.hide();
        chatWindow.classList.remove('active');
        loadConversations();
    });

    // --- Socket.IO Listeners ---
    socket.on('newMessage', (msg) => {
        if (currentConversation && msg.conversation === currentConversation._id) {
            appendMessage(msg, chatMessages);
        } else {
            unreadCounts[msg.conversation] = (unreadCounts[msg.conversation] || 0) + 1;
        }
        loadConversations();
        updateOverallUnreadBadge();
    });

    socket.on('userTyping', ({ conversationId, sender }) => {
        if (currentConversation && conversationId === currentConversation._id) {
            currentlyTyping[sender.id] = sender.name;
            const typers = Object.values(currentlyTyping).join(', ');
            typingIndicator.textContent = `${typers} is typing...`;
            typingIndicator.style.display = 'block';
        }
    });

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
    });

    // --- Initial Load ---
    loadConversations();
});
