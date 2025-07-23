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
        const newHospital = new Hospital({ name, createdBy: req.user.id });
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
        // UPDATED: Assigns the creator's ID when saving
        const newDoctor = new Doctor({ name, hospital: hospitalId, createdBy: req.user.id });
        await newDoctor.save();
        res.status(201).json({ success: true, doctor: newDoctor });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};


exports.deleteHospital = async (req, res) => {
    try {
        const hospital = await Hospital.findById(req.params.id);
        if (!hospital || hospital.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Permission denied.' });
        }
        await Doctor.deleteMany({ hospital: req.params.id, createdBy: req.user.id });
        await Hospital.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Hospital and its doctors deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

exports.deleteDoctor = async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id);
        if (!doctor || doctor.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Permission denied.' });
        }
        await Doctor.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Doctor deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};