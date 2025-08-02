document.addEventListener('DOMContentLoaded', () => {
    const imageZoomModal = new bootstrap.Modal(document.getElementById('imageZoomModal'));
    const modalZoomImage = document.getElementById('modalZoomImage');
    window.showImageInModal = function(src) {
        if (modalZoomImage) {
            modalZoomImage.src = src;
            imageZoomModal.show();
        }
    }

    const addTableFilter = (inputId, tableId) => {
        const searchInput = document.getElementById(inputId);
        if (searchInput) {
             searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                document.querySelectorAll(`#${tableId} tbody tr`).forEach(row => {
                    row.style.display = (row.dataset.search || '').includes(searchTerm) ? '' : 'none';
                });
            });
        }
    };
    addTableFilter('orderSearch', 'orderTable');
    addTableFilter('checkinSearch', 'checkinTable');

     if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('Service Worker registered.'))
                .catch(error => console.log('Service Worker registration failed:', error));
        });
    }

    const notificationButton = document.getElementById('enable-notifications-btn');

    if ('Notification' in window && notificationButton) {
        if (Notification.permission === 'granted' || Notification.permission === 'denied') {
            notificationButton.style.display = 'none';
        }

        notificationButton.addEventListener('click', () => {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    alert('Notifications have been enabled!');
                    notificationButton.style.display = 'none';
                } else if (permission === 'denied') {
                    alert('You have blocked notifications. You can enable them in your browser settings.');
                    notificationButton.style.display = 'none';
                }
            });
        });
    } else if (notificationButton) {
        notificationButton.style.display = 'none';
    }
});
