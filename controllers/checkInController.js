const CheckIn = require('../models/CheckIn');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const multer = require('multer');
const path = require('path');

// --- Multer Configuration (No changes needed here) ---
const storage = multer.diskStorage({
    destination: './public/uploads/proofs/',
    filename: function (req, file, cb) {
        cb(null, `checkin-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});
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

exports.uploadProof = upload.single('proof');

//Main Controller Function 
exports.createCheckIn = async (req, res) => {
    const { hospitalName, doctorName, activity, signature, proof_base64, lat, lng } = req.body;

    if (!hospitalName || !doctorName || !activity) {
        req.flash('error_msg', 'Hospital, Doctor, and Activity are required fields.');
        return res.redirect('back');
    }

    try {
        let hospital = await Hospital.findOne({ name: hospitalName });
        if (!hospital) {
            hospital = new Hospital({ name: hospitalName, createdBy: req.user.id }); // Assume user-created
            await hospital.save();
        }

        let doctor = await Doctor.findOne({ name: doctorName, hospital: hospital.id });
        if (!doctor) {
            doctor = new Doctor({ name: doctorName, hospital: hospital.id, createdBy: req.user.id }); // Assume user-created
            await doctor.save();
        }

        const newCheckInData = {
            user: req.user.id,
            hospital: hospital.id,
            doctor: doctor.id,
            activity: activity,
            signature: signature
        };

       
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);

        // Only add location if the coordinates are valid numbers
        if (!isNaN(latitude) && !isNaN(longitude)) {
            newCheckInData.location = { lat: latitude, lng: longitude };
        }
        

        if (req.file) {
            newCheckInData.proof = `/uploads/proofs/${req.file.filename}`;
        } else if (proof_base64) {
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