const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    maintenanceMode: { type: Boolean, default: false },
    allowRegistration: { type: Boolean, default: true },
    systemBanner: { type: String, default: "" },
    siteName: { type: String, default: "ChitChat" }
}, { timestamps: true });

module.exports = mongoose.model('Settings', SettingsSchema);
