const fs = require('fs');
function log(msg) { try { fs.appendFileSync('debug_log.txt', msg + '\n'); } catch (e) { } }
log('Starting script...');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);

const authRoute = require("./routes/auth");
const userRoute = require("./routes/users");
const messageRoute = require("./routes/messages");
const callRoute = require("./routes/calls");
const adminRoute = require("./routes/admin");
const settingsRoute = require("./routes/settings");

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/messages", messageRoute);
app.use("/api/calls", callRoute);
app.use("/api/admin", adminRoute);
app.use("/api/settings", settingsRoute);
app.use("/api/reports", require("./routes/reports"));
app.use("/api/tickets", require("./routes/tickets"));

// Socket.io Setup
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chitchat', {
}).then(() => { console.log('MongoDB Connected'); log('MongoDB Connected Successfully'); })
    .catch(err => { console.log(err); log('MongoDB Connection Failed: ' + err.message); });

// Store online users: [{ userId, socketId }]
let users = [];

const addUser = (userId, socketId) => {
    !users.some((user) => user.userId === userId) &&
        users.push({ userId, socketId });
};

const removeUser = (socketId) => {
    users = users.filter((user) => user.socketId !== socketId);
};

const getUser = (userId) => {
    return users.find((user) => user.userId === userId);
};

// WebRTC Signaling & Chat Socket
io.on('connection', (socket) => {
    console.log('User Connected:', socket.id);

    socket.on('join_room', (data) => {
        socket.join(data);
        console.log(`User ${socket.id} joined room: ${data}`);
    });

    // Fix: Join user to their own room for signaling AND track online status
    socket.on("addUser", (userId) => {
        socket.join(userId); // Join room for private signaling IMMEDIATE

        if (socket.connected) {
            addUser(userId, socket.id); // Add to global list
            io.emit("getUsers", users); // Notify all clients
            console.log(`User registered: ${userId} with socket ${socket.id}`);
        }
    });

    socket.on('send_message', (data) => {
        socket.to(data.room).emit('receive_message', data);
    });

    socket.on('read_message', (data) => {
        // data: { senderId, receiverId, conversationId }
        // We notify the ORIGINAL SENDER (who is now the 'receiver' of this read receipt)
        // that their messages have been read by 'senderId' (the current user)
        io.to(data.senderId).emit('message_read', data);
    });

    // Call Signaling
    socket.on("start_call", (data) => {
        io.to(data.to).emit("incoming_call", { from: data.from, name: data.name });
    });

    socket.on("callUser", (data) => {
        io.to(data.userToCall).emit("callUser", { signal: data.signalData, from: data.from, name: data.name })
    })

    socket.on("answerCall", (data) => {
        io.to(data.to).emit("callAccepted", data.signal)
    })

    socket.on("endCall", ({ to }) => {
        io.to(to).emit("callEnded");
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected', socket.id);
        removeUser(socket.id);
        io.emit("getUsers", users); // Notify all clients
    });

    const Message = require('./models/Message');

    // Admin Broadcast
    socket.on("admin_broadcast", async (messageText) => {
        try {
            // Save to DB
            const newMessage = new Message({
                conversationId: "system-broadcast",
                sender: null, // Null indicates System
                text: messageText,
                type: 'text'
            });
            await newMessage.save();

            // Emit to all
            io.emit("receive_broadcast", { message: messageText, time: new Date() });
            io.emit("receive_message", {
                sender: "SYSTEM",
                text: messageText,
                conversationId: "system-broadcast",
                createdAt: Date.now()
            }); // Also emit as standard message for chat view
        } catch (err) {
            console.error("Broadcast Error:", err);
        }
    });

    // Maintenance Mode
    socket.on("maintenance_mode", (isActive) => {
        io.emit("maintenance_status", isActive);
    });
});

app.get('/', (req, res) => {
    res.send('ChitChat Server Running (HTTP)');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    log(`Server running on port ${PORT}`);
});
