const CheckIn = require('../models/CheckIn');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const upload = require('../config/cloudinary');
const cloudinary = require('cloudinary').v2;
const { createNotificationsForGroup, getAdminAndITIds } = require('../services/notificationService');

exports.uploadProofImage = upload.single('proof');

exports.createCheckIn = async (req, res) => {
    try {
        const { hospitalName, doctorName, activity, notes, proof_base64, signature } = req.body;

        if (!hospitalName || !doctorName || !activity) {
            return res.status(400).json({ success: false, message: 'Hospital, Doctor, and Activity are required.' });
        }

        let hospital = await Hospital.findOneAndUpdate(
            { name: hospitalName.trim(), createdBy: req.user.id },
            { $setOnInsert: { name: hospitalName.trim(), createdBy: req.user.id } },
            { upsert: true, new: true }
        );

        let doctor = await Doctor.findOneAndUpdate(
            { name: doctorName.trim(), hospital: hospital._id, createdBy: req.user.id },
            { $setOnInsert: { name: doctorName.trim(), hospital: hospital._id, createdBy: req.user.id } },
            { upsert: true, new: true }
        );

        const newCheckInData = {
            user: req.user.id,
            hospital: hospital.id,
            doctor: doctor.id,
            activity,
            notes,
        };
        
        if (req.file) {
            newCheckInData.proof = req.file.path;
        } else if (proof_base64) {
            const uploadedImage = await cloudinary.uploader.upload(proof_base64, {
                folder: 'vme-app-uploads/proofs',
                resource_type: 'image'
            });
            newCheckInData.proof = uploadedImage.secure_url;
        }

        if (signature) {
            const uploadedSignature = await cloudinary.uploader.upload(signature, {
                folder: 'vme-app-uploads/signatures',
                resource_type: 'image'
            });
            newCheckInData.signature = uploadedSignature.secure_url;
        }
        
        const newCheckIn = new CheckIn(newCheckInData);
        await newCheckIn.save();

        const populatedCheckIn = await CheckIn.findById(newCheckIn._id)
            .populate('user', 'firstName lastName')
            .populate('hospital', 'name')
            .populate('doctor', 'name');
            
        const io = req.app.get('io');
        io.emit('newCheckIn', populatedCheckIn);

        const adminIds = await getAdminAndITIds();
        const notificationText = `${req.user.firstName} ${req.user.lastName} has just checked in at ${hospital.name}.`;
        const notificationLink = `/admin-dashboard#checkins-panel`;
        await createNotificationsForGroup(io, adminIds, notificationText, notificationLink);

        res.status(201).json({
            success: true,
            message: 'Check-in submitted! Capturing location in the background...',
            checkIn: newCheckIn
        });

    } catch (err) {
        console.error("Check-in Error:", err);
        res.status(500).json({ success: false, message: 'Failed to submit check-in due to a server error.' });
    }
};

exports.updateLocation = async (req, res) => {
    try {
        const { lat, lng } = req.body;
        const checkIn = await CheckIn.findById(req.params.id);

        if (!checkIn) {
            return res.status(404).json({ success: false, message: 'Check-in record not found.' });
        }

        if (checkIn.location && checkIn.location.coordinates && checkIn.location.coordinates[0] !== 0) {
            return res.status(400).json({ success: false, message: 'Location is already set for this check-in.' });
        }

        checkIn.location = { lat: parseFloat(lat), lng: parseFloat(lng) };
        
        const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
        if (mapboxToken && lat && lng) {
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);
            checkIn.mapImageUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-marker+f74e4e(${longitude},${latitude})/${longitude},${latitude},15,0/600x300?access_token=${mapboxToken}`;
        }
        
        await checkIn.save();

        const io = req.app.get('io');
        io.emit('checkInLocationUpdated', {
            checkInId: checkIn._id,
            mapImageUrl: checkIn.mapImageUrl
        });

        res.status(200).json({ success: true, message: 'Location updated successfully.' });

    } catch (error) {
        console.error("Location Update Error:", error);
        res.status(500).json({ success: false, message: 'Server error while updating location.' });
    }
};

exports.getCheckIns = async (req, res) => {
    try {
        const checkIns = await CheckIn.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.render('checkin-history', { checkIns });
    } catch (err) {
        console.error("Get check-ins error:", err);
        req.flash('error_msg', 'Failed to load check-ins.');
        res.redirect('/dashboard');
    }
};