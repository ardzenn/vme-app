const Hospital = require('../models/Hospital');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Conversation = require('../models/Conversation'); // Added
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const upload = multer({ dest: 'temp-uploads/' });
exports.uploadCsv = upload.single('clientCsv');

// ADDED: New function to create a support chat
exports.createSupportChat = async (req, res) => {
    try {
        const requestingUser = req.user;

        // Find all users with the IT role
        const itUsers = await User.find({ role: 'IT' }).select('_id');
        if (itUsers.length === 0) {
            return res.status(404).json({ success: false, message: 'No IT support staff are available.' });
        }

        const itUserIds = itUsers.map(user => user._id);
        const participants = [requestingUser._id, ...itUserIds];

        // Create a new group conversation for this support request
        const newConversation = new Conversation({
            participants,
            isGroup: true,
            groupName: `Support: ${requestingUser.firstName} ${requestingUser.lastName}`,
            groupAdmin: requestingUser._id
        });

        await newConversation.save();
        
        // Populate participants' details for the frontend
        const populatedConvo = await Conversation.findById(newConversation._id).populate('participants');

        // Notify all IT users in real-time that a new support chat has been created
        const io = req.app.get('io');
        itUserIds.forEach(id => {
            io.to(id.toString()).emit('newConversation', populatedConvo);
        });

        res.status(201).json({ success: true, conversation: populatedConvo });
    } catch (error) {
        console.error("Error creating support chat:", error);
        res.status(500).json({ success: false, message: 'Could not create support chat.' });
    }
};



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

        // ** FIX: Return the new hospital object in the JSON response **
        res.json({ success: true, message: 'Hospital added successfully!', hospital: hospital });
    } catch (error) {
        res.status(400).json({ success: false, message: 'A hospital with this name may already exist in your list.' });
    }
};

exports.addDoctor = async (req, res) => {
    try {
        const { name, hospitalId } = req.body;
        const doctor = new Doctor({ name, hospital: hospitalId, createdBy: req.user.id });
        await doctor.save();

        // ** FIX: Return the new doctor object in the JSON response **
        res.json({ success: true, message: 'Doctor added successfully!', doctor: doctor });
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