const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const User = require('../models/User');

const upload = multer({ dest: 'temp-uploads/' });
exports.uploadCsv = upload.single('clientCsv');

exports.updateLocation = async (req, res) => {
    try {
        const { lat, lng } = req.body;
        if (lat && lng) {
            await User.findByIdAndUpdate(req.user.id, {
                lastLocation: {
                    type: 'Point',
                    coordinates: [lng, lat]
                },
                lastLocationUpdate: Date.now()
            });
            const io = req.app.get('io');
            const user = await User.findById(req.user.id).select('firstName lastName role lastLocation');
            io.emit('locationUpdate', user);
        }
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};

exports.addHospital = async (req, res) => {
    try {
        const { name } = req.body;
        const hospital = new Hospital({ name, createdBy: req.user.id });
        await hospital.save();
        // Always return JSON for the script to handle
        res.json({ success: true, message: 'Hospital added successfully!' });
    } catch (error) {
        res.status(400).json({ success: false, message: 'A hospital with this name may already exist in your list.' });
    }
};

exports.addDoctor = async (req, res) => {
    try {
        const { name, hospitalId } = req.body;
        const doctor = new Doctor({ name, hospital: hospitalId, createdBy: req.user.id });
        await doctor.save();
        // Always return JSON for the script to handle
        res.json({ success: true, message: 'Doctor added successfully!' });
    } catch (error) {
        res.status(400).json({ success: false, message: 'This doctor may already exist for the selected hospital.' });
    }
};

exports.deleteHospital = async (req, res) => {
    try {
        const hospital = await Hospital.findOne({ _id: req.params.id, createdBy: req.user.id });
        if (!hospital) {
            return res.status(404).json({ success: false, message: 'Hospital not found.' });
        }
        await Doctor.deleteMany({ hospital: req.params.id, createdBy: req.user.id });
        await hospital.deleteOne();
        res.json({ success: true });
    } catch(err){
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

exports.deleteDoctor = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ _id: req.params.id, createdBy: req.user.id });
        if (!doctor) {
            return res.status(404).json({ success: false, message: 'Doctor not found.' });
        }
        await doctor.deleteOne();
        res.json({ success: true });
    } catch(err){
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

exports.importClients = (req, res) => {
    if (!req.file) {
        req.flash('error_msg', 'Please upload a CSV file.');
        return res.redirect('/manage-entries');
    }

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv({ headers: ['Hospital', 'Doctor'], skipLines: 0 }))
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            fs.unlinkSync(req.file.path);
            let successCount = 0;
            let errorCount = 0;

            for (const row of results) {
                try {
                    const hospitalName = row.Hospital?.trim();
                    const doctorName = row.Doctor?.trim();

                    if (!hospitalName || !doctorName) {
                        errorCount++;
                        continue;
                    }

                    let hospital = await Hospital.findOneAndUpdate(
                        { name: hospitalName, createdBy: req.user.id },
                        { $setOnInsert: { name: hospitalName, createdBy: req.user.id } },
                        { upsert: true, new: true }
                    );

                    await Doctor.findOneAndUpdate(
                        { name: doctorName, hospital: hospital._id, createdBy: req.user.id },
                        { $setOnInsert: { name: doctorName, hospital: hospital._id, createdBy: req.user.id } },
                        { upsert: true }
                    );

                    successCount++;
                } catch (err) {
                    errorCount++;
                }
            }
            req.flash('success_msg', `${successCount} clients imported successfully. ${errorCount > 0 ? `${errorCount} rows failed or were duplicates.` : ''}`);
            res.redirect('/manage-entries');
        });
};