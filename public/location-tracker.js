// This script silently prepares a user's location on the dashboard page.
document.addEventListener('DOMContentLoaded', () => {
    // A global variable to store the most recent position
    window.VME_APP_CURRENT_POSITION = null;

    const getLocation = () => {
        if (!navigator.geolocation) return;

        // Use the smart two-step process to get a location
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                // Success: store the position object
                window.VME_APP_CURRENT_POSITION = pos;
                console.log('Pre-emptive location captured:', pos.coords);
            },
            (err) => {
                // If the first (fast) attempt fails, try again with high accuracy
                if (err.code === 3) { // TIMEOUT
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            window.VME_APP_CURRENT_POSITION = pos;
                            console.log('Pre-emptive location captured (High Accuracy):', pos.coords);
                        },
                        (highAccuracyErr) => {
                            console.error('High accuracy location fetch failed:', highAccuracyErr.message);
                        },
                        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                    );
                } else {
                     console.error('Pre-emptive location fetch failed:', err.message);
                }
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 } // Fast, cached attempt first
        );
    };

    // Get location on page load, and then every 60 seconds
    getLocation();
    setInterval(getLocation, 60000);
});