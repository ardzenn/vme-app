// in public/js/push-client.js
async function subscribeUser() {
    try {
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            const VAPID_PUBLIC_KEY = 'BFzeMjoZpjp6pbGR3PSsJpVOrIODPzL_1nFZdPTHOqOK6gncMxWmUQQj5esQ5PBOL4JNjb8YrIFZYYd6b70_8fE'; 
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: VAPID_PUBLIC_KEY
            });
        }

        await fetch('/push/subscribe', {
            method: 'POST',
            body: JSON.stringify(subscription),
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('User is subscribed.');

    } catch (err) {
        console.error('Failed to subscribe the user:', err);
    }
}

function askForNotificationPermission() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
        Notification.requestPermission(status => {
            console.log('Notification permission status:', status);
            if (status === 'granted') {
                subscribeUser();
            }
        });
    }
}

// Ask for permission as soon as the user is on a main page.
askForNotificationPermission();