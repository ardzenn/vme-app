const CheckIn = require('../models/CheckIn');
const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const upload = require('../config/cloudinary'); // Use our powerful Cloudinary uploader

// This middleware is specifically designed to handle MULTIPLE files ('proof' and 'signature')
exports.uploadCheckInImages = upload.fields([
    { name: 'proof', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
]);

// This is the main function to create the check-in
exports.createCheckIn = async (req, res) => {
    try {
        const { hospitalName, doctorName, activity, notes, lat, lng } = req.body;

        // --- Robust validation check ---
        if (!hospitalName || !doctorName || !activity) {
            req.flash('error_msg', 'Hospital, Doctor, and Activity are all required fields.');
            return res.redirect('/dashboard');
        }

        // Find or create the hospital
        let hospital = await Hospital.findOne({ name: hospitalName.trim() });
        if (!hospital) {
            hospital = new Hospital({ name: hospitalName.trim(), createdBy: req.user.id });
            await hospital.save();
        }

        // Find or create the doctor, linked to the hospital
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

        // If files were uploaded to Cloudinary, save their secure URLs
        // We now look in req.files (plural) instead of req.file
        if (req.files) {
            if (req.files.proof) {
                newCheckInData.proof = req.files.proof[0].path;
            }
            if (req.files.signature) {
                newCheckInData.signature = req.files.signature[0].path;
            }
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
        res.render('checkin-history', { checkIns }); // Render a view or send JSON
    } catch (err) {
        console.error("Get check-ins error:", err);
        req.flash('error_msg', 'Failed to load check-ins.');
        res.redirect('/dashboard');
    }
};