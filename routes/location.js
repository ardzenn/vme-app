const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { ensureAuthenticated } = require('../middleware/auth');

router.post('/update', ensureAuthenticated, async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;

    const updatedUser = await User.findByIdAndUpdate(req.user._id, {
      lastLocation: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      lastKnownAddress: address || 'Unknown location',
      lastLocationUpdate: new Date()
    }, { new: true });

    // Emit to dashboard/admins
    const io = req.app.get('io');
    if (io) {
      io.emit('locationUpdate', {
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        lastLocation: updatedUser.lastLocation,
        lastKnownAddress: updatedUser.lastKnownAddress,
        lastLocationUpdate: updatedUser.lastLocationUpdate
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Failed to update location:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
