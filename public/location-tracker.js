// This script runs for MSR/KAS users to send their location data to the server.
document.addEventListener('DOMContentLoaded', () => {
    // This script assumes the socket.io client is already loaded on the page.
    const socket = io();

    const sendLocation = () => {
        // We use low accuracy to be fast and save battery.
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                };
                // Send the location to the server via WebSocket
                socket.emit('updateLocation', coords);
                console.log('Location sent:', coords);
            },
            (err) => {
                console.error('Could not get location:', err.message);
            },
            {
                enableHighAccuracy: false, // Use less battery
                timeout: 8000,
                maximumAge: 60000 // Ok to use a location that is up to 1 minute old
            }
        );
    };

    // Send location immediately on load, and then every 60 seconds.
    sendLocation();
    setInterval(sendLocation, 60000); // 60,000 milliseconds = 1 minute
});