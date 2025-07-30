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

        const lastClient = todaysCheckIns[0]?.hospital?.name || '';
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

        const plan = await DailyPlan.findOne({ user: req.user.id, planDate: today });
        let startingOdometer = plan?.startingOdometer || Number(req.body.startingOdometer) || 0;

        const {
            lastClientVisited, accomplishments, pharmacists, accountingStaff, sales,
            collectionsCurrent, collectionsOverdue, meal, transportation, toll, parking, lodging,
            mtdNotes, endingOdometer, endingOdometerNote
        } = req.body;

        const endingOdometerNum = Number(endingOdometer) || 0;
        const totalKmReading = endingOdometerNum >= startingOdometer
            ? endingOdometerNum - startingOdometer
            : 0;

        const newReportData = {
            user: req.user.id,
            lastClientVisited,
            visitedCalls: req.body.hospitals?.map((h, i) => ({
                hospital: h,
                doctor: req.body.doctors[i]
            })) || [],
            callSummary: {
                hospitals: req.body.hospitals
                    ? [...new Set(req.body.hospitals)].length
                    : 0,
                mds: req.body.doctors?.length || 0,
                pharmacists,
                accountingStaff
            },
            accomplishments,
            dailySales: sales ? Object.values(sales) : [],
            dailyCollections: {
                current: collectionsCurrent,
                overdue: collectionsOverdue
            },
            expenses: { meal, transportation, toll, parking, lodging },
            attachments: req.files?.['attachments']?.map(f => f.path) || [],
            mtdNotes,
            startingOdometer,
            endingOdometer: endingOdometerNum,
            endingOdometerPhoto: req.files?.['endingOdometerPhoto']?.[0]?.path,
            endingOdometerNote,
            totalKmReading
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

        sendNotificationToAdmins({
            title: 'New Daily Report Submitted',
            body: `A new report was submitted by ${req.user.firstName} ${req.user.lastName}.`,
            url: `/report/${newReport._id}`
        });

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
        const reports = await DailyReport.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.render('report-history', { reports });
    } catch (err) {
        console.error('Error listing reports:', err);
        req.flash('error_msg', 'Unable to fetch report history.');
        res.redirect('/dashboard');
    }
};

exports.getReportDetails = async (req, res) => {
    try {
        const report = await DailyReport.findById(req.params.id).populate('user');
        if (!report) {
            req.flash('error_msg', 'Report not found.');
            return res.redirect('/dashboard');
        }
        res.render('report-detail', { report });
    } catch (err) {
        console.error('Error fetching report details:', err);
        req.flash('error_msg', 'Failed to load report details.');
        res.redirect('/dashboard');
    }
};

exports.getDailyCheckInReport = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const checkIns = await CheckIn.find({
            createdAt: { $gte: today, $lt: tomorrow }
        }).populate('user');

        res.render('daily-checkins', { checkIns });
    } catch (err) {
        console.error('Error fetching check-in report:', err);
        req.flash('error_msg', 'Failed to load check-in report.');
        res.redirect('/dashboard');
    }
};

exports.exportDailyCheckInReport = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const checkIns = await CheckIn.find({
            createdAt: { $gte: today, $lt: tomorrow }
        }).populate('user');

        const data = checkIns.map(ci => ({
            name: `${ci.user?.firstName || ''} ${ci.user?.lastName || ''}`,
            hospital: ci.hospitalName,
            doctor: ci.doctorName,
            location: ci.address,
            time: ci.createdAt.toLocaleString('en-PH')
        }));

        const parser = new Parser();
        const csv = parser.parse(data);

        res.header('Content-Type', 'text/csv');
        res.attachment(`daily-checkins-${today.toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (err) {
        console.error('Error exporting check-in report:', err);
        req.flash('error_msg', 'Failed to export check-in report.');
        res.redirect('/dashboard');
    }
};
