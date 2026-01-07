import { useState, useEffect, useContext, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { AuthContext } from '../context/AuthContext';
import { axiosInstance } from '../config';
import { FaPlus, FaHeadset, FaPaperPlane, FaTimes, FaInbox, FaCheckCircle, FaLock, FaArrowLeft, FaStar, FaSearch } from 'react-icons/fa';
import { format } from 'timeago.js';

export default function Support() {
    const { user } = useContext(AuthContext);
    const [searchParams, setSearchParams] = useSearchParams();
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(false);

    const [newMessage, setNewMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [rating, setRating] = useState(0);
    const [feedback, setFeedback] = useState("");
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

    // New Ticket Form
    const [formData, setFormData] = useState({
        subject: "",
        description: "",
        priority: "medium",
        category: "general"
    });

    const scrollRef = useRef();

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const res = await axiosInstance.get(`/tickets?userId=${user._id}`);
                setTickets(res.data);
            } catch (err) {
                console.error("Failed to fetch tickets", err);
            }
        };
        fetchTickets();

        // Optional: Poll for updates every 10 seconds
        const interval = setInterval(fetchTickets, 10000);
        return () => clearInterval(interval);
    }, [user._id]);



    // Handle Deep Linking & URL Sync
    useEffect(() => {
        const ticketId = searchParams.get("ticket");
        if (ticketId && tickets.length > 0 && !selectedTicket) {
            const t = tickets.find(t => t._id === ticketId);
            if (t) setSelectedTicket(t);
        } else if (!ticketId && selectedTicket) {
            setSelectedTicket(null);
        }
    }, [searchParams, tickets]);

    const handleTicketSelect = (ticket) => {
        setSelectedTicket(ticket);
        setSearchParams({ ticket: ticket._id });
    };

    const handleBack = () => {
        setSelectedTicket(null);
        setSearchParams({});
    };

    useEffect(() => {
        if (selectedTicket) {
            // Update selected ticket from latest tickets list to see new messages
            const updated = tickets.find(t => t._id === selectedTicket._id);
            if (updated && updated.messages.length !== selectedTicket.messages.length) {
                setSelectedTicket(updated);
            }
        }
    }, [tickets, selectedTicket]);

    useEffect(() => {
        if (selectedTicket) {
            setRating(selectedTicket.rating || 0);
            setFeedback(selectedTicket.feedback || "");
            setFeedbackSubmitted(!!selectedTicket.rating);
        }
    }, [selectedTicket]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedTicket?.messages]);

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axiosInstance.post("/tickets", {
                userId: user._id,
                ...formData
            });
            setTickets([res.data, ...tickets]);
            setIsCreating(false);
            setFormData({ subject: "", description: "", priority: "medium", category: "general" });
            setSelectedTicket(res.data);
        } catch (err) {
            console.error("Failed to create ticket", err);
        }
        setLoading(false);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const res = await axiosInstance.post(`/tickets/${selectedTicket._id}/message`, {
                senderId: user._id,
                text: newMessage
            });
            // Update local state immediately
            const updatedTicket = res.data;
            setTickets(tickets.map(t => t._id === updatedTicket._id ? updatedTicket : t));
            setSelectedTicket(updatedTicket);
            setNewMessage("");

            // If ticket was closed, it might be reopened by server logic, ensure UI reflects that
        } catch (err) {
            console.error(err);
        }
    };

    const handleCloseTicket = async () => {
        if (!selectedTicket || selectedTicket.status === 'closed') return;
        if (!window.confirm("Are you sure you want to close this ticket?")) return;

        try {
            const res = await axiosInstance.put(`/tickets/${selectedTicket._id}/status`, { status: 'closed' });
            const updatedTicket = res.data;
            setTickets(tickets.map(t => t._id === updatedTicket._id ? updatedTicket : t));
            setSelectedTicket(updatedTicket);
        } catch (err) {
            console.error("Failed to close ticket", err);
        }
    };

    const handleSubmitFeedback = async () => {
        if (rating === 0) return;
        try {
            const res = await axiosInstance.put(`/tickets/${selectedTicket._id}/feedback`, { rating, feedback });
            setFeedbackSubmitted(true);
            const updatedTicket = res.data;
            setTickets(tickets.map(t => t._id === updatedTicket._id ? updatedTicket : t));
            setSelectedTicket(updatedTicket);
        } catch (err) {
            console.error(err);
        }
    };

    const filteredTickets = tickets.filter(t =>
        t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t._id.includes(searchTerm)
    );

    return (
        <Layout>
            <div className="flex h-full bg-app overflow-hidden">
                {/* Ticket List Sidebar */}
                <div className={`w-full md:w-80 bg-card-app border-r border-app flex flex-col h-full ${selectedTicket ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-app flex justify-between items-center bg-card-app/50 backdrop-blur-sm">
                        <h2 className="font-bold text-xl text-main flex items-center gap-2">
                            <FaHeadset className="text-primary" /> Support
                        </h2>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all hover:scale-105 active:scale-95"
                            title="Create Ticket"
                        >
                            <FaPlus />
                        </button>
                    </div>

                    <div className="p-3">
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-3 text-muted" />
                            <input
                                type="text"
                                placeholder="Search tickets..."
                                className="w-full pl-10 pr-4 py-2.5 bg-input-app rounded-xl border border-transparent focus:border-primary focus:bg-card-app outline-none text-sm transition"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {filteredTickets.length === 0 && (
                            <div className="text-center py-10 text-muted flex flex-col items-center">
                                <div className="w-16 h-16 bg-input-app rounded-full flex items-center justify-center mb-3">
                                    <FaInbox className="text-2xl opacity-50" />
                                </div>
                                <p>No tickets yet</p>
                                <button onClick={() => setIsCreating(true)} className="mt-2 text-primary text-sm font-bold hover:underline">Create one</button>
                            </div>
                        )}
                        {filteredTickets.map(ticket => (
                            <div
                                key={ticket._id}
                                onClick={() => handleTicketSelect(ticket)}
                                className={`p-4 rounded-2xl cursor-pointer border transition-all duration-300 group relative overflow-hidden ${selectedTicket?._id === ticket._id
                                    ? 'bg-primary/5 border-primary shadow-lg shadow-primary/5 translate-x-1'
                                    : 'bg-card-app border-app hover:border-primary/50 hover:shadow-md'}`}
                            >
                                <div className={`absolute top-0 left-0 w-1 h-full bg-primary transition-all duration-300 ${selectedTicket?._id === ticket._id ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}></div>

                                <div className="flex justify-between items-start mb-2 pl-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider shadow-sm ${ticket.status === 'open' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' :
                                            ticket.status === 'closed' ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                            }`}>
                                            {ticket.status}
                                        </span>
                                        {ticket.rating && (
                                            <span className="flex items-center gap-1 text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 px-2 py-1 rounded-lg font-bold border border-yellow-200 dark:border-yellow-800">
                                                <FaStar size={10} /> {ticket.rating}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-muted font-medium bg-input-app px-2 py-1 rounded-md">{format(ticket.createdAt)}</span>
                                </div>
                                <div className="pl-2">
                                    <h4 className="font-bold text-main truncate mb-1 text-sm group-hover:text-primary transition-colors">{ticket.subject}</h4>
                                    <p className="text-xs text-muted line-clamp-1">{ticket.messages[ticket.messages.length - 1]?.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className={`flex-1 flex flex-col h-full relative bg-app/30 ${!selectedTicket ? 'hidden md:flex' : 'flex'}`}>
                    {selectedTicket ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-app bg-card-app/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <button onClick={handleBack} className="md:hidden p-2 -ml-2 mr-2 text-main hover:bg-input-app rounded-full transition">
                                        <FaArrowLeft />
                                    </button>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg text-main">#{selectedTicket._id.slice(-6)}</h3>
                                            <span className="text-main font-medium truncate max-w-[200px] md:max-w-md hidden sm:block">- {selectedTicket.subject}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted">
                                            <span className={`px-1.5 py-0.5 rounded border ${selectedTicket.priority === 'high' ? 'border-red-200 text-red-500 bg-red-50 dark:bg-red-900/10' :
                                                selectedTicket.priority === 'medium' ? 'border-orange-200 text-orange-500 bg-orange-50 dark:bg-orange-900/10' :
                                                    'border-green-200 text-green-500 bg-green-50 dark:bg-green-900/10'
                                                } capitalize`}>
                                                {selectedTicket.priority} Priority
                                            </span>
                                            <span>•</span>
                                            <span>{format(selectedTicket.createdAt)}</span>
                                        </div>
                                    </div>
                                </div>

                                {selectedTicket.status !== 'closed' && (
                                    <button
                                        onClick={handleCloseTicket}
                                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                                        title="Close Ticket"
                                    >
                                        <FaCheckCircle className="text-xs" /> Close Ticket
                                    </button>
                                )}
                                {selectedTicket.status === 'closed' && (
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-lg text-xs font-bold">
                                        <FaLock className="text-xs" /> Closed
                                    </span>
                                )}
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-app/50 scroll-smooth">
                                {/* Initial Description as first message handled by backend but good to show explicitly? 
                                    Backend adds initial description as first message so it's covered. 
                                */}
                                {selectedTicket.messages.map((msg, i) => {
                                    const senderId = msg.sender?._id || msg.sender;
                                    const isMe = senderId === user._id;
                                    // Assuming admin has a specific role or ID check, or just not me
                                    // Ideally backend should populate 'isAdmin' or we deduce it.
                                    // Since we don't have 'isAdmin' on message sender easily without full populate, 
                                    // we assume if not me, it's support staff. 
                                    // Wait, tickets.js populates sender. If sender is Admin, we show differently.

                                    const senderName = msg.sender.name || "Support";

                                    return (
                                        <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm whitespace-pre-wrap leading-relaxed ${isMe
                                                    ? 'bg-primary text-white rounded-br-none'
                                                    : 'bg-white dark:bg-slate-800 border border-app text-main rounded-bl-none'
                                                    }`}>
                                                    {msg.text}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1.5 px-1">
                                                    {!isMe && <span className="text-[10px] font-bold text-main">{senderName}</span>}
                                                    <span className="text-[10px] text-muted">{format(msg.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Feedback Section in Chat */}
                                {selectedTicket.status !== 'open' && (
                                    <div className="mx-8 my-4 p-6 bg-card-app border border-app rounded-2xl shadow-sm text-center animate-fade-in">
                                        <h4 className="font-bold text-main mb-2">How was our support?</h4>
                                        <div className="flex justify-center gap-2 mb-4">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    disabled={feedbackSubmitted}
                                                    onClick={() => setRating(star)}
                                                    className={`text-2xl transition-transform hover:scale-110 ${star <= rating ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-700'}`}
                                                >
                                                    <FaStar />
                                                </button>
                                            ))}
                                        </div>
                                        {!feedbackSubmitted ? (
                                            <div className="space-y-3">
                                                <textarea
                                                    placeholder="Tell us more about your experience (optional)..."
                                                    className="w-full bg-input-app rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                                    rows="2"
                                                    value={feedback}
                                                    onChange={e => setFeedback(e.target.value)}
                                                ></textarea>
                                                <button
                                                    onClick={handleSubmitFeedback}
                                                    disabled={rating === 0}
                                                    className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-secondary disabled:opacity-50 transition"
                                                >
                                                    Submit Feedback
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-green-600 font-bold bg-green-50 dark:bg-green-900/10 py-2 rounded-lg">
                                                Thank you for your feedback!
                                            </p>
                                        )}
                                    </div>
                                )}
                                <div ref={scrollRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 border-t border-app bg-card-app/80 backdrop-blur-md">
                                {selectedTicket.status === 'closed' ? (
                                    <div className="flex items-center justify-center p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-medium gap-2">
                                        <FaLock /> This ticket is closed. Reply to reopen it.
                                    </div>
                                ) : null}
                                <form onSubmit={handleSendMessage} className={`flex gap-3 relative ${selectedTicket.status === 'closed' ? 'opacity-50 mt-2' : ''}`}>
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder={selectedTicket.status === 'closed' ? "Type to reopen ticket..." : "Type your message..."}
                                        className="flex-1 bg-input-app border border-app rounded-2xl px-5 py-3.5 text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition shadow-sm"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim()}
                                        className="p-3.5 bg-primary text-white rounded-2xl hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-95"
                                    >
                                        <FaPaperPlane className="text-lg" />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted p-8 text-center bg-app/50">
                            <div className="w-24 h-24 bg-card-app rounded-3xl flex items-center justify-center mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 animate-pulse-slow">
                                <FaHeadset className="text-4xl text-primary/50" />
                            </div>
                            <h3 className="text-2xl font-bold text-main mb-2">How can we help?</h3>
                            <p className="max-w-md mx-auto text-muted mb-8 text-sm leading-relaxed">Select an existing ticket from the sidebar to view updates or create a new ticket to get in touch with our support team.</p>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-secondary transition-all shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5"
                            >
                                Open New Ticket
                            </button>
                        </div>
                    )}
                </div>

                {/* Create Ticket Modal */}
                {isCreating && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-card-app w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl border border-app relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-main">New Support Ticket</h3>
                                    <p className="text-xs text-muted mt-1">We typically reply within 24 hours.</p>
                                </div>
                                <button onClick={() => setIsCreating(false)} className="p-2 text-muted hover:text-main hover:bg-input-app rounded-full transition"><FaTimes size={18} /></button>
                            </div>
                            <form onSubmit={handleCreateTicket} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-main uppercase tracking-wider">Subject</label>
                                    <input
                                        required
                                        value={formData.subject}
                                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                        className="w-full bg-input-app border border-app rounded-xl px-4 py-3 text-main focus:ring-2 focus:ring-primary/50 outline-none transition"
                                        placeholder="What is this about?"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-main uppercase tracking-wider">Priority</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['low', 'medium', 'high'].map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, priority: p })}
                                                className={`py-2 rounded-xl text-sm font-bold capitalize border-2 transition-all ${formData.priority === p
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-transparent bg-input-app text-muted hover:bg-input-app/80'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-main uppercase tracking-wider">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-input-app border border-app rounded-xl px-4 py-3 text-main focus:ring-2 focus:ring-primary/50 outline-none appearance-none"
                                    >
                                        <option value="general">General Inquiry</option>
                                        <option value="technical">Technical Support</option>
                                        <option value="billing">Billing Issue</option>
                                        <option value="feature">Feature Request</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-main uppercase tracking-wider">Description</label>
                                    <textarea
                                        required
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-input-app border border-app rounded-xl px-4 py-3 text-main focus:ring-2 focus:ring-primary/50 outline-none h-32 resize-none leading-relaxed"
                                        placeholder="Please describe your issue in detail..."
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreating(false)}
                                        className="px-6 py-2.5 rounded-xl font-bold text-muted hover:bg-input-app transition text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-secondary transition shadow-lg shadow-primary/20 hover:shadow-primary/30 flex items-center gap-2 text-sm"
                                    >
                                        {loading ? <span className="animate-spin">⏳</span> : <FaPaperPlane />} Submit Ticket
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
