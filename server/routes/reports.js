const router = require('express').Router();
const Report = require('../models/Report');
const User = require('../models/User');

// Create a report
router.post('/', async (req, res) => {
    try {
        console.log("Creating report:", req.body);
        const newReport = new Report(req.body);
        const savedReport = await newReport.save();
        console.log("Report saved:", savedReport);
        res.status(200).json(savedReport);
    } catch (err) {
        console.error("Error creating report:", err);
        res.status(500).json(err);
    }
});

// Resolve a report (Approve/Dismiss)
router.put('/:id/resolve', async (req, res) => {
    try {
        const { status } = req.body; // 'resolved' or 'dismissed'
        const reportId = req.params.id;

        const report = await Report.findById(reportId);
        if (!report) return res.status(404).json("Report not found");

        report.status = status;
        await report.save();

        if (status === 'resolved') {
            // Ban the user
            await User.findByIdAndUpdate(report.reportedUser, { isBanned: true });
        }

        res.status(200).json({ message: "Report updated", report });
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get all reports (Admin only - basic check for now, can be enhanced)
router.get('/', async (req, res) => {
    try {
        console.log("Fetching all reports...");
        // ideally check req.user.isAdmin here via middleware
        const reports = await Report.find()
            .populate('reporter', 'name email')
            .populate('reportedUser', 'name email');
        console.log("Reports fetched:", reports.length);
        res.status(200).json(reports);
    } catch (err) {
        console.error("Error fetching reports:", err);
        res.status(500).json(err);
    }
});

module.exports = router;
