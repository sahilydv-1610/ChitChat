const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional if using only Google
    googleId: { type: String },
    avatar: { type: String, default: "" },
    avatarColor: { type: String, default: "" }, // Store Tailwind bg class or hex
    bio: { type: String, default: "Hey there! I am using ChitChat." },
    location: { type: String, default: "" },
    privacy: {
        lastSeen: { type: Boolean, default: true },
        readReceipts: { type: Boolean, default: true }
    },
    themePreference: {
        theme: { type: String, default: 'light' },
        colorTheme: { type: String, default: 'violet' }
    },
    dob: { type: Date },
    mobile: { type: String },
    socials: {
        instagram: { type: String, default: "" },
        twitter: { type: String, default: "" },
        linkedin: { type: String, default: "" }
    },
    address: {
        village: { type: String, default: "" },
        city: { type: String, default: "" },
        tehsil: { type: String, default: "" },
        district: { type: String, default: "" },
        state: { type: String, default: "" },
        country: { type: String, default: "" },
        pincode: { type: String, default: "" }
    },
    activeHistory: {
        type: [Date],
        default: [],
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    isBanned: {
        type: Boolean,
        default: false
    },
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
},
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
