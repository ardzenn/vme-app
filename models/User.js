const mongoose = require('mongoose');
const { Schema } = mongoose;
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema({
  // username (email) and password (hash/salt) are handled by passport-local-mongoose
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  birthdate: { type: Date },
  area: { type: String, trim: true },
  address: { type: String, trim: true },
  role: { 
    type: String, 
    enum: ['Pending', 'Admin', 'MSR', 'KAS', 'Accounting'], 
    default: 'Pending' 
  },
  profilePicture: { 
    type: String, 
    default: '/images/default-profile.png'
  },
  lastLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  lastLocationUpdate: { type: Date },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }
}, { timestamps: true });

// This plugin adds all the necessary fields and methods for authentication
userSchema.plugin(passportLocalMongoose, { usernameField: 'username' });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
