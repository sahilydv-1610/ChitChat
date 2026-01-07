import { useContext, useEffect, useRef, useState, useMemo } from "react";
import { AuthContext } from "../context/AuthContext";
import { SocketContext } from "../context/SocketContext";
import { axiosInstance } from "../config";
import Conversation from "../components/chat/Conversation";
import Message from "../components/chat/Message";
import CallInterface from "../components/chat/CallInterface";
import ErrorBoundary from "../components/ErrorBoundary";
import Layout from "../components/Layout";
import UserAvatar from "../components/UserAvatar";
import ReportModal from "../components/ReportModal";
import UserProfileModal from "../components/chat/UserProfileModal";
import MediaCaptureModal from "../components/chat/MediaCaptureModal";
import { FaPaperPlane, FaPhone, FaVideo, FaSearch, FaArrowLeft, FaComments, FaEllipsisV, FaUserSlash, FaFlag, FaBroadcastTower, FaTimes, FaPhoneSlash, FaImage, FaCamera, FaPlus } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";

export default function Messenger() {
    const [conversations, setConversations] = useState([]);
    const [currentChat, setCurrentChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [allUsers, setAllUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchParams, setSearchParams] = useSearchParams();

    // Menu State
    const [menuOpen, setMenuOpen] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);

    // Call State
    const [receivingCall, setReceivingCall] = useState(false);
    const [caller, setCaller] = useState("");
    const [callerName, setCallerName] = useState("");
    const [callerSignal, setCallerSignal] = useState();
    const [callActive, setCallActive] = useState(false);
    const [isCaller, setIsCaller] = useState(false); // Am I the one calling?

    const { socket, onlineUsers } = useContext(SocketContext);
    const { user, dispatch } = useContext(AuthContext);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const lastMessageRef = useRef(null);
    const shouldScrollToBottomRef = useRef(true);

    // Sync currentChat with URL
    // Sync currentChat with URL
    const prevChatIdRef = useRef(null);
    useEffect(() => {
        const chatId = searchParams.get("chat");

        // Only reset scroll if the CHAT ID actually changed
        if (chatId !== prevChatIdRef.current) {
            shouldScrollToBottomRef.current = true;
            prevChatIdRef.current = chatId;
        }

        if (chatId) {
            if (chatId === "system-broadcast") {
                // Only update if not already set (prevent object churn)
                if (currentChat?._id !== "system-broadcast") {
                    setCurrentChat({
                        _id: "system-broadcast",
                        name: "System Announcements",
                        isSystem: true,
                        avatarColor: "slate"
                    });
                }
            } else if (allUsers.length > 0) {
                const chatUser = allUsers.find(u => u._id === chatId);
                // Only update if reference changed and it's meaningful, 
                // BUT we usually want to update currentChat to get latest info (e.g. lastMessage).
                // The key is protecting the EFFECTS that depend on CURRENTCHAT.
                if (chatUser) setCurrentChat(chatUser);
            }
        } else if (!chatId) {
            setCurrentChat(null);
            prevChatIdRef.current = null;
        }
    }, [searchParams, allUsers]);

    // Socket Interactions
    useEffect(() => {
        socket?.on("receive_message", (data) => {
            if (user?.blockedUsers?.includes(data.sender)) return;

            const message = {
                sender: data.senderId,
                text: data.text,
                type: data.type,
                mediaUrl: data.mediaUrl,
                createdAt: Date.now(),
                _id: Date.now() + Math.random().toString(), // Temp ID
            };

            // 1. Update Messages Chat View if open
            if (currentChat?._id === data.senderId) {
                setMessages((prev) => [...prev, message]);
                // Mark as read immediately if window is focused (optional, but good)
                // For now, we rely on the user clicking or the existing read logic
            }

            // 2. Update Conversation List (Unread Count & Last Message)
            setAllUsers((prev) => {
                const updatedUsers = prev.map((u) => {
                    if (u._id === data.senderId) {
                        return {
                            ...u,
                            lastMessage: message,
                            lastMessageTime: message.createdAt,
                            unreadCount: currentChat?._id === data.senderId ? 0 : (u.unreadCount || 0) + 1
                        };
                    }
                    return u;
                });
                // Sort by recent
                return updatedUsers.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
            });
        });

        return () => {
            socket?.off("receive_message");
        }
    }, [socket, user, currentChat]);

    // Call Socket Interactions
    useEffect(() => {
        socket?.on("incoming_call", (data) => {
            if (!callActive) { // Only set if no call is currently active
                setReceivingCall(true);
                setCaller(data.from);
                setCallerName(data.name);
            }
        });

        socket?.on("callUser", (data) => {
            if (data.from === user._id) return; // Ignore if I'm the caller
            // This event now primarily delivers the signal data
            setCallerSignal(data.signal);
            // Ensure receivingCall and caller are set if not already by incoming_call
            if (!callActive && !receivingCall) {
                setReceivingCall(true);
                setCaller(data.from);
                setCallerName(data.name); // Assuming name is also in callUser data or fetched later
            }
        });

        return () => {
            socket?.off("incoming_call");
            socket?.off("callUser");
        }
    }, [socket, callActive, receivingCall, user]); // Added receivingCall to dependencies



    // Handle Read Receipts
    useEffect(() => {
        socket?.on("message_read", (data) => {
            // data.conversationId, data.senderId (who read it, i.e., currentChat)
            if (currentChat?._id === data.senderId) {
                setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
            }
        });
        return () => socket?.off("message_read");
    }, [socket, currentChat]);

    // Data Fetching
    useEffect(() => {
        const getUsers = async () => {
            try {
                const res = await axiosInstance.get(`/users/available-users?userId=${user._id}`);
                setAllUsers(res.data);
                const chatId = searchParams.get("chat");
                if (chatId) {
                    const chatUser = res.data.find(u => u._id === chatId);
                    if (chatUser) setCurrentChat(chatUser);
                }
            } catch (err) {
                console.log(err);
            }
        };
        getUsers();
    }, [user._id]);

    const displayUsers = useMemo(() => {
        const systemChat = {
            _id: "system-broadcast",
            name: "System Announcements",
            isSystem: true,
            avatarColor: "slate"
        };
        return [systemChat, ...allUsers];
    }, [allUsers]);

    const checkOnline = (userId) => onlineUsers.some(u => u.userId === userId);

    useEffect(() => {
        const getMessages = async () => {
            if (!currentChat) return;
            try {
                const conversationId = [user._id, currentChat._id].sort().join("-");
                const url = currentChat.isSystem
                    ? "/messages/system/broadcast"
                    : "/messages/" + conversationId;
                const res = await axiosInstance.get(url);
                setMessages(res.data);

                // Mark as Read
                if (!currentChat.isSystem) {
                    await axiosInstance.put(`/messages/read/${conversationId}`, { userId: user._id });

                    // Emit to socket that I read messages from this user
                    socket.emit("read_message", {
                        senderId: currentChat._id, // The one who sent the messages I just read
                        receiverId: user._id,
                        conversationId
                    });

                    // Update local unread count for this user in allUsers list (optional but good for UI)
                    setAllUsers(prev => prev.map(u =>
                        u._id === currentChat._id ? { ...u, unreadCount: 0 } : u
                    ));
                }

            } catch (err) {
                console.log(err);
            }
        };
        if (currentChat?._id) {
            getMessages();
        }
        setMenuOpen(false);
    }, [currentChat?._id, user._id]);

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container || messages.length === 0) return;

        const lastMessage = messages[messages.length - 1];
        const lastMessageId = lastMessage._id || lastMessage.createdAt;

        // 1. Handle Initial Load (User switched chat)
        if (shouldScrollToBottomRef.current) {
            container.scrollTop = container.scrollHeight; // Instant scroll
            shouldScrollToBottomRef.current = false;
            lastMessageRef.current = lastMessageId;
            return;
        }

        // 2. Handle Message Updates (Read receipts, edits) - NO SCROLL
        if (lastMessageRef.current === lastMessageId) {
            return;
        }

        // 3. New Message Arrived
        lastMessageRef.current = lastMessageId;
        const isMyMessage = lastMessage.sender === user._id;

        if (isMyMessage) {
            // Smooth scroll for my messages
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        } else {
            // For others, only scroll if strictly near bottom (e.g. within 150px)
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
            if (isNearBottom) {
                container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            }
        }
    }, [messages, user._id]);

    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);

        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result);
        };
        reader.readAsDataURL(selectedFile);
    };

    const removeImage = () => {
        setFile(null);
        setPreviewUrl(null);
    };

    const [mediaCaptureOpen, setMediaCaptureOpen] = useState(false);

    const handleCaptureConfirm = (capturedFile) => {
        setFile(capturedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result);
        };
        reader.readAsDataURL(capturedFile);
        setMediaCaptureOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() && !file) return;

        let mediaUrl = "";
        let type = "text";

        if (file) {
            const formData = new FormData();
            formData.append("file", file);

            try {
                const uploadRes = await axiosInstance.post("/messages/upload", formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                mediaUrl = uploadRes.data.url;
                if (file.type.startsWith("video/")) {
                    type = "video";
                } else if (file.type.includes("gif")) {
                    type = "gif";
                } else {
                    type = "image";
                }
            } catch (err) {
                console.error("Upload failed", err);
                alert("Upload failed");
                return;
            }
        }

        const conversationId = [user._id, currentChat._id].sort().join("-");
        const message = {
            conversationId,
            sender: user._id,
            receiver: currentChat._id,
            text: newMessage,
            type: type,
            mediaUrl: mediaUrl
        };

        socket.emit("send_message", {
            senderId: user._id,
            receiverId: currentChat._id,
            text: newMessage,
            type: type,
            mediaUrl: mediaUrl,
            room: currentChat._id
        });

        try {
            const res = await axiosInstance.post("/messages", message);
            setMessages(prev => [...prev, res.data]);
            setNewMessage("");
            setFile(null);
            setPreviewUrl(null);

            setAllUsers((prev) => {
                const updatedUsers = prev.map((u) => {
                    if (u._id === currentChat._id) {
                        return {
                            ...u,
                            lastMessage: res.data,
                            lastMessageTime: res.data.createdAt,
                        };
                    }
                    return u;
                });
                return updatedUsers.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
            });

            // Reset textarea height
            const textarea = document.getElementById("msg-input");
            if (textarea) textarea.style.height = 'auto';

        } catch (err) {
            console.log(err);
            if (err.response?.status === 403 || err.response?.status === 400) {
                alert(err.response.data);
            }
        }
    };

    useEffect(() => {
        socket?.emit("join_room", user._id);
    }, [socket, user._id]);

    const handleDeleteMessage = async (id) => {
        try {
            await axiosInstance.delete(`/messages/${id}`);
            setMessages(messages.filter(m => m._id !== id));
        } catch (err) {
            console.log(err);
        }
    }

    const handleEditMessage = (msg) => {
        const newText = prompt("Edit message:", msg.text);
        if (newText && newText !== msg.text) {
            axiosInstance.put(`/messages/${msg._id}`, { text: newText })
                .then(res => setMessages(messages.map(m => m._id === msg._id ? res.data : m)))
                .catch(err => console.log(err));
        }
    }

    const startCall = () => {
        if (!currentChat?._id) return;

        // Notify immediately for instant ringing
        socket.emit("start_call", {
            to: currentChat._id,
            from: user._id,
            name: user.name
        });

        setIsCaller(true);
        setCallActive(true);
    };
    const answerCall = () => {
        setCallActive(true);
        setReceivingCall(false);
        setIsCaller(false);
        const callerUser = allUsers.find(u => u._id === caller);
        if (callerUser) setSearchParams({ chat: caller });
    }

    const declineCall = () => {
        setReceivingCall(false);
        setIsCaller(false);
        setCallActive(false);
        // Optional: emit 'endCall' or similar to notify caller immediately, 
        // though the timeout implementation in CallInterface handles it eventually.
        // For better UX, we can emit rejection:
        socket.emit("endCall", { to: caller });
    }

    const [activeTab, setActiveTab] = useState("chats");
    const filteredUsers = displayUsers.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase());
        if (activeTab === "chats") {
            if (u.isSystem) return true;
            const hasChat = u.lastMessageTime && new Date(u.lastMessageTime).getTime() > 0;
            return matchesSearch && hasChat;
        }
        return matchesSearch;
    });

    const isBlocked = user.blockedUsers?.includes(currentChat?._id);
    const handleBlockAction = async () => {
        try {
            const endpoint = isBlocked ? 'unblock' : 'block';
            if (!isBlocked && !confirm("Block this user?")) return;

            await axiosInstance.put(`/users/${currentChat._id}/${endpoint}`, { userId: user._id });
            const newBlocked = isBlocked
                ? user.blockedUsers.filter(id => id !== currentChat._id)
                : [...(user.blockedUsers || []), currentChat._id];

            dispatch({ type: "UPDATE_USER", payload: { ...user, blockedUsers: newBlocked } });
            setMenuOpen(false);
        } catch (err) {
            console.error(err);
            alert("Action failed");
        }
    };

    const containerStyle = {
        overscrollBehavior: 'none',
        touchAction: 'manipulation'
    };

    return (
        <Layout>
            <ReportModal
                isOpen={reportModalOpen}
                onClose={() => setReportModalOpen(false)}
                reportedUser={currentChat}
                currentUser={user}
            />
            <UserProfileModal
                isOpen={profileModalOpen}
                onClose={() => setProfileModalOpen(false)}
                user={currentChat}
                isOnline={checkOnline(currentChat?._id)}
            />

            {/* Incoming Call Toast */}
            {receivingCall && !callActive && (
                <div className="fixed top-6 right-6 z-[9999] animate-bounce-soft">
                    <div className="bg-card-app/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-primary/20 flex items-center gap-4 max-w-sm w-full">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                            <FaPhone />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-main">{callerName || "Incoming Call"}</h3>
                            <p className="text-xs text-muted">Voice/Video Call...</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={answerCall}
                                disabled={!callerSignal}
                                className={`h-10 rounded-full flex items-center justify-center shadow-lg transition-all 
                                    ${callerSignal ? "w-10 bg-emerald-500 hover:scale-110 shadow-emerald-500/30 text-white" : "w-auto px-4 bg-gray-500/50 cursor-wait text-white/50 gap-2"}
                                `}
                            >
                                {callerSignal ? <FaVideo size={14} /> : <span className="text-[10px] font-bold uppercase animate-pulse">Connecting...</span>}
                            </button>
                            <button onClick={declineCall} className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 hover:scale-110 transition"><FaPhoneSlash size={14} /></button>
                        </div>
                    </div>
                </div>
            )}

            {callActive && (
                <ErrorBoundary>
                    <CallInterface
                        socket={socket}
                        user={user}
                        chatPartner={currentChat}
                        callerId={caller}
                        isCaller={isCaller}
                        signalData={callerSignal}
                        onClose={() => setCallActive(false)}
                    />
                </ErrorBoundary>
            )}

            <div
                className="flex md:relative h-full w-full overflow-hidden bg-app relative"
            >
                {/* Mobile: Container is fixed inset-0 z-50 to overlap everything and lock scroll */}
                {/* Desktop: Standard relative layout inside Layout */}

                {/* Sidebar */}
                <div className={`
                    absolute md:relative inset-0 md:inset-auto z-40 
                    w-full md:w-[380px] h-full 
                    flex flex-col 
                    bg-card-app/95 backdrop-blur-2xl md:bg-card-app/50 
                    border-r border-app transition-transform duration-300
                    ${currentChat ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
                `}>
                    {/* Sidebar Header */}
                    <div className="flex-none p-6 pb-4 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                Messages
                            </h2>
                            <div className="flex bg-input-app rounded-xl p-1">
                                {['chats', 'search'].map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all duration-300 ${activeTab === tab ? "bg-card-app text-primary shadow-sm" : "text-muted hover:text-main"}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative group">
                            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" />
                            <input
                                placeholder="Search..."
                                className="w-full pl-11 pr-4 py-3 bg-input-app border border-app rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-main placeholder-muted text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* User List - Scrollable */}
                    <div className="flex-1 overflow-y-auto px-3 pb-safe min-h-0 scrollbar-thin">
                        <div className="space-y-1">
                            {filteredUsers.length === 0 ? (
                                <div className="text-center py-20 opacity-50">
                                    <div className="w-16 h-16 bg-input-app rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                        <FaSearch size={24} className="text-muted" />
                                    </div>
                                    <p className="text-muted font-medium">No results found</p>
                                </div>
                            ) : filteredUsers.map((u) => (
                                <div
                                    key={u._id}
                                    onClick={() => setSearchParams({ chat: u._id })}
                                    className={`p-1 rounded-2xl transition-all duration-200 cursor-pointer ${currentChat?._id === u._id ? "bg-primary/5" : "hover:bg-input-app/50"}`}
                                >
                                    <Conversation conversation={u} currentUser={user} isOnline={checkOnline(u._id)} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Chat Area */}
                {/* On Mobile, we force this to be fixed relative to viewport if active */}
                <div
                    className={`
                        fixed md:static inset-0 md:inset-auto z-50 md:z-auto
                        w-full md:flex-1 md:w-auto h-[100dvh] md:h-full flex flex-col 
                        bg-app transition-transform duration-300 md:duration-0
                        ${currentChat ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                    `}
                    style={currentChat ? containerStyle : {}}
                >
                    {!currentChat ? (
                        <div className="hidden md:flex h-full flex-col items-center justify-center text-muted">
                            <div className="w-24 h-24 bg-gradient-to-tr from-primary/10 to-secondary/10 rounded-[2rem] flex items-center justify-center mb-6 animate-float">
                                <FaComments size={40} className="text-primary/50" />
                            </div>
                            <h3 className="text-xl font-bold text-main">Your Messages</h3>
                            <p className="text-sm opacity-60">Select a conversation to start chatting</p>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header - Fixed Top Height */}
                            <div className="flex-none h-[72px] px-4 md:px-6 flex items-center justify-between bg-card-app/95 backdrop-blur-xl border-b border-app z-30 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setSearchParams({})}
                                        className="md:hidden w-10 h-10 flex items-center justify-center -ml-2 text-muted hover:text-main active:scale-90 transition rounded-full hover:bg-input-app"
                                    >
                                        <FaArrowLeft />
                                    </button>

                                    <button
                                        onClick={() => setProfileModalOpen(true)}
                                        className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left bg-transparent border-none p-0 cursor-pointer"
                                    >
                                        <div className="relative">
                                            <UserAvatar user={currentChat} size="sm" isOnline={checkOnline(currentChat._id)} />
                                            {checkOnline(currentChat._id) && (
                                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-card-app rounded-full animate-pulse"></span>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-main text-base md:text-lg leading-tight">{currentChat.name}</h3>
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                                                {checkOnline(currentChat._id) ? <span className="text-emerald-500">Online</span> : "Offline"}
                                            </p>
                                        </div>
                                    </button>
                                </div>

                                <div className="flex items-center gap-1 md:gap-2">
                                    <button onClick={startCall} disabled={isBlocked} className="w-10 h-10 rounded-xl flex items-center justify-center text-primary hover:bg-primary/10 transition disabled:opacity-50"><FaPhone size={16} /></button>
                                    <button onClick={startCall} disabled={isBlocked} className="w-10 h-10 rounded-xl flex items-center justify-center text-primary hover:bg-primary/10 transition disabled:opacity-50"><FaVideo size={16} /></button>

                                    <div className="relative">
                                        <button onClick={() => setMenuOpen(!menuOpen)} className="w-10 h-10 rounded-xl flex items-center justify-center text-muted hover:bg-input-app transition"><FaEllipsisV /></button>
                                        {menuOpen && (
                                            <div className="absolute top-full right-0 mt-2 w-48 bg-card-app rounded-xl shadow-2xl border border-app overflow-hidden py-1 z-50 animate-scale-in origin-top-right">
                                                <button onClick={handleBlockAction} className="w-full text-left px-4 py-3 hover:bg-input-app text-sm font-medium flex items-center gap-2 text-red-500">
                                                    <FaUserSlash size={14} /> {isBlocked ? "Unblock" : "Block"}
                                                </button>
                                                <button onClick={() => { setReportModalOpen(true); setMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-input-app text-sm font-medium flex items-center gap-2 text-muted">
                                                    <FaFlag size={14} /> Report
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Messages Container - Flex Grow & Scroll */}
                            <div
                                ref={messagesContainerRef}
                                className="flex-1 overflow-y-auto w-full p-4 md:p-6 space-y-4 scrollbar-thin min-h-0 overscroll-y-contain touch-pan-y"
                            >
                                {messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center opacity-50">
                                        <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-4 text-primary">
                                            <FaComments size={32} />
                                        </div>
                                        <p className="text-sm font-medium">No messages yet</p>
                                    </div>
                                ) : messages.map((m) => (
                                    <div key={m._id || m.createdAt}>
                                        <Message
                                            message={m}
                                            own={m.sender === user._id}
                                            senderName={currentChat.name}
                                            senderColor={currentChat.avatarColor}
                                            onDelete={handleDeleteMessage}
                                            onEdit={handleEditMessage}
                                        />
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area - Fixed Bottom Height */}
                            <div className="flex-none w-full z-30 bg-card-app/95 backdrop-blur-xl border-t border-app pb-safe">
                                {isBlocked ? (
                                    <div className="p-4 text-center text-red-500 font-bold text-sm">
                                        You have blocked this user. <button onClick={handleBlockAction} className="underline">Unblock</button>
                                    </div>
                                ) : currentChat.isSystem ? (
                                    <div className="p-4 text-center text-muted text-sm font-bold flex items-center justify-center gap-2">
                                        <FaBroadcastTower className="text-primary" /> Read-only channel
                                    </div>
                                ) : (
                                    <form
                                        className="max-w-4xl mx-auto flex flex-col gap-2 p-3 md:p-4"
                                        onSubmit={handleSubmit}
                                    >
                                        {/* Image Preview */}
                                        {/* File Preview */}
                                        {previewUrl && (
                                            <div className="relative inline-block w-fit animate-fade-in pl-2">
                                                {file?.type?.startsWith('video/') ? (
                                                    <div className="relative bg-black rounded-xl overflow-hidden border border-app h-24 w-48"> {/* Wider for video */}
                                                        <video src={previewUrl} className="w-full h-full object-contain" />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                            <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-full">
                                                                <FaVideo className="text-white text-xs" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <img src={previewUrl} alt="Preview" className="h-24 w-auto rounded-xl border border-app object-cover shadow-sm" />
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={removeImage}
                                                    className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1.5 shadow-md shadow-rose-500/20 hover:bg-rose-600 hover:scale-110 transition active:scale-95"
                                                    title="Remove"
                                                >
                                                    <FaTimes size={10} />
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex items-end gap-2 w-full bg-input-app/50 border border-app rounded-[26px] px-3 py-1.5 transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary hover:bg-input-app">
                                            <div className="mb-1.5">
                                                <label htmlFor="file-input" className="cursor-pointer text-muted hover:text-primary transition p-2 hover:bg-input-app rounded-full block" title="Add Media">
                                                    <FaPlus size={20} />
                                                </label>
                                                <input
                                                    type="file"
                                                    id="file-input"
                                                    className="hidden"
                                                    accept="image/*,video/*"
                                                    onChange={handleFileChange}
                                                />
                                            </div>

                                            <textarea
                                                id="msg-input"
                                                className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 shadow-none ring-0 resize-none max-h-32 min-h-[24px] py-3 text-main placeholder-muted font-medium scrollbar-hide text-[15px] leading-relaxed"
                                                placeholder="Type a message..."
                                                rows="1"
                                                value={newMessage}
                                                onChange={(e) => {
                                                    setNewMessage(e.target.value);
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSubmit(e);
                                                    }
                                                }}
                                                style={{ boxShadow: 'none', outline: 'none' }}
                                            />

                                            <div className="flex items-center gap-1 mb-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setMediaCaptureOpen(true)}
                                                    className="cursor-pointer text-muted hover:text-primary transition p-2 hover:bg-input-app rounded-full block"
                                                    title="Use Camera"
                                                >
                                                    <FaCamera size={20} />
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={!newMessage.trim() && !file}
                                                    className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed transition-all duration-200 shrink-0"
                                                >
                                                    <FaPaperPlane size={14} className="ml-0.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
            {reportModalOpen && (
                <ReportModal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} reportedUserId={currentChat?._id} />
            )}
            {profileModalOpen && (
                <UserProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} user={currentChat} />
            )}
            <MediaCaptureModal
                isOpen={mediaCaptureOpen}
                onClose={() => setMediaCaptureOpen(false)}
                onConfirm={handleCaptureConfirm}
            />
        </Layout>
    );
}
