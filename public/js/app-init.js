window.addEventListener('load', () => {
  const splashScreen = document.querySelector('.splash-screen');
  
  if (splashScreen) {
    setTimeout(() => {
      splashScreen.style.display = 'none';
    }, 3000);
  }
});

function showUpdateNotification() {
    const notification = document.getElementById('update-notification');
    const reloadButton = document.getElementById('update-reload-button');
    if (notification && reloadButton) {
        notification.style.display = 'flex';
        reloadButton.addEventListener('click', () => {
            // This tells the new service worker to take control and reload the page
            window.location.reload();
        });
    }
}

if ('serviceWorker' in navigator && window.workbox) {
    const wb = new window.workbox.Workbox('/sw.js');

    wb.addEventListener('waiting', (event) => {
        showUpdateNotification();
    });

    wb.register();
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the chat widget if the function exists
    if (typeof window.initChatWidget === 'function') {
        console.log('app-init: Initializing chat widget.');
        window.initChatWidget();
    } else {
        console.error('app-init: initChatWidget not found, skipping initialization.');
    }
});