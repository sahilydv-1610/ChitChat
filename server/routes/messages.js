const router = require('express').Router();
const Message = require('../models/Message');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Upload File Route
router.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json("No file uploaded");
        }
        // Normalize path separators to forward slashes for URL
        const fileUrl = `/uploads/${req.file.filename}`;
        res.status(200).json({ url: fileUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

// Add Message
router.post('/', async (req, res) => {
    try {
        // Check for blocking
        // 1. Check if Receiver has blocked Sender
        // 2. Check if Sender has blocked Receiver (optional logic, but usually we just block sending)

        // We need to fetch the receiver's blocked list. 
        // We assume req.body has sender and receiver (or conversationId, but we need userIds). 
        // The message model creates `sender` and `receiver` fields?
        // Let's check the Message model schema quickly or assume standard.
        // Wait, the client sends: { sender: user._id, receiver: currentChat._id, text: ... } in Messenger.js line 125.

        const MessageIndex = require('../models/User'); // Need User model to check blocks

        // Optimize: verify sender/receiver exist in body
        if (!req.body.sender || !req.body.receiver) {
            const newMessage = new Message(req.body);
            const savedMessage = await newMessage.save();
            return res.status(200).json(savedMessage);
        }

        const receiverUser = await MessageIndex.findById(req.body.receiver);
        const senderUser = await MessageIndex.findById(req.body.sender);

        if (receiverUser?.blockedUsers?.includes(req.body.sender)) {
            return res.status(403).json("You cannot send messages to this user (Blocked).");
        }

        if (senderUser?.blockedUsers?.includes(req.body.receiver)) {
            return res.status(403).json("Unblock this user to send messages.");
        }

        const newMessage = new Message(req.body);
        const savedMessage = await newMessage.save();
        res.status(200).json(savedMessage);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get Messages (Conversation)
// Assuming conversationId is used or simple filtering by participants
router.get('/:conversationId', async (req, res) => {
    try {
        const messages = await Message.find({
            conversationId: req.params.conversationId,
        });
        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get System Messages
router.get('/system/broadcast', async (req, res) => {
    try {
        const messages = await Message.find({
            conversationId: "system-broadcast",
        }).sort({ createdAt: 1 });
        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get Messages (Conversation)

// Delete Message
router.delete('/:id', async (req, res) => {
    try {
        await Message.findByIdAndDelete(req.params.id);
        res.status(200).json("Message deleted");
    } catch (err) {
        res.status(500).json(err);
    }
});

// Edit Message
router.put('/:id', async (req, res) => {
    try {
        const updatedMessage = await Message.findByIdAndUpdate(req.params.id, {
            $set: { text: req.body.text, isEdited: true }
        }, { new: true });
        res.status(200).json(updatedMessage);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Mark Conversation as Read
router.put('/read/:conversationId', async (req, res) => {
    try {
        // Update all messages in this conversation where receiver is ME and isRead is false
        // We need the current user ID, but we usually pass it in body for this simple app setup or middleware
        // Assuming body contains { userId: "..." } based on previous patterns

        await Message.updateMany(
            {
                conversationId: req.params.conversationId,
                receiver: req.body.userId,
                isRead: false
            },
            { $set: { isRead: true } }
        );
        res.status(200).json("Conversation marked as read");
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
