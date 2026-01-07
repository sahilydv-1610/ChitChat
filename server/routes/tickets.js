const router = require("express").Router();
const Ticket = require("../models/Ticket");
const User = require("../models/User");

// Create a new ticket
router.post("/", async (req, res) => {
    try {
        const { userId, subject, description, priority, category } = req.body;
        const newTicket = new Ticket({
            user: userId,
            subject,
            description,
            priority,
            category,
            status: "open",
            messages: [{ sender: userId, text: description }] // Initial description as first message
        });
        const savedTicket = await newTicket.save();
        res.status(200).json(savedTicket);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get tickets (Admin gets all, User gets theirs)
router.get("/", async (req, res) => {
    const userId = req.query.userId;
    const isAdmin = req.query.isAdmin === 'true';

    try {
        let tickets;
        if (isAdmin) {
            tickets = await Ticket.find().populate("user", "name email mobile").sort({ createdAt: -1 });
        } else {
            tickets = await Ticket.find({ user: userId }).sort({ createdAt: -1 });
        }
        res.status(200).json(tickets);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get a specific ticket
router.get("/:id", async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id)
            .populate("user", "name email")
            .populate("messages.sender", "name email");
        res.status(200).json(ticket);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Add message to ticket
router.post("/:id/message", async (req, res) => {
    try {
        const { senderId, text } = req.body;
        const ticket = await Ticket.findById(req.params.id);

        ticket.messages.push({
            sender: senderId,
            text,
            createdAt: new Date()
        });

        // If admin replies, maybe set status to resolved? Or keep open.
        // If user replies, maybe reopen if closed?
        // simple logic: If ticket is closed and user replies, reopen it.
        if (ticket.status === 'closed' && senderId === ticket.user.toString()) {
            ticket.status = 'open';
        }

        await ticket.save();

        // Return the populated ticket or just the new message
        // Better to return the updated ticket messages
        const updatedTicket = await Ticket.findById(req.params.id)
            .populate("user", "name email")
            .populate("messages.sender", "name email");

        res.status(200).json(updatedTicket);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Update ticket status
router.put("/:id/status", async (req, res) => {
    try {
        const { status } = req.body;
        const ticket = await Ticket.findByIdAndUpdate(
            req.params.id,
            { $set: { status } },
            { new: true }
        );
        res.status(200).json(ticket);
    } catch (err) {
        res.status(500).json(err);
    }
});



// Add feedback/rating to ticket
router.put("/:id/feedback", async (req, res) => {
    try {
        const { rating, feedback } = req.body;
        const ticket = await Ticket.findByIdAndUpdate(
            req.params.id,
            { $set: { rating, feedback } },
            { new: true }
        );
        res.status(200).json(ticket);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
