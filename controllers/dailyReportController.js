const DailyReport = require('../models/DailyReport');
const CheckIn = require('../models/CheckIn');
const DailyPlan = require('../models/DailyPlan');
const User = require('../models/User');
const { Parser } = require('json2csv');
const { sendNotificationToAdmins } = require('./pushController');
const { createNotificationsForGroup, getAdminAndITIds } = require('../services/notificationService');
const upload = require('../config/cloudinary');

exports.uploadAttachments = upload.array('attachments', 10);

// Add middleware for ending odometer photo
exports.uploadReportAttachments = upload.fields([
    { name: 'attachments', maxCount: 10 },
    { name: 'endingOdometerPhoto', maxCount: 1 }
]);



exports.getReportForm = async (req, res) => {
    try {
        // ... your existing code ...
        // Get today's DailyPlan for startingOdometer
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const plan = await require('../models/DailyPlan').findOne({ user: req.user.id, planDate: today });
        const startingOdometer = plan?.startingOdometer ?? '';
        res.render('report-form', { prefilledData, startingOdometer });
    } catch (err) {
        req.flash('error_msg', 'Could not load report form.');
        res.redirect('/dashboard');
    }
};

exports.submitReport = async (req, res) => {
    try {
        const {
            lastClientVisited, accomplishments, pharmacists, accountingStaff, sales,
            collectionsCurrent, collectionsOverdue, meal, transportation, toll, parking, lodging,
            mtdNotes, startingOdometer, endingOdometer, endingOdometerNote
        } = req.body;

        let endingOdometerPhoto = '';
        if (req.files && req.files['endingOdometerPhoto'] && req.files['endingOdometerPhoto'][0]) {
            endingOdometerPhoto = req.files['endingOdometerPhoto'][0].path;
        }

        // Compute total km
        let totalKmReading = (startingOdometer && endingOdometer)
            ? (Number(endingOdometer) - Number(startingOdometer))
            : undefined;

        const visitedCalls = req.body.hospitals.map((hospital, index) => ({
            hospital: hospital,
            doctor: req.body.doctors[index]
        }));

        const newReport = new DailyReport({
            user: req.user.id, lastClientVisited, visitedCalls,
            callSummary: {
                hospitals: [...new Set(req.body.hospitals)].length,
                mds: req.body.doctors.length,
                pharmacists,
                accountingStaff,
            },
            accomplishments,
            dailySales: sales ? Object.values(sales) : [],
            dailyCollections: {
                current: collectionsCurrent,
                overdue: collectionsOverdue
            },
            expenses: { meal, transportation, toll, parking, lodging },
            attachments: req.files && req.files['attachments']
                ? req.files['attachments'].map(file => file.path)
                : [],
            mtdNotes,
            startingOdometer: startingOdometer ? Number(startingOdometer) : undefined,
            endingOdometer: endingOdometer ? Number(endingOdometer) : undefined,
            endingOdometerPhoto,
            endingOdometerNote,
            totalKmReading
        });
        await newReport.save();

        // --- Create In-App Notification ---
        const io = req.app.get('io');
        const adminIds = await getAdminAndITIds();
        const notificationText = `${req.user.firstName} ${req.user.lastName} submitted their End of Day Report.`;
        const notificationLink = `/report/${newReport._id}`;
        await createNotificationsForGroup(io, adminIds, notificationText, notificationLink);

        // --- Send Push Notification ---
        const payload = {
            title: 'New Daily Report Submitted',
            body: `A new "Last Call" report was submitted by ${req.user.firstName} ${req.user.lastName}.`,
            url: `/report/${newReport._id}`
        };
        sendNotificationToAdmins(payload);

        req.flash('success_msg', 'Daily report submitted successfully!');
        res.redirect('/dashboard');
    } catch (err) {
        req.flash('error_msg', 'Failed to submit report.');
        res.redirect('/report');
    }
};

exports.listReports = async (req, res) => {
    try {
        const reports = await DailyReport.find().populate('user', 'firstName lastName').sort({ reportDate: -1 });
        res.render('report-history', { reports });
    } catch (err) {
        req.flash('error_msg', 'Could not load report history.');
        res.redirect('/admin-dashboard');
    }
};

exports.getDailyCheckInReport = async (req, res) => {
    try {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const startDate = req.query.startDate ? new Date(req.query.startDate) : yesterday;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : today;
        const userId = req.query.userId;
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        const filter = { createdAt: { $gte: startDate, $lte: endDate } };
        if (userId) filter.user = userId;
        const users = await User.find({ role: { $in: ['MSR', 'KAS'] } }).sort({ firstName: 1 });
        const checkIns = await CheckIn.find(filter)
            .populate('user', 'firstName lastName')
            .populate('hospital', 'name')
            .populate('doctor', 'name')
            .sort({ createdAt: -1 });
        res.render('daily-checkin-report', {
            checkIns,
            users,
            filters: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                userId: userId || ''
            }
        });
    } catch (err) {
        req.flash('error_msg', 'Could not load the daily check-in report.');
        res.redirect('/admin-dashboard');
    }
};

exports.exportDailyCheckInReport = async (req, res) => {
    try {
        const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(0);
        const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
        const userId = req.query.userId;
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        const filter = { createdAt: { $gte: startDate, $lte: endDate } };
        if (userId) filter.user = userId;
        const checkIns = await CheckIn.find(filter)
            .populate('user', 'firstName lastName')
            .populate('hospital', 'name')
            .populate('doctor', 'name')
            .sort({ createdAt: -1 });
        const fields = [
            { label: 'User', value: 'user' }, { label: 'Date', value: 'date' }, { label: 'Time', value: 'time' },
            { label: 'Hospital', value: 'hospital' }, { label: 'Doctor', value: 'doctor' }, { label: 'Activity', value: 'activity' },
            { label: 'Proof URL', value: 'proof' }, { label: 'Signature URL', value: 'signature' }
        ];
        const data = checkIns.map(checkin => ({
            user: checkin.user ? `${checkin.user.firstName} ${checkin.user.lastName}` : 'N/A',
            date: new Date(checkin.createdAt).toLocaleDateString(),
            time: new Date(checkin.createdAt).toLocaleTimeString(),
            hospital: checkin.hospital ? checkin.hospital.name : 'N/A',
            doctor: checkin.doctor ? checkin.doctor.name : 'N/A',
            activity: checkin.activity || '',
            proof: checkin.proof || '',
            signature: checkin.signature || ''
        }));
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(data);
        res.header('Content-Type', 'text/csv');
        res.attachment(`daily-check-in-report-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (err) {
        console.error("Error exporting daily check-in report:", err);
        res.status(500).send("Error generating report");
    }
};

exports.getReportDetails = async (req, res) => {
    try {
        const report = await DailyReport.findById(req.params.id).populate('user');
        if (!report) {
            req.flash('error_msg', 'Report not found.');
            return res.redirect('/report/history');
        }
        res.render('report-detail', { report });
    } catch (err) {
        req.flash('error_msg', 'Could not load the report.');
        res.redirect('/report/history');
    }
};