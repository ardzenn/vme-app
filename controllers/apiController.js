const User = require('../models/User');

/**
 * Updates the user's last known location.
 * This is typically called by a periodic fetch() from the client-side.
 */
exports.updateLocation = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated.' });
    }

    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
        return res.status(400).json({ message: 'Latitude and longitude are required.' });
    }

    try {
        await User.findByIdAndUpdate(req.user.id, {
            lastLocation: {
                type: 'Point',
                coordinates: [longitude, latitude] // GeoJSON format: [longitude, latitude]
            },
            lastLocationUpdate: Date.now()
        });
        res.status(200).json({ message: 'Location updated successfully.' });
    } catch (err) {
        console.error("Location update error:", err);
        res.status(500).json({ message: 'Server error while updating location.' });
    }
};
