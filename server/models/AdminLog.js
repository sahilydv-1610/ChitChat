const mongoose = require('mongoose');

const AdminLogSchema = new mongoose.Schema({
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true
    },
    target: {
        type: String, // e.g., "User: Sahil", "Ticket: #1234"
        required: true
    },
    details: {
        type: Object, // Extra snapshot data
        default: {}
    },
    ip: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('AdminLog', AdminLogSchema);
