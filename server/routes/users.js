const router = require('express').Router();
const User = require('../models/User');

// Get User
router.get('/', async (req, res) => {
    const userId = req.query.userId;
    const username = req.query.username;
    try {
        const user = userId
            ? await User.findById(userId)
            : await User.findOne({ name: username });
        const { password, ...other } = user._doc;
        res.status(200).json(other);
    } catch (err) {
        res.status(500).json(err);
    }
});

const bcrypt = require('bcryptjs');

// Update User (Profile & Security)
router.put('/:id', async (req, res) => {
    if (req.body.userId === req.params.id || req.body.isAdmin) {
        if (req.body.password) {
            try {
                const salt = await bcrypt.genSalt(10);
                req.body.password = await bcrypt.hash(req.body.password, salt);
            } catch (err) {
                return res.status(500).json(err);
            }
        }
        try {
            const user = await User.findByIdAndUpdate(req.params.id, {
                $set: req.body,
            }, { new: true });
            const { password, ...other } = user._doc;
            res.status(200).json(other);
        } catch (err) {
            return res.status(500).json(err);
        }
    } else {
        return res.status(403).json("You can update only your account!");
    }
});

// Delete User
router.delete('/:id', async (req, res) => {
    if (req.body.userId === req.params.id || req.body.isAdmin) {
        try {
            await User.findByIdAndDelete(req.params.id);
            res.status(200).json("Account has been deleted");
        } catch (err) {
            return res.status(500).json(err);
        }
    } else {
        return res.status(403).json("You can delete only your account!");
    }
});

// Get all users sorted by recent messages
router.get('/available-users', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json("userId is required");

    try {
        const Message = require('../models/Message');
        const allUsers = await User.find({}, { password: 0 });

        // Fetch last message for each user interaction
        const usersWithDate = await Promise.all(allUsers.map(async (user) => {
            if (user._id.toString() === userId) return null; // Skip self

            const conversationId = [userId, user._id.toString()].sort().join("-");
            const lastMsg = await Message.findOne({ conversationId }).sort({ createdAt: -1 });
            const unreadCount = await Message.countDocuments({
                conversationId,
                receiver: userId,
                isRead: false
            });

            return {
                ...user._doc,
                lastMessageTime: lastMsg ? lastMsg.createdAt : new Date(0), // Default to epoch if no msg
                lastMessage: lastMsg,
                unreadCount
            };
        }));

        const validUsers = usersWithDate.filter(u => u !== null);

        // Sort: Recent messages first
        validUsers.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

        res.status(200).json(validUsers);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get all users (for Admin or Search)
router.get('/all', async (req, res) => {
    try {
        const users = await User.find({}, { password: 0 });
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Block User
router.put('/:id/block', async (req, res) => {
    if (req.body.userId !== req.params.id) {
        try {
            const user = await User.findById(req.params.id);
            const currentUser = await User.findById(req.body.userId);
            if (!user.blockedUsers.includes(req.params.id)) {
                await currentUser.updateOne({ $addToSet: { blockedUsers: req.params.id } });
                res.status(200).json("User has been blocked");
            } else {
                res.status(403).json("You have already blocked this user");
            }
        } catch (err) {
            res.status(500).json(err);
        }
    } else {
        res.status(403).json("You cannot block yourself");
    }
});

// Unblock User
router.put('/:id/unblock', async (req, res) => {
    if (req.body.userId !== req.params.id) {
        try {
            const currentUser = await User.findById(req.body.userId);
            await currentUser.updateOne({ $pull: { blockedUsers: req.params.id } });
            res.status(200).json("User has been unblocked");
        } catch (err) {
            res.status(500).json(err);
        }
    } else {
        res.status(403).json("You cannot unblock yourself");
    }
});

// Get Blocked Users
router.get('/:id/blocked', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        const blockedUsers = await Promise.all(
            user.blockedUsers.map((userId) => {
                return User.findById(userId, { password: 0, updatedAt: 0, createdAt: 0 }); // Select specific fields
            })
        );
        res.status(200).json(blockedUsers);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
