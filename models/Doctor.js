const mongoose_Doctor = require('mongoose');
const { Schema: Schema_Doctor } = mongoose_Doctor;

const doctorSchema = new Schema_Doctor({
  name: { type: String, required: true, trim: true },
  specialty: { type: String, trim: true },
  hospital: { type: Schema_Doctor.Types.ObjectId, ref: 'Hospital', required: true },
  createdBy: { type: Schema_Doctor.Types.ObjectId, ref: 'User', default: null }
});

doctorSchema.index({ name: 1, hospital: 1 }, { unique: true });

module.exports = mongoose_Doctor.models.Doctor || mongoose_Doctor.model('Doctor', doctorSchema);