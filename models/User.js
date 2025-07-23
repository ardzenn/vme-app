const mongoose_User = require('mongoose');
const { Schema: Schema_User } = mongoose_User; 
const passportLocalMongoose_User = require('passport-local-mongoose');

const userSchema = new Schema_User({
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

userSchema.plugin(passportLocalMongoose_User);

module.exports = mongoose_User.models.User || mongoose_User.model('User', userSchema);