document.addEventListener('DOMContentLoaded', () => {
    const userId = document.body.dataset.userId;
    if (!userId) return;

    const socket = io();
    const notificationDropdown = document.getElementById('notificationDropdown');
    const notificationBadge = document.getElementById('notification-badge');
    const notificationList = document.getElementById('notification-list');
    
    function formatTimeAgo(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return Math.floor(seconds) + "s ago";
    }

    function renderNotifications(notifications = []) {
        if (!notificationList) return;
        if (notifications.length === 0) {
            notificationList.innerHTML = '<li class="p-3 text-center text-muted">No new notifications.</li>';
            return;
        }

        notificationList.innerHTML = notifications.map(notif => `
            <li>
                <a class="dropdown-item d-flex align-items-start p-2 ${!notif.read ? 'bg-light' : ''}" href="${notif.link}" style="white-space: normal;">
                    <div class="flex-grow-1">
                        <p class="mb-0 small">${notif.text}</p>
                        <small class="text-muted">${formatTimeAgo(notif.createdAt)}</small>
                    </div>
                </a>
            </li>
        `).join('');
    }

    function updateBadge(count) {
        if (!notificationBadge) return;
        if (count > 0) {
            notificationBadge.textContent = count > 9 ? '9+' : count;
            notificationBadge.style.display = 'block';
        } else {
            notificationBadge.style.display = 'none';
        }
    }
    
    async function fetchInitialNotifications() {
        try {
            const response = await fetch('/notifications/api');
            if (!response.ok) return;
            const data = await response.json();
            renderNotifications(data.notifications);
            updateBadge(data.unreadCount);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    }

    async function markNotificationsAsRead() {
        try {
            await fetch('/notifications/api/read', { method: 'POST' });
            updateBadge(0);
            notificationList.querySelectorAll('.bg-light').forEach(item => item.classList.remove('bg-light'));
        } catch (err) {
            console.error('Failed to mark notifications as read:', err);
        }
    }

    if (notificationDropdown) {
        fetchInitialNotifications();
        notificationDropdown.addEventListener('show.bs.dropdown', () => {
            if (notificationBadge.style.display !== 'none') {
                markNotificationsAsRead();
            }
        });
    }

    socket.on('new_notification', (notification) => {
        const audio = new Audio('/sounds/notification.mp3');
        audio.play().catch(e => {}); 
        fetchInitialNotifications();
    });

    // Join personal room for real-time updates
    socket.emit('joinPersonalRoom', userId);
});