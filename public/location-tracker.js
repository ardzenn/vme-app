document.addEventListener('DOMContentLoaded', () => {
    const userId = document.body.dataset.userId;
    if (!userId) return;
    if (typeof io === 'undefined') {
        console.error('Socket.IO client not found. Make sure chat-widget.js or socket.io.js is loaded first.');
        return;
    }
    const socket = io();
    const thirtySeconds = 30000;
    let lastLat = 0;
    let lastLng = 0;

    function sendLocationUpdate() {
        if (!navigator.geolocation) {
            console.log("Geolocation is not supported by this browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            
            if (Math.abs(lat - lastLat) > 0.0001 || Math.abs(lng - lastLng) > 0.0001) {
                lastLat = lat;
                lastLng = lng;
                
                socket.emit('updateLocation', { lat, lng });
            }
        }, 
        (error) => {
            console.error("Error getting location:", error.message);
        },
        { 
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    }

    sendLocationUpdate();


    setInterval(sendLocationUpdate, thirtySeconds);
});