const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
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
exports.addHospital = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Hospital name is required.' });
        }
        const existingHospital = await Hospital.findOne({ name });
        if (existingHospital) {
            return res.status(409).json({ success: false, message: 'Hospital already exists.' });
        }
        const newHospital = new Hospital({ name });
        await newHospital.save();
        res.status(201).json({ success: true, hospital: newHospital });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

exports.addDoctor = async (req, res) => {
    try {
        const { name, hospitalId } = req.body;
        if (!name || !hospitalId) {
            return res.status(400).json({ success: false, message: 'Doctor name and hospital are required.' });
        }
        const newDoctor = new Doctor({ name, hospital: hospitalId });
        await newDoctor.save();
        res.status(201).json({ success: true, doctor: newDoctor });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};