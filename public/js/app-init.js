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