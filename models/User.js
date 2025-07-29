const mongoose = require('mongoose');
const { Schema } = mongoose;
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  birthdate: { type: Date },
  area: { type: String, trim: true },
  address: { type: String, trim: true },
  role: { 
    type: String, 
    // ADDED: New roles
    enum: ['Pending', 'Admin', 'MSR', 'KAS', 'Accounting', 'Sales Manager', 'Inventory', 'IT'], 
    default: 'Pending' 
  },
  profilePicture: { 
    type: String, 
    default: '/images/default-profile.png'
  },
  lastLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
  },
  lastKnownAddress: { type: String, default: 'Location not yet available' },
  lastLocationUpdate: { type: Date },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  pushSubscription: { type: Object }
}, { timestamps: true });

userSchema.plugin(passportLocalMongoose, { usernameField: 'username' });

userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.hash;
  delete userObject.salt;
  delete userObject.password;
  return userObject;
}

module.exports = mongoose.models.User || mongoose.model('User', userSchema);