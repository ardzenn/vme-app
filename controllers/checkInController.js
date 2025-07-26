const CheckIn = require('../models/CheckIn');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const upload = require('../config/cloudinary');
const cloudinary = require('cloudinary').v2;

exports.uploadProofImage = upload.single('proof');

exports.createCheckIn = async (req, res) => {
    try {
        const { hospitalName, doctorName, activity, notes, lat, lng, proof_base64, signature } = req.body;

        if (!hospitalName || !doctorName || !activity) {
            req.flash('error_msg', 'Hospital, Doctor, and Activity are all required fields.');
            return res.redirect('/dashboard');
        }

        let hospital = await Hospital.findOne({ name: hospitalName.trim() });
        if (!hospital) {
            hospital = new Hospital({ name: hospitalName.trim(), createdBy: req.user.id });
            await hospital.save();
        }

        let doctor = await Doctor.findOne({ name: doctorName.trim(), hospital: hospital.id });
        if (!doctor) {
            doctor = new Doctor({ name: doctorName.trim(), hospital: hospital.id, createdBy: req.user.id });
            await doctor.save();
        }

        const newCheckInData = {
            user: req.user.id,
            hospital: hospital.id,
            doctor: doctor.id,
            activity,
            notes,
        };

        // --- NEW MAP IMAGE URL GENERATION ---
        if (lat && lng) {
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);
            newCheckInData.location = { lat: latitude, lng: longitude };

            const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
            // This creates a URL for a 600x300 image, centered on the user, with a marker
            newCheckInData.mapImageUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-marker+f74e4e(${longitude},${latitude})/${longitude},${latitude},15,0/600x300?access_token=${mapboxToken}`;
        }
        
        if (req.file) {
            newCheckInData.proof = req.file.path;
        } else if (proof_base64) {
            const uploadedImage = await cloudinary.uploader.upload(proof_base64, {
                folder: 'vme-app-uploads',
                resource_type: 'image'
            });
            newCheckInData.proof = uploadedImage.secure_url;
        }

        if (signature) {
            const uploadedSignature = await cloudinary.uploader.upload(signature, {
                folder: 'vme-app-uploads',
                resource_type: 'image'
            });
            newCheckInData.signature = uploadedSignature.secure_url;
        }
        
        const newCheckIn = new CheckIn(newCheckInData);
        await newCheckIn.save();

        req.flash('success_msg', 'Check-in submitted successfully!');
        res.redirect('/dashboard');

    } catch (err) {
        console.error("Check-in Error:", err);
        req.flash('error_msg', 'Failed to submit check-in.');
        res.redirect('/dashboard');
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