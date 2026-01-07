const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, mobile } = req.body;
        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json("Email already registered");

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            mobile
        });

        const savedUser = await newUser.save();
        res.status(200).json(savedUser);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) return res.status(404).json("User not found");

        // If google auth user trying to login via password (optional handling)
        if (!user.password && req.body.password) return res.status(400).json("Login with Google");

        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) return res.status(400).json("Wrong password");

        if (user.isBanned) return res.status(403).json("Your account has been banned. Contact support.");

        const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET || "default_secret", { expiresIn: "5d" });

        // Log active history
        user.activeHistory.push(Date.now());
        await user.save();

        const { password, ...others } = user._doc;
        res.status(200).json({ ...others, token });
    } catch (err) {
        res.status(500).json(err);
    }
});

// Google Login (Frontend sends details)
router.post('/google', async (req, res) => {
    try {
        const { googleId, email, name, avatar } = req.body;
        let user = await User.findOne({ email });

        if (user) {
            // Update missing details if any
            if (!user.googleId) user.googleId = googleId;
            if (!user.avatar) user.avatar = avatar;
            await user.save();

            const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET || "default_secret", { expiresIn: "5d" });
            user.activeHistory.push(Date.now());
            await user.save();
            const { password, ...others } = user._doc;
            return res.status(200).json({ ...others, token });
        } else {
            // Create new Google User
            const newUser = new User({
                name,
                email,
                googleId,
                avatar
            });
            const savedUser = await newUser.save();
            const token = jwt.sign({ id: savedUser._id, isAdmin: savedUser.isAdmin }, process.env.JWT_SECRET || "default_secret", { expiresIn: "5d" });
            res.status(200).json({ ...savedUser._doc, token });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message || "Internal Server Error" });
    }
});

module.exports = router;
