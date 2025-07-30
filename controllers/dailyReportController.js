const DailyReport = require('../models/DailyReport');
const CheckIn = require('../models/CheckIn');
const DailyPlan = require('../models/DailyPlan');
const User = require('../models/User');
const { Parser } = require('json2csv');
const { sendNotificationToAdmins } = require('./pushController');
const { createNotificationsForGroup, getAdminAndITIds } = require('../services/notificationService');
const upload = require('../config/cloudinary');

exports.uploadReportAttachments = upload.fields([
    { name: 'attachments', maxCount: 10 },
    { name: 'endingOdometerPhoto', maxCount: 1 }
]);

exports.getReportForm = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const plan = await DailyPlan.findOne({ user: req.user.id, planDate: today });
        const todaysCheckIns = await CheckIn.find({ 
            user: req.user.id, 
            createdAt: { $gte: today } 
        }).populate('hospital doctor').sort({ createdAt: -1 });

        const lastClient = todaysCheckIns[0] ? (todaysCheckIns[0].hospital ? todaysCheckIns[0].hospital.name : '') : '';
        const visitedCalls = todaysCheckIns.map(ci => ({
            hospital: ci.hospital ? ci.hospital.name : 'N/A',
            doctor: ci.doctor ? ci.doctor.name : 'N/A'
        })).reverse();
        const uniqueHospitals = [...new Set(visitedCalls.map(call => call.hospital))];
        const prefilledData = {
            lastClientVisited: lastClient,
            visitedCalls: visitedCalls,
            callSummary: {
                hospitals: uniqueHospitals.length,
                mds: visitedCalls.length,
            }
        };
        res.render('report-form', { 
            prefilledData, 
            startingOdometer: plan ? plan.startingOdometer : '' 
        });
    } catch (err) {
        console.error("Error loading report form:", err);
        req.flash('error_msg', 'Could not load the report form.');
        res.redirect('/dashboard');
    }
};

exports.submitReport = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch the Daily Plan again to get a reliable starting odometer
        const plan = await DailyPlan.findOne({ user: req.user.id, planDate: today });
        const startingOdometer = plan ? plan.startingOdometer : 0;

        const {
            lastClientVisited, accomplishments, pharmacists, accountingStaff, sales,
            collectionsCurrent, collectionsOverdue, meal, transportation, toll, parking, lodging,
            mtdNotes, endingOdometer, endingOdometerNote,
        } = req.body;

        const endingOdometerNum = endingOdometer ? Number(endingOdometer) : 0;
        const totalKmReading = (endingOdometerNum >= startingOdometer) ? endingOdometerNum - startingOdometer : 0;

        const newReportData = {
            user: req.user.id,
            lastClientVisited,
            visitedCalls: req.body.hospitals    
                ? req.body.hospitals.map((h, i) => ({
                    hospital: h,
                    doctor: req.body.doctors[i]
                }))
                : [],
            callSummary: {
                hospitals: req.body.hospitals
                    ? [...new Set(req.body.hospitals)].length
                    : 0,
                mds: req.body.doctors ? req.body.doctors.length : 0,
                pharmacists,
                accountingStaff
            },
            accomplishments,
            dailySales: sales ? Object.values(sales) : [],
            dailyCollections: {
                current: collectionsCurrent,
                overdue: collectionsOverdue
            },
            expenses: {
                meal,
                transportation,
                toll,
                parking,
                lodging
            },
            attachments:
                req.files && req.files['attachments']
                    ? req.files['attachments'].map((file) => file.path)
                    : [],
            mtdNotes,
            startingOdometer,
            endingOdometer: endingOdometerNum,
            endingOdometerPhoto:
                req.files && req.files['endingOdometerPhoto']
                    ? req.files['endingOdometerPhoto'][0].path
                    : undefined,
            endingOdometerNote,
            totalKmReading: totalKmReading
        };

        const newReport = new DailyReport(newReportData);
        await newReport.save();

        const io = req.app.get('io');
        const adminIds = await getAdminAndITIds();
        await createNotificationsForGroup(io, {
            recipients: adminIds,
            sender: req.user.id,
            type: 'NEW_REPORT',
            message: `${req.user.firstName} ${req.user.lastName} submitted their End of Day Report.`,
            link: `/report/${newReport._id}`
        });

        const payload = {
            title: 'New Daily Report Submitted',
            body: `A new report was submitted by ${req.user.firstName} ${req.user.lastName}.`,
            url: `/report/${newReport._id}`
        };
        sendNotificationToAdmins(payload);

        req.flash('success_msg', 'Daily report submitted successfully!');
        res.redirect('/dashboard');
    } catch (err) {
        console.error("Error submitting report:", err);
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