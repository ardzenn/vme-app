const CheckIn = require('../models/CheckIn');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const upload = require('../config/cloudinary'); // Use our powerful Cloudinary uploader
const cloudinary = require('cloudinary').v2;

// This middleware is specifically designed to handle an optional 'proof' file upload
exports.uploadProofImage = upload.single('proof');

// This is the main function to create the check-in
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
            location: {
                lat: parseFloat(lat),
                lng: parseFloat(lng)
            },
        };

        // --- NEW, ROBUST IMAGE HANDLING ---

        // 1. Handle the Proof of Visit (either from file upload or selfie)
        if (req.file) {
            newCheckInData.proof = req.file.path; // Use the path from Cloudinary upload
        } else if (proof_base64) {
            // If it's a base64 selfie, upload it to Cloudinary
            const uploadedImage = await cloudinary.uploader.upload(proof_base64, {
                folder: 'vme-app-uploads',
                resource_type: 'image'
            });
            newCheckInData.proof = uploadedImage.secure_url;
        }

        // 2. Handle the Signature (always a base64 string)
        if (signature) {
            const uploadedSignature = await cloudinary.uploader.upload(signature, {
                folder: 'vme-app-uploads',
                resource_type: 'image'
            });
            newCheckInData.signature = uploadedSignature.secure_url;
        }
        
        // --- END OF NEW IMAGE HANDLING ---

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
        res.render('checkin-history', { checkIns }); // Render a view or send JSON
    } catch (err) {
        console.error("Get check-ins error:", err);
        req.flash('error_msg', 'Failed to load check-ins.');
        res.redirect('/dashboard');
    }
};