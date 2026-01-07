const router = require('express').Router();
const Call = require('../models/Call');

// Create Call Log
router.post('/', async (req, res) => {
    const newCall = new Call(req.body);
    try {
        const savedCall = await newCall.save();
        res.status(200).json(savedCall);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get All Calls (Admin)
router.get('/all', async (req, res) => {
    try {
        const calls = await Call.find()
            .populate("caller", "name avatar")
            .populate("receiver", "name avatar")
            .sort({ createdAt: -1 });
        res.status(200).json(calls);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get Call History for a User
router.get('/:userId', async (req, res) => {
    try {
        const calls = await Call.find({
            $or: [{ caller: req.params.userId }, { receiver: req.params.userId }]
        }).populate("caller", "name avatar").populate("receiver", "name avatar").sort({ createdAt: -1 });
        res.status(200).json(calls);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
