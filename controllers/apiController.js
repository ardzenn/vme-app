const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const LocationLog = require('../models/LocationLog'); // Make sure this exists
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const axios = require('axios');

const upload = multer({ dest: 'temp-uploads/' });
exports.uploadCsv = upload.single('clientCsv');

// Reverse geocode using OpenStreetMap Nominatim
async function reverseGeocode(lat, lng) {
    try {
        const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
            params: {
                format: 'json',
                lat,
                lon: lng
            },
            headers: {
                'User-Agent': 'VMEApp/1.0'
            }
        });
        return res.data.display_name || 'Unknown location';
    } catch (err) {
        console.error('Reverse geocode error:', err.message);
        return 'Unknown location';
    }
}

// LOCATION SYNC (foreground)
exports.updateLocation = async (req, res) => {
    try {
        const { lat, lng } = req.body;
        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: 'Missing coordinates' });
        }

        const address = await reverseGeocode(lat, lng);
        const userId = req.user.id;

        // Update user location in database
        const updatedUser = await User.findByIdAndUpdate(userId, {
            lastLocation: { type: 'Point', coordinates: [lng, lat] },
            lastKnownAddress: address,
            lastLocationUpdate: new Date()
        }, { new: true }).select('firstName lastName role lastLocation lastKnownAddress lastLocationUpdate');

        // Log location for history
        await LocationLog.create({
            user: userId,
            coordinates: { type: 'Point', coordinates: [lng, lat] },
            address,
            accuracy: req.body.accuracy || null,
            source: 'foreground'
        });

        // Emit location update via Socket.IO
        const io = req.app.get('io');
        if (io) {
            // Emit to all connected clients
            io.emit('locationUpdate', {
                _id: updatedUser._id,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                role: updatedUser.role,
                lastLocation: updatedUser.lastLocation,
                lastKnownAddress: updatedUser.lastKnownAddress,
                lastLocationUpdate: updatedUser.lastLocationUpdate
            });
            
            console.log(`Location update emitted for user ${updatedUser.firstName} ${updatedUser.lastName}`);
        }

        res.status(200).json({ success: true, user: updatedUser });
    } catch (err) {
        console.error('updateLocation error:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
};

// Also add a debug endpoint to check user locations
exports.getUsersWithLocations = async (req, res) => {
    try {
        const users = await User.find({ 
            role: { $in: ['MSR', 'KAS'] },
            lastLocation: { $exists: true }
        }).select('firstName lastName role lastLocation lastKnownAddress lastLocationUpdate');
        
        res.json(users);
    } catch (err) {
        console.error('Error fetching users with locations:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


// ADD HOSPITAL
exports.addHospital = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'Hospital name cannot be empty.' });
        }
        const hospital = new Hospital({ name, createdBy: req.user.id });
        await hospital.save();

        res.status(201).json({ success: true, hospital });
    } catch (error) {
        res.status(400).json({ success: false, message: 'A hospital with this name may already exist.' });
    }
};

// ADD DOCTOR
exports.addDoctor = async (req, res) => {
    try {
        const { name, hospitalId } = req.body;
        if (!name || name.trim() === '' || !hospitalId) {
            return res.status(400).json({ success: false, message: 'Doctor name and hospital are required.' });
        }
        const doctor = new Doctor({ name, hospital: hospitalId, createdBy: req.user.id });
        await doctor.save();

        const populatedDoctor = await Doctor.findById(doctor._id).populate('hospital');
        res.status(201).json({ success: true, doctor: populatedDoctor });
    } catch (error) {
        res.status(400).json({ success: false, message: 'This doctor may already exist for the selected hospital.' });
    }
};

// DELETE HOSPITAL + LINKED DOCTORS
exports.deleteHospital = async (req, res) => {
    try {
        await Doctor.deleteMany({ hospital: req.params.id, createdBy: req.user.id });
        await Hospital.deleteOne({ _id: req.params.id, createdBy: req.user.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// DELETE DOCTOR
exports.deleteDoctor = async (req, res) => {
    try {
        await Doctor.deleteOne({ _id: req.params.id, createdBy: req.user.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// IMPORT CLIENTS FROM CSV
exports.importClients = (req, res) => {
    if (!req.file) {
        req.flash('error_msg', 'Please upload a CSV file.');
        return res.redirect('/manage-entries');
    }

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv({ headers: ['Hospital', 'Doctor'], skipLines: 0 }))
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            fs.unlinkSync(req.file.path);
            let successCount = 0;
            let errorCount = 0;

            for (const row of results) {
                try {
                    const hospitalName = row.Hospital?.trim();
                    const doctorName = row.Doctor?.trim();
                    if (!hospitalName || !doctorName) {
                        errorCount++;
                        continue;
                    }

                    const hospital = await Hospital.findOneAndUpdate(
                        { name: hospitalName, createdBy: req.user.id },
                        { $setOnInsert: { name: hospitalName, createdBy: req.user.id } },
                        { upsert: true, new: true }
                    );

                    await Doctor.findOneAndUpdate(
                        { name: doctorName, hospital: hospital._id, createdBy: req.user.id },
                        { $setOnInsert: { name: doctorName, hospital: hospital._id, createdBy: req.user.id } },
                        { upsert: true }
                    );

                    successCount++;
                } catch (err) {
                    errorCount++;
                }
            }

            req.flash('success_msg', `${successCount} clients imported. ${errorCount > 0 ? `${errorCount} failed.` : ''}`);
            res.redirect('/manage-entries');
        });
};
// GET USER LOCATION HISTORY
exports.getUserLocationHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get location history for the user, sorted by most recent first
        const locationHistory = await LocationLog.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(100) // Limit to last 100 entries to avoid overwhelming the response
            .select('coordinates address accuracy source createdAt');
        
        res.json({ 
            success: true, 
            history: locationHistory,
            count: locationHistory.length 
        });
    } catch (err) {
        console.error('Error fetching location history:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Server error: ' + err.message 
        });
    }
};