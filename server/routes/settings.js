const router = require('express').Router();
const Settings = require('../models/Settings');

// Get Settings (Create defaults if not exists)
router.get('/', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
            await settings.save();
        }
        res.status(200).json(settings);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Update Settings
router.put('/', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings();
        }

        // Update fields
        if (req.body.maintenanceMode !== undefined) settings.maintenanceMode = req.body.maintenanceMode;
        if (req.body.allowRegistration !== undefined) settings.allowRegistration = req.body.allowRegistration;
        if (req.body.systemBanner !== undefined) settings.systemBanner = req.body.systemBanner;
        if (req.body.siteName !== undefined) settings.siteName = req.body.siteName;

        const updatedSettings = await settings.save();
        res.status(200).json(updatedSettings);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
