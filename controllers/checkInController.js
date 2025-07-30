const CheckIn = require('../models/CheckIn');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const upload = require('../config/cloudinary');
const cloudinary = require('cloudinary').v2;
const { createNotificationsForGroup, getAdminAndITIds } = require('../services/notificationService');

exports.uploadProofImage = upload.single('proof');

exports.createCheckIn = async (req, res) => {
    try {
        const { hospitalName, doctorName, activity, notes, lat, lng, proof_base64, signature } = req.body;

        if (!hospitalName || !doctorName || !activity) {
            return res.status(400).json({ success: false, message: 'Hospital, Doctor, and Activity are required.' });
        }

        let hospital = await Hospital.findOne({ name: hospitalName.trim(), createdBy: req.user.id });
        if (!hospital) {
            return res.status(400).json({ success: false, message: 'Selected hospital not found.' });
        }

        let doctor = await Doctor.findOne({ name: doctorName.trim(), hospital: hospital._id, createdBy: req.user.id });
        if (!doctor) {
            return res.status(400).json({ success: false, message: 'Selected doctor not found.' });
        }

        const newCheckInData = {
            user: req.user.id,
            hospital: hospital.id,
            doctor: doctor.id,
            activity,
            notes,
        };

        if (lat && lng) {
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);
            newCheckInData.location = { lat: latitude, lng: longitude };
            const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
            if (mapboxToken) {
                newCheckInData.mapImageUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-marker+f74e4e(${longitude},${latitude})/${longitude},${latitude},15,0/600x300?access_token=${mapboxToken}`;
            }
        }
        
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
        await createNotificationsForGroup(io, {
            recipients: adminIds,
            sender: req.user.id,
            type: 'NEW_CHECKIN',
            message: `${req.user.firstName} ${req.user.lastName} has just checked in at ${hospital.name}.`,
            link: `/admin-dashboard#checkins-panel`
        });

        res.status(201).json({
            success: true,
            message: 'Check-in submitted!',
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

        if (checkIn.location && checkIn.location.lat) {
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