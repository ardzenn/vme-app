// public/js/push-client.js
// This handles push notification subscription on the client side

const VAPID_PUBLIC_KEY = 'BOx_pjFO7MNmFE1HyoXGbdGwPZixbbrFtA5dIAL2K1cdwjGJU0k7buGeKOgDuQasuhamK174AoV_ROq_nTi2bPo'; // You need to generate this

class PushManager {
    constructor() {
        this.swRegistration = null;
        this.isSubscribed = false;
    }

    async init() {
        // Check if service worker and push are supported
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push notifications not supported');
            return;
        }

        try {
            // Wait for service worker to be ready
            this.swRegistration = await navigator.serviceWorker.ready;
            
            // Check current subscription
            const subscription = await this.swRegistration.pushManager.getSubscription();
            this.isSubscribed = !(subscription === null);

            if (this.isSubscribed) {
                console.log('User IS subscribed to push notifications');
                await this.sendSubscriptionToServer(subscription);
            } else {
                console.log('User is NOT subscribed to push notifications');
                await this.subscribeUser();
            }
        } catch (error) {
            console.error('Failed to initialize push:', error);
        }
    }
}
 async function subscribeUser() {
    try {
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: VAPID_PUBLIC_KEY
            });
        }

        const response = await fetch('/push/subscribe', {
            method: 'POST',
            body: JSON.stringify(subscription),
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error('Bad response from server');
        }

        console.log('User is subscribed.');
        return true;

    } catch (err) {
        console.error('Failed to subscribe the user:', err);
        return false;
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

// Test push notification function
async function testPushNotification() {
    console.log('Test push button clicked');
    
    try {
        // First ensure we have permission
        if (Notification.permission !== 'granted') {
            console.log('Requesting notification permission...');
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                alert('Please allow notifications to test push notifications');
                return;
            }
        }

        // Ensure we're subscribed
        const subscribed = await subscribeUser();
        if (!subscribed) {
            alert('Failed to subscribe to push notifications. Check console for errors.');
            return;
        }

        // Send test push request
        console.log('Sending test push request...');
        const response = await fetch('/push/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin' // Important for session cookies
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Server error: ${response.status} - ${error}`);
        }

        const result = await response.json();
        console.log('Test push sent:', result);
        alert('Test push notification sent! You should see it shortly.');

    } catch (error) {
        console.error('Test push error:', error);
        alert(`Failed to send test push: ${error.message}`);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Push client initializing...');
    
    // Ask for permission
    askForNotificationPermission();
    
    // Attach test button handler
    const testButton = document.getElementById('test-push-btn');
    if (testButton) {
        console.log('Test button found, attaching handler');
        testButton.addEventListener('click', testPushNotification);
    } else {
        console.error('Test push button not found! Looking for element with id: test-push-btn');
    }
});

// Debug function to check push status
window.checkPushStatus = async function() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        console.log('Service Worker:', registration.active ? 'Active' : 'Not Active');
        console.log('Push Subscription:', subscription ? 'Subscribed' : 'Not Subscribed');
        console.log('Notification Permission:', Notification.permission);
        
        if (subscription) {
            console.log('Subscription endpoint:', subscription.endpoint);
        }
        
        return {
            serviceWorker: registration.active ? 'Active' : 'Not Active',
            subscription: subscription ? 'Subscribed' : 'Not Subscribed',
            permission: Notification.permission
        };
    } catch (error) {
        console.error('Error checking push status:', error);
    }
};