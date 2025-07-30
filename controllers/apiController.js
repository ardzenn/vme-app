const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const upload = multer({ dest: 'temp-uploads/' });
exports.uploadCsv = upload.single('clientCsv');

exports.updateLocation = async (req, res) => {
    try {
        const { lat, lng } = req.body;
        if (lat && lng) {
            await User.findByIdAndUpdate(req.user.id, {
                lastLocation: { type: 'Point', coordinates: [lng, lat] },
                lastLocationUpdate: Date.now()
            });
            const io = req.app.get('io');
            const user = await User.findById(req.user.id).select('firstName lastName role lastLocation');
            io.emit('locationUpdate', user);
        }
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

exports.addHospital = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'Hospital name cannot be empty.' });
        }
        const hospital = new Hospital({ name, createdBy: req.user.id });
        await hospital.save();
        
        res.status(201).json({ success: true, hospital: hospital });
    } catch (error) {
        const errorMessage = 'A hospital with this name may already exist in your list.';
        res.status(400).json({ success: false, message: errorMessage });
    }
};

exports.addDoctor = async (req, res) => {
    try {
        const { name, hospitalId } = req.body;
        if (!name || name.trim() === '' || !hospitalId) {
            return res.status(400).json({ success: false, message: 'Doctor name and hospital are required.' });
        }
        const doctor = new Doctor({ name, hospital: hospitalId, createdBy: req.user.id });
        await doctor.save();

        const populatedDoctor = await Doctor.findById(doctor._id).populate('hospital');

        res.status(201).json({ success: true, doctor: populatedDoctor });
    } catch (error) {
        const errorMessage = 'This doctor may already exist for the selected hospital.';
        res.status(400).json({ success: false, message: errorMessage });
    }
};

exports.deleteHospital = async (req, res) => {
    try {
        await Doctor.deleteMany({ hospital: req.params.id, createdBy: req.user.id });
        await Hospital.deleteOne({ _id: req.params.id, createdBy: req.user.id });
        res.json({ success: true });
    } catch(err){
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

exports.deleteDoctor = async (req, res) => {
    try {
        await Doctor.deleteOne({ _id: req.params.id, createdBy: req.user.id });
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
            req.flash('success_msg', `${successCount} clients imported. ${errorCount > 0 ? `${errorCount} failed.` : ''}`);
            res.redirect('/manage-entries');
        });
};