// location-tracker.js
document.addEventListener('DOMContentLoaded', () => {
    const RETRY_INTERVAL_MS = 30000; // Retry every 30 seconds
    const API_ENDPOINT = '/api/location';
    const REVERSE_GEOCODE_URL = 'https://api.opencagedata.com/geocode/v1/json';
    const OPENCAGE_API_KEY = '5359f7a7dd984272bb48e178632bc4b6'; // Replace this

    // Local queue storage
    const queueKey = 'locationQueue';

    function saveToQueue(data) {
        const queue = JSON.parse(localStorage.getItem(queueKey)) || [];
        queue.push(data);
        localStorage.setItem(queueKey, JSON.stringify(queue));
    }

    function flushQueue() {
        const queue = JSON.parse(localStorage.getItem(queueKey)) || [];
        if (!queue.length) return;

        const next = queue.shift();
        sendToServer(next, () => {
            localStorage.setItem(queueKey, JSON.stringify(queue));
            if (queue.length) setTimeout(flushQueue, 1000);
        });
    }

    function reverseGeocode(lat, lng, callback) {
        fetch(`${REVERSE_GEOCODE_URL}?q=${lat}+${lng}&key=${OPENCAGE_API_KEY}&limit=1`)
            .then(res => res.json())
            .then(data => {
                if (data && data.results && data.results.length > 0) {
                    callback(data.results[0].formatted);
                } else {
                    callback('Address unavailable');
                }
            })
            .catch(err => {
                console.error('Reverse geocoding failed:', err);
                callback('Address unavailable');
            });
    }

    function sendToServer(locationData, onSuccess) {
        fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(locationData)
        })
        .then(res => {
            if (res.ok) {
                console.log('Location synced:', locationData);
                if (typeof onSuccess === 'function') onSuccess();
            } else {
                throw new Error('Server rejected location');
            }
        })
        .catch(err => {
            console.warn('Sync failed, re-queued:', err.message);
            saveToQueue(locationData);
        });
    }

    function captureAndSendLocation() {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            pos => {
                const { latitude, longitude } = pos.coords;
                reverseGeocode(latitude, longitude, (address) => {
                    const payload = {
                        lat: latitude,
                        lng: longitude,
                        address,
                        timestamp: new Date().toISOString()
                    };
                    sendToServer(payload);
                });
            },
            err => {
                console.error('Geolocation error:', err.message);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }

    // Initial fetch
    captureAndSendLocation();
    flushQueue();

    // Run every 60 seconds
    setInterval(() => {
        captureAndSendLocation();
        flushQueue();
    }, 60000);

    // Retry flush every 30s if still offline
    setInterval(flushQueue, RETRY_INTERVAL_MS);
});
