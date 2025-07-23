// =================================================================
// FILE: controllers/checkInController.js
// This file contains the logic to handle the form submission.
// =================================================================
const CheckIn = require('../models/CheckIn');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const multer = require('multer');
const path = require('path');

// --- Multer Configuration for Check-in Proofs ---
// This sets up how and where to save uploaded files.
const storage = multer.diskStorage({
    // IMPORTANT: Make sure you have a folder named 'proofs' inside your 'public/uploads' directory.
    destination: './public/uploads/proofs/',
    filename: function (req, file, cb) {
        // Creates a unique filename like: checkin-USERID-TIMESTAMP.jpg
        cb(null, `checkin-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// This middleware will process the image upload from the form.
const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB Limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb('Error: File upload only supports image files.');
    }
});

// This is the main controller function that runs after multer processes the upload.
exports.createCheckIn = async (req, res) => {
    // Because of multer, the text fields are now correctly parsed into req.body
    const { hospitalName, doctorName, activity, signature, proof_base64, lat, lng } = req.body;

    // This validation check will now work correctly.
    if (!hospitalName || !doctorName || !activity) {
        req.flash('error_msg', 'Hospital, Doctor, and Activity are required fields. Please fill out the form completely.');
        return res.redirect('back');
    }

    try {
        // Step 1: Find or create the hospital
        let hospital = await Hospital.findOne({ name: hospitalName });
        if (!hospital) {
            hospital = new Hospital({ name: hospitalName, address: 'N/A' });
            await hospital.save();
        }

        // Step 2: Find or create the doctor
        let doctor = await Doctor.findOne({ name: doctorName, hospital: hospital.id });
        if (!doctor) {
            doctor = new Doctor({ name: doctorName, specialty: 'N/A', hospital: hospital.id });
            await doctor.save();
        }

        // Step 3: Prepare the new CheckIn data from the form
        const newCheckInData = {
            user: req.user.id,
            hospital: hospital.id,
            doctor: doctor.id,
            activity: activity,
            signature: signature, // The base64 data from the signature pad
            location: { lat, lng }
        };

        // Step 4: Handle the proof of visit (either uploaded file or selfie)
        if (req.file) {
            // If a file was uploaded, save its path
            newCheckInData.proof = `/uploads/proofs/${req.file.filename}`;
        } else if (proof_base64) {
            // If a selfie was taken, save the base64 data URL
            newCheckInData.proof = proof_base64;
        }

        const newCheckIn = new CheckIn(newCheckInData);
        await newCheckIn.save();

        req.flash('success_msg', `Successfully checked in at ${hospital.name} with Dr. ${doctor.name}.`);
        res.redirect('/dashboard');

    } catch (err) {
        console.error("Check-in error:", err);
        req.flash('error_msg', 'An unexpected error occurred during check-in.');
        res.redirect('back');
    }
};

// We export the upload middleware so the route can use it.
exports.uploadProof = upload.single('proof');