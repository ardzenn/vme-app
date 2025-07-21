const express = require('express');
const multer = require('multer');
const { authMiddleware, roleMiddleware } = require('./auth');
const Hospital = require('../models/Hospital.js');
const Doctor = require('../models/Doctor.js');
const CheckIn = require('../models/CheckIn.js');

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.use(authMiddleware, roleMiddleware(['MSR', 'KAS']));

router.post('/', upload.single('proof'), async (req, res) => {
  const { hospitalName, doctorName, activity, lat, lng, signature, proof_base64 } = req.body;
  try {
    let hospital = await Hospital.findOne({ name: hospitalName, user: req.user.id });
    if (!hospital) {
      hospital = new Hospital({ name: hospitalName, user: req.user.id });
      await hospital.save();
    }

    let doctor = await Doctor.findOne({ name: doctorName, hospital: hospital._id, user: req.user.id });
    if (!doctor) {
      doctor = new Doctor({ name: doctorName, hospital: hospital._id, user: req.user.id });
      await doctor.save();
    }

    // ** UPDATED **: Handle both file upload and selfie data
    let proofData = null;
    if (req.file) {
      // Handle file upload
      proofData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    } else if (proof_base64) {
      // Handle selfie data from hidden input
      proofData = proof_base64;
    }

    const location = { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 };

    const checkin = new CheckIn({ 
      user: req.user.id, 
      hospital: hospital._id, 
      doctor: doctor._id, 
      proof: proofData, // Use the combined proof data
      activity, 
      signature,
      location 
    });
    await checkin.save();
    res.redirect('/dashboard');
  } catch (err) {
    console.error('CheckIn error:', err);
    res.status(400).send(err.message);
  }
});

module.exports = router;