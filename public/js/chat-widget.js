document.addEventListener('DOMContentLoaded', () => {
    const currentUserId = document.body.dataset.userId;
    if (!currentUserId) return;

    let allConversations = [];
    let allUsers = [];
    let currentConversation = null;
    let unreadCounts = {};
    let currentlyTyping = {};
    let typingTimeout;
    const socket = io({ query: { userId: currentUserId } });

    const toggler = document.getElementById('chat-widget-toggler');
    const container = document.getElementById('chat-widget-container');
    const closeBtn = document.getElementById('chat-widget-close');
    const backBtn = document.getElementById('chat-back-btn');
    const widgetListView = document.getElementById('widget-list-view');
    const widgetChatView = document.getElementById('widget-chat-view');
    
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
    const messageInput = document.getElementById('widget-message-input');
    const typingIndicator = document.getElementById('typing-indicator');
    const widgetUnreadBadge = document.getElementById('widget-unread-badge');

    const createGroupModal = new bootstrap.Modal(document.getElementById('createGroupModal'));
    const removeParticipantModal = new bootstrap.Modal(document.getElementById('removeParticipantModal'));
    const deleteGroupModal = new bootstrap.Modal(document.getElementById('deleteGroupModal'));
    const groupInfoModal = new bootstrap.Modal(document.getElementById('groupInfoModal'));

    const renderConversationItem = (convo) => {
        const isGroup = convo.isGroup;
        const otherUser = !isGroup ? convo.participants.find(p => p._id !== currentUserId) : null;
        const displayName = isGroup ? convo.groupName : (otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'User');
        const displayPic = isGroup ? '/images/group-default.png' : (otherUser?.profilePicture || '/images/default-profile.png');
        const lastMsg = convo.lastMessage;
        const lastMessageText = lastMsg && lastMsg.sender ? `${lastMsg.sender.firstName}: ${lastMsg.text.substring(0, 25)}${lastMsg.text.length > 25 ? '...' : ''}` : 'No messages yet.';
        
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
            });
        });
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
        });
        
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
        });
    };
    
    const loadInitialData = async () => {
        try {
            const [convosRes, usersRes] = await Promise.all([
                fetch('/api/conversations'),
                fetch('/api/users')
            ]);
            if (!convosRes.ok || !usersRes.ok) throw new Error("Failed to fetch initial data");
            
            allConversations = await convosRes.json();
            allUsers = await usersRes.json();
            
            renderAllLists();
            renderUserList();
        } catch (err) {
            console.error("Could not load initial chat data:", err);
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
        } catch(e) {
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

    const appendMessage = (msg, chatBox) => {
        const isSent = msg.sender._id === currentUserId;
        const msgClass = isSent ? 'sent' : 'received';
        const profilePic = msg.sender.profilePicture || '/images/default-profile.png';
        const timestamp = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const msgHTML = `
            <div class="chat-message ${msgClass}">
                ${!isSent ? `<img src="${profilePic}" class="chat-profile-pic">` : ''}
                <div class="chat-bubble">
                    ${!isSent && currentConversation.isGroup ? `<div class="username">${msg.sender.firstName}</div>` : ''}
                    <div class="chat-text">${msg.text}</div>
                    <div class="timestamp">${timestamp}</div>
                </div>
            </div>`;
        chatBox.innerHTML += msgHTML;
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    const startNewChat = async (recipientId) => {
        try {
            const res = await fetch('/api/conversations/findOrCreate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipientId })
            });
            if(!res.ok) throw new Error('Server returned an error');
            
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
        });
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
        });
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

    toggler.addEventListener('click', () => container.classList.toggle('open'));
    closeBtn.addEventListener('click', () => container.classList.remove('open'));
    backBtn.addEventListener('click', goBackToList);

    messageInput.addEventListener('input', () => {
        if (!currentConversation) return;
        socket.emit('startTyping', { conversationId: currentConversation._id });
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit('stopTyping', { conversationId: currentConversation._id });
        }, 1500);
    });

    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (!text || !currentConversation) return;

        const originalText = text;
        messageInput.value = '';
        socket.emit('stopTyping', { conversationId: currentConversation._id });

        try {
            const response = await fetch(`/api/conversations/${currentConversation._id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: originalText })
            });
            
            const result = await response.json();
            if (!result.success) {
                messageInput.value = originalText;
                alert('Message could not be sent.');
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            messageInput.value = originalText;
            alert('Message could not be sent.');
        }
    });
    
    document.getElementById('createGroupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const groupName = document.getElementById('groupName').value;
        const participants = Array.from(document.querySelectorAll('#group-participants-list-modal input:checked')).map(cb => cb.value);
        try {
            const res = await fetch('/api/conversations/group', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupName, participants })
            });
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
    });

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
    });

    const setupSearch = (inputElement, listContainer) => {
        inputElement.addEventListener('keyup', () => {
            const searchTerm = inputElement.value.toLowerCase();
            listContainer.querySelectorAll('.conversation-item').forEach(el => {
                const name = el.dataset.name || '';
                el.style.display = name.includes(searchTerm) ? 'flex' : 'none';
            });
        });
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
        });
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

    // ADDED: Listener for IT users to receive new support chats in real-time
    socket.on('newConversation', (newConvo) => {
        allConversations.unshift(newConvo);
        renderAllLists();
        if (!container.classList.contains('open')) {
             toggler.classList.add('shake');
             setTimeout(()=> toggler.classList.remove('shake'), 600);
        }
    });

    loadInitialData();
});