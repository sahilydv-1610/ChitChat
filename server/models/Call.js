const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
    caller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    duration: { type: Number, default: 0 }, // in seconds
    status: { type: String, enum: ['missed', 'completed', 'rejected'], default: 'completed' },
    type: { type: String, enum: ['audio', 'video'], default: 'video' },
}, { timestamps: true });

module.exports = mongoose.model('Call', callSchema);
