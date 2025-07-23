const mongoose_Hospital = require('mongoose');
const { Schema: Schema_Hospital } = mongoose_Hospital;

const hospitalSchema = new Schema_Hospital({
  name: { type: String, required: true, unique: true, trim: true },
  address: { type: String, trim: true }
});

module.exports = mongoose_Hospital.models.Hospital || mongoose_Hospital.model('Hospital', hospitalSchema);