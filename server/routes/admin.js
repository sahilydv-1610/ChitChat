const router = require('express').Router();
const User = require('../models/User');
const AdminLog = require('../models/AdminLog');

// Middleware to check if admin
const isAdmin = async (req, res, next) => {
    // Ideally check JWT token here, assuming req.user is set by auth middleware
    // For now simple check
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(403).json("You are not allowed!");
    }
};

// Get User Stats
router.get("/stats", async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        // Add more stats as needed
        res.status(200).json({ users: userCount });
    } catch (err) {
        res.status(500).json(err);
    }
});

// Delete User
router.delete("/:id", async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json("User has been deleted...");
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get Admin Logs
router.get("/logs", async (req, res) => {
    try {
        const logs = await AdminLog.find().sort({ createdAt: -1 }).limit(50).populate('admin', 'name email');
        res.status(200).json(logs);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Create Admin Log (Internal or Frontend Trigger)
router.post("/log", async (req, res) => {
    try {
        const newLog = new AdminLog(req.body);
        await newLog.save();
        res.status(200).json(newLog);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
