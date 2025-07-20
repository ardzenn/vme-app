const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { authMiddleware, roleMiddleware } = require('./auth');
const Hospital = require('../models/Hospital.js');
const Doctor = require('../models/Doctor.js');
const CheckIn = require('../models/CheckIn.js');

const router = express.Router();

router.use(authMiddleware, roleMiddleware(['MSR', 'KAS']));

router.post('/', upload.single('proof'), async (req, res) => {
  const { hospitalName, doctorName, activity, lat, lng } = req.body;
  try {
    if (!hospitalName) throw new Error('Hospital name required');
    let hospital = await Hospital.findOne({ name: hospitalName, user: req.user.id });
    if (!hospital) {
      hospital = new Hospital({ name: hospitalName, user: req.user.id });
      await hospital.save();
    }

    if (!doctorName) throw new Error('Doctor name required');
    let doctor = await Doctor.findOne({ name: doctorName, hospital: hospital._id, user: req.user.id });
    if (!doctor) {
      doctor = new Doctor({ name: doctorName, hospital: hospital._id, user: req.user.id });
      await doctor.save();
    }

    if (!activity) throw new Error('Activity required');

    const proof = req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}` : null; // Save as base64
    const location = { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 };

    const checkin = new CheckIn({ user: req.user.id, hospital: hospital._id, doctor: doctor._id, proof, activity, location });
    await checkin.save();
    res.redirect('/dashboard');
  } catch (err) {
    console.error('CheckIn error:', err);
    res.status(400).send(err.message);
  }
});

module.exports = router;