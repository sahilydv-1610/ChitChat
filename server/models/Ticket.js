const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        subject: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["open", "closed", "resolved"],
            default: "open",
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium",
        },
        category: {
            type: String,
            enum: ["general", "technical", "billing", "feature"],
            default: "general"
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        feedback: {
            type: String
        },
        messages: [
            {
                sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                text: { type: String, required: true },
                createdAt: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model("Ticket", TicketSchema);
