const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: { type: String }, // Can be room ID or combination of user IDs
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // For 1-on-1
    text: { type: String },
    type: { type: String, default: 'text', enum: ['text', 'image', 'video', 'file', 'call_missed', 'call_ended', 'gif'] },
    mediaUrl: { type: String },
    isRead: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
