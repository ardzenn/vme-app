// in controllers/dailyReportController.js
const DailyReport = require('../models/DailyReport');
const CheckIn = require('../models/CheckIn');
const multer = require('multer');
const path = require('path');

// --- Multer Configuration for Multiple Report Attachments ---
const storage = multer.diskStorage({
    destination: './public/uploads/reports/',
    filename: function (req, file, cb) {
        cb(null, `report-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

exports.uploadAttachments = upload.array('attachments', 10); // Allows up to 10 images

// --- Controller Functions ---

// GET: Shows the report form, pre-filled with today's data
exports.getReportForm = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaysCheckIns = await CheckIn.find({ 
            user: req.user.id, 
            createdAt: { $gte: today } 
        }).populate('hospital doctor').sort({ createdAt: -1 });

        // Auto-populate data from check-ins
        const lastClient = todaysCheckIns[0] ? todaysCheckIns[0].hospital.name : '';
        const visitedCalls = todaysCheckIns.map(ci => ({
            hospital: ci.hospital.name,
            doctor: ci.doctor.name
        })).reverse(); // reverse to show in chronological order

        const uniqueHospitals = [...new Set(visitedCalls.map(call => call.hospital))];

        const prefilledData = {
            lastClientVisited: lastClient,
            visitedCalls: visitedCalls,
            callSummary: {
                hospitals: uniqueHospitals.length,
                mds: visitedCalls.length,
            }
        };

        res.render('report-form', { prefilledData });
    } catch (err) {
        console.error("Error getting report form:", err);
        req.flash('error_msg', 'Could not load report form.');
        res.redirect('/dashboard');
    }
};

// POST: Submits the report
exports.submitReport = async (req, res) => {
    try {
        const {
            lastClientVisited,
            accomplishments,
            pharmacists,
            accountingStaff,
            sales,
            collectionsCurrent,
            collectionsOverdue,
            meal,
            transportation,
            toll,
            parking,
            lodging
        } = req.body;

        // Process visited calls which are submitted as arrays
        const visitedCalls = req.body.hospitals.map((hospital, index) => ({
            hospital: hospital,
            doctor: req.body.doctors[index]
        }));

        const newReport = new DailyReport({
            user: req.user.id,
            lastClientVisited,
            visitedCalls,
            callSummary: {
                hospitals: [...new Set(req.body.hospitals)].length,
                mds: req.body.doctors.length,
                pharmacists: pharmacists,
                accountingStaff: accountingStaff,
            },
            accomplishments,
            dailySales: sales ? Object.values(sales) : [],
            dailyCollections: {
                current: collectionsCurrent,
                overdue: collectionsOverdue
            },
            expenses: { meal, transportation, toll, parking, lodging },
            attachments: req.files ? req.files.map(file => `/uploads/reports/${file.filename}`) : []
        });

        await newReport.save();
        req.flash('success_msg', 'Daily report submitted successfully!');
        res.redirect('/dashboard');
    } catch (err) {
        console.error("Error submitting report:", err);
        req.flash('error_msg', 'Failed to submit report.');
        res.redirect('/report');
    }
};

// GET: Shows list of all reports for Admin/Accounting
exports.listReports = async (req, res) => {
    try {
        const reports = await DailyReport.find().populate('user', 'firstName lastName').sort({ reportDate: -1 });
        res.render('report-history', { reports });
    } catch (err) {
        console.error("Error listing reports:", err);
        req.flash('error_msg', 'Could not load report history.');
        res.redirect('/admin-dashboard'); // Or accounting-dashboard
    }
};

// GET: Shows one specific report in detail
exports.getReportDetails = async (req, res) => {
    try {
        const report = await DailyReport.findById(req.params.id).populate('user');
        if (!report) {
            req.flash('error_msg', 'Report not found.');
            return res.redirect('/report/history');
        }
        res.render('report-detail', { report });
    } catch (err) {
        console.error("Error getting report details:", err);
        req.flash('error_msg', 'Could not load the report.');
        res.redirect('/report/history');
    }
};