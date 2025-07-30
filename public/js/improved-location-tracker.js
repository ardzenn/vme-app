document.addEventListener('DOMContentLoaded', () => {
    // Only run if user is logged in
    if (!document.body.dataset.userId) return;
    
    const LOCATION_UPDATE_INTERVAL = 60000; // 1 minute
    const API_ENDPOINT = '/api/location';
    
    let lastPosition = null;
    
    function sendLocationUpdate(position) {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Don't send if position hasn't changed significantly (within 50 meters)
        if (lastPosition) {
            const distance = calculateDistance(
                lastPosition.latitude, lastPosition.longitude,
                latitude, longitude
            );
            if (distance < 0.05) return; // 50 meters
        }
        
        lastPosition = { latitude, longitude };
        
        fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                lat: latitude,
                lng: longitude,
                accuracy: accuracy
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Location updated successfully');
            }
        })
        .catch(error => {
            console.error('Failed to update location:', error);
        });
    }
    
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    function startLocationTracking() {
        if (!navigator.geolocation) {
            console.error('Geolocation is not supported');
            return;
        }
        
        // Get initial position
        navigator.geolocation.getCurrentPosition(
            sendLocationUpdate,
            (error) => console.error('Geolocation error:', error),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
        
        // Set up continuous tracking
        setInterval(() => {
            navigator.geolocation.getCurrentPosition(
                sendLocationUpdate,
                (error) => console.error('Geolocation error:', error),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        }, LOCATION_UPDATE_INTERVAL);
    }
    
    // Start tracking
    startLocationTracking();
});