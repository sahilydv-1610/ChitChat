import { useEffect, useState, useMemo, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { axiosInstance } from "../config";
import Layout from "../components/Layout";
import AdminSidebar from "../components/AdminSidebar";
import { FaUsers, FaTrash, FaVideo, FaPhone, FaChartLine, FaBroadcastTower, FaPaperPlane, FaBars, FaSearch, FaCheckCircle, FaTimesCircle, FaBan, FaCog, FaHeadset, FaLifeRing, FaTicketAlt, FaReply, FaInbox, FaArrowLeft, FaStar } from "react-icons/fa";
import { format } from "timeago.js";
import UserAvatar from "../components/UserAvatar";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell } from 'recharts';
import { io } from "socket.io-client";

export default function AdminDashboard() {
    const { user: currentUser } = useContext(AuthContext);
    const [stats, setStats] = useState({});
    const [users, setUsers] = useState([]);
    const [reports, setReports] = useState([]);
    const [calls, setCalls] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [activeTab, setActiveTab] = useState("overview"); // overview, users, reports, broadcast, support
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Search & Filter States
    const [userSearch, setUserSearch] = useState("");
    const [callSearch, setCallSearch] = useState("");
    const [reportFilter, setReportFilter] = useState("all");
    const [ticketFilter, setTicketFilter] = useState("all");
    const [ticketSearch, setTicketSearch] = useState("");
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [ticketReply, setTicketReply] = useState("");

    // Broadcast State
    const [broadcastMessage, setBroadcastMessage] = useState("");
    const [socket, setSocket] = useState(null);

    // Settings State
    const [settings, setSettings] = useState({
        maintenanceMode: false,
        allowRegistration: true,
        systemBanner: "",
        siteName: "ChitChat"
    });

    useEffect(() => {
        const newSocket = io("/"); // Connect to same host
        setSocket(newSocket);
        return () => newSocket.close();
    }, []);

    useEffect(() => {
        const getData = async () => {
            try {
                const [statsRes, usersRes, callsRes, reportsRes, ticketsRes] = await Promise.all([
                    axiosInstance.get("/admin/stats"),
                    axiosInstance.get("/users/all"),
                    axiosInstance.get("/calls/all"),
                    axiosInstance.get("/reports"),
                    axiosInstance.get("/tickets?isAdmin=true")
                ]);
                setStats(statsRes.data);
                setUsers(usersRes.data);
                setCalls(callsRes.data);
                setReports(reportsRes.data);
                setTickets(ticketsRes.data);
            } catch (err) {
                console.error(err);
            }

        };
        const getSettings = async () => {
            try {
                const res = await axiosInstance.get("/settings");
                setSettings(res.data);
            } catch (err) {
                console.error(err);
            }
        }
        getData();
        getSettings();
    }, []);

    // Poll tickets when in support tab
    useEffect(() => {
        if (activeTab !== 'support') return;

        const fetchTickets = async () => {
            try {
                const res = await axiosInstance.get("/tickets?isAdmin=true");
                const newTickets = res.data;

                setTickets(newTickets);

                // If a ticket is selected, update it from the list to show new messages
                if (selectedTicket) {
                    const updated = newTickets.find(t => t._id === selectedTicket._id);
                    if (updated && updated.messages.length !== selectedTicket.messages.length) {
                        setSelectedTicket(updated);
                    }
                    // Also update if status or rating/feedback changed
                    if (updated && (
                        updated.status !== selectedTicket.status ||
                        updated.rating !== selectedTicket.rating ||
                        updated.feedback !== selectedTicket.feedback
                    )) {
                        setSelectedTicket(updated);
                    }
                }
            } catch (err) {
                console.error("Failed to poll tickets", err);
            }
        };

        const interval = setInterval(fetchTickets, 5000); // Poll every 5s for admin
        return () => clearInterval(interval);
    }, [activeTab, selectedTicket]);

    const updateSetting = async (key, value) => {
        try {
            // Optimistic update
            setSettings(prev => ({ ...prev, [key]: value }));
            await axiosInstance.put("/settings", { [key]: value });

            // Emit generic update
            if (socket) socket.emit("settings_update", { key, value });

            if (key === 'maintenanceMode') {
                socket.emit("maintenance_mode", value);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to update setting");
            // Revert on fail could be added here
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await axiosInstance.delete("/admin/" + id);
            setUsers(users.filter(u => u._id !== id));
        } catch (err) {
            console.error(err);
        }
    }

    const handleReportAction = async (reportId, action) => {
        try {
            await axiosInstance.put(`/reports/${reportId}/resolve`, { status: action });
            setReports(reports.map(r => r._id === reportId ? { ...r, status: action } : r));
            if (action === 'resolved') {
                const report = reports.find(r => r._id === reportId);
                if (report?.reportedUser) {
                    setUsers(users.map(u => u._id === report.reportedUser._id ? { ...u, isBanned: true } : u));
                }
            }
        } catch (err) {
            console.error(err);
            alert("Action failed");
        }
    };

    const handleBroadcast = async (e) => {
        e.preventDefault();
        if (!broadcastMessage.trim()) return;

        try {
            socket.emit("admin_broadcast", broadcastMessage);
            alert("Broadcast sent successfully to all online users!");
            setBroadcastMessage("");
        } catch (err) {
            console.error(err);
            alert("Failed to send broadcast");
        }
    };

    const handleTicketStatus = async (id, status) => {
        try {
            const res = await axiosInstance.put(`/tickets/${id}/status`, { status });
            setTickets(tickets.map(t => t._id === id ? { ...t, status } : t));
            if (selectedTicket?._id === id) setSelectedTicket({ ...selectedTicket, status });
        } catch (err) {
            console.error("Failed to update ticket status", err);
        }
    };

    const handleTicketReply = async (e) => {
        e.preventDefault();
        if (!ticketReply.trim()) return;
        try {
            const res = await axiosInstance.post(`/tickets/${selectedTicket._id}/message`, {
                senderId: currentUser._id,
                text: ticketReply
            });
            // Update local state
            const updatedTicket = res.data;
            setTickets(tickets.map(t => t._id === updatedTicket._id ? updatedTicket : t));
            setSelectedTicket(updatedTicket);
            setTicketReply("");
        } catch (err) {
            console.error("Failed to send reply", err);
            alert("Failed to send reply");
        }
    };

    // Filtered Data
    const filteredUsers = useMemo(() => {
        return users.filter(u =>
            u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(userSearch.toLowerCase())
        );
    }, [users, userSearch]);

    const filteredReports = useMemo(() => {
        if (reportFilter === "all") return reports;
        return reports.filter(r => r.status === reportFilter || (!r.status && reportFilter === 'pending'));
    }, [reports, reportFilter]);

    const filteredTickets = useMemo(() => {
        let result = tickets;
        if (ticketSearch) {
            const searchLower = ticketSearch.toLowerCase();
            result = result.filter(t =>
                t._id.toLowerCase().includes(searchLower) ||
                t.subject.toLowerCase().includes(searchLower)
            );
        }
        if (ticketFilter !== "all") {
            result = result.filter(t => t.status === ticketFilter);
        }
        return result;
    }, [tickets, ticketFilter, ticketSearch]);

    const filteredCalls = useMemo(() => {
        return calls.filter(c => {
            const callerName = c.caller?.name?.toLowerCase() || "";
            const receiverName = c.receiver?.name?.toLowerCase() || "";
            const search = callSearch.toLowerCase();
            return callerName.includes(search) || receiverName.includes(search);
        });
    }, [calls, callSearch]);

    // Chart Data Preparation - Real Data Aggregation
    const chartData = useMemo(() => {
        const days = 7;
        const data = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });

            // Start of day
            const startOfDay = new Date(date.setHours(0, 0, 0, 0));
            // End of day
            const endOfDay = new Date(date.setHours(23, 59, 59, 999));

            // Count users created on or before this day (cumulative growth) OR daily registrations
            // Let's show Cumulative Growth for Users, and Daily Volume for Calls
            const cumulativeUsers = users.filter(u => new Date(u.createdAt) <= endOfDay).length;
            const dailyCalls = calls.filter(c => {
                const callDate = new Date(c.startTime || c.createdAt); // Fallback if startTime missing
                return callDate >= startOfDay && callDate <= endOfDay;
            }).length;

            data.push({
                name: dayStr,
                users: cumulativeUsers, // Growth Trend
                calls: dailyCalls       // Daily Activity
            });
        }
        return data;
    }, [users, calls]);

    return (
        <Layout>
            <div className="flex h-screen bg-app overflow-hidden">
                {/* Sidebar */}
                <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

                {/* Mobile Header */}
                <div className="md:hidden fixed top-0 w-full bg-card-app border-b border-app p-4 z-20 flex items-center justify-between">
                    <span className="font-bold text-lg text-main">Admin Panel</span>
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-muted">
                        <FaBars size={24} />
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                {mobileMenuOpen && (
                    <div className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
                        <div className="bg-card-app w-3/4 h-full p-4" onClick={e => e.stopPropagation()}>
                            <AdminSidebar activeTab={activeTab} setActiveTab={(t) => { setActiveTab(t); setMobileMenuOpen(false) }} />
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-10 mt-16 md:mt-0">
                    <div className="max-w-7xl mx-auto space-y-8">

                        {/* OVERVIEW TAB */}
                        {activeTab === "overview" && (
                            <div className="space-y-8 animate-fade-in-up">
                                <div>
                                    <h1 className="text-3xl font-bold text-main mb-2">Dashboard Overview</h1>
                                    <p className="text-muted">Welcome back, Admin. Here's what's happening today.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <StatsCard icon={FaUsers} label="Total Users" value={stats.users || 0} sub="Registered Accounts" color="indigo" />
                                    <StatsCard icon={FaVideo} label="Total Calls" value={calls.length || 0} sub="System-wide sessions" color="emerald" />
                                    <StatsCard icon={FaChartLine} label="Pending Reports" value={reports.filter(r => r.status === 'pending').length || 0} sub="Requires Attention" color="red" />
                                    <StatsCard icon={FaBroadcastTower} label="Broadcasts" value="Active" sub="System online" color="orange" />
                                </div>

                                {/* Charts Section */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="bg-card-app rounded-2xl p-6 shadow-sm border border-app">
                                        <h3 className="font-bold text-lg mb-6 text-main">User Growth & Activity</h3>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={chartData}>
                                                    <defs>
                                                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    />
                                                    <Area type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="bg-card-app rounded-2xl p-6 shadow-sm border border-app">
                                        <h3 className="font-bold text-lg mb-6 text-main">Call Traffic</h3>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={chartData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    />
                                                    <Line type="monotone" dataKey="calls" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-card-app rounded-2xl p-6 shadow-sm border border-app">
                                    <h3 className="font-bold text-lg mb-4 text-main">Recent Registrations</h3>
                                    <div className="space-y-4">
                                        {users.slice(0, 5).map(u => (
                                            <div key={u._id} className="flex items-center justify-between p-3 hover:bg-input-app rounded-xl transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar user={u} size="sm" />
                                                    <div>
                                                        <p className="font-bold text-main text-sm">{u.name}</p>
                                                        <p className="text-xs text-muted">{u.email}</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-medium text-muted bg-input-app px-2 py-1 rounded-lg">{format(u.createdAt)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* USERS TAB */}
                        {activeTab === "users" && (
                            <div className="space-y-6 animate-fade-in-up">
                                <div>
                                    <h1 className="text-3xl font-bold text-main mb-2">User Management</h1>
                                    <p className="text-muted">View, search, and manage all registered users.</p>
                                </div>
                                <div className="bg-card-app rounded-2xl shadow-sm border border-app overflow-hidden">
                                    <div className="p-6 border-b border-app flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="relative flex-1 max-w-md">
                                            <FaSearch className="absolute left-3 top-3.5 text-muted" />
                                            <input
                                                type="text"
                                                placeholder="Search by name or email..."
                                                className="w-full pl-10 pr-4 py-2.5 bg-input-app border border-app rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm text-main"
                                                value={userSearch}
                                                onChange={(e) => setUserSearch(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="px-3 py-2 bg-input-app rounded-lg text-xs font-bold text-muted">Total: {users.length}</span>
                                            <span className="px-3 py-2 bg-green-100 dark:bg-green-900/20 rounded-lg text-xs font-bold text-green-600 dark:text-green-400">Active: {users.filter(u => !u.isBanned).length}</span>
                                            <span className="px-3 py-2 bg-red-100 dark:bg-red-900/20 rounded-lg text-xs font-bold text-red-600 dark:text-red-400">Banned: {users.filter(u => u.isBanned).length}</span>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                                                <tr>
                                                    <th className="px-6 py-4 font-semibold">User</th>
                                                    <th className="px-6 py-4 font-semibold">Role</th>
                                                    <th className="px-6 py-4 font-semibold">Status</th>
                                                    <th className="px-6 py-4 font-semibold">Joined</th>
                                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-app text-sm text-main">
                                                {filteredUsers.map(u => (
                                                    <tr key={u._id} className="hover:bg-input-app transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <UserAvatar user={u} size="sm" showStatus={false} />
                                                                <div>
                                                                    <p className="font-bold text-main">{u.name}</p>
                                                                    <p className="text-muted">{u.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.isAdmin ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-input-app text-muted'}`}>
                                                                {u.isAdmin ? "Admin" : "User"}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {u.isBanned ? (
                                                                <span className="inline-flex items-center gap-1 text-red-600 font-bold bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded text-xs">
                                                                    <FaBan size={10} /> Banned
                                                                </span>
                                                            ) : (
                                                                <span className="text-green-600 dark:text-green-400 font-medium text-xs bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">Active</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                onClick={() => handleDeleteUser(u._id)}
                                                                className="text-muted hover:text-red-500 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                                                title="Delete User"
                                                            >
                                                                <FaTrash />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredUsers.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-muted">No users found</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}


                        {/* CALLS TAB */}
                        {activeTab === "calls" && (
                            <div className="space-y-6 animate-fade-in-up">
                                <div>
                                    <h1 className="text-3xl font-bold text-main mb-2">Call History</h1>
                                    <p className="text-muted">Detailed logs of all video and audio calls.</p>
                                </div>
                                <div className="bg-card-app rounded-2xl shadow-sm border border-app overflow-hidden">
                                    <div className="p-6 border-b border-app flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="relative flex-1 max-w-md">
                                            <FaSearch className="absolute left-3 top-3.5 text-muted" />
                                            <input
                                                type="text"
                                                placeholder="Search participant name..."
                                                className="w-full pl-10 pr-4 py-2.5 bg-input-app border border-app rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm text-main"
                                                value={callSearch}
                                                onChange={(e) => setCallSearch(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400">Total Calls: {calls.length}</span>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-input-app text-muted text-xs uppercase tracking-wider">
                                                <tr>
                                                    <th className="px-6 py-4 font-semibold">Caller</th>
                                                    <th className="px-6 py-4 font-semibold">Recipient</th>
                                                    <th className="px-6 py-4 font-semibold">Type</th>
                                                    <th className="px-6 py-4 font-semibold">Duration</th>
                                                    <th className="px-6 py-4 font-semibold">Status</th>
                                                    <th className="px-6 py-4 font-semibold text-right">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-app text-sm text-main">
                                                {filteredCalls.map(c => (
                                                    <tr key={c._id} className="hover:bg-input-app transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <UserAvatar user={c.caller} size="xs" showStatus={false} />
                                                                <span className="font-bold text-main">{c.caller?.name || "Unknown"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <UserAvatar user={c.receiver} size="xs" showStatus={false} />
                                                                <span className="font-bold text-main">{c.receiver?.name || "Unknown"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {c.type === 'video' ?
                                                                <span className="flex items-center gap-1 text-primary font-medium"><FaVideo size={12} /> Video</span> :
                                                                <span className="flex items-center gap-1 text-emerald-500 font-medium"><FaPhone size={12} /> Audio</span>
                                                            }
                                                        </td>
                                                        <td className="px-6 py-4 font-mono text-muted">
                                                            {c.duration ? `${Math.floor(c.duration / 60)}m ${c.duration % 60}s` : '-'}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {c.status === 'completed' ? (
                                                                <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded text-xs font-bold uppercase">Completed</span>
                                                            ) : c.status === 'missed' ? (
                                                                <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded text-xs font-bold uppercase">Missed</span>
                                                            ) : (
                                                                <span className="bg-input-app text-muted px-2 py-1 rounded text-xs font-bold uppercase">{c.status || 'Ended'}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right text-muted">
                                                            {format(c.createdAt)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredCalls.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-muted">No calls found</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === "reports" && (
                            <div className="space-y-6 animate-fade-in-up">
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Report Center</h1>
                                    <p className="text-slate-500 dark:text-slate-400">Review and resolve user reports securely.</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                                    <div className="p-6 border-b border-app flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex bg-input-app rounded-xl p-1">
                                            {["all", "pending", "resolved", "dismissed"].map(f => (
                                                <button
                                                    key={f}
                                                    onClick={() => setReportFilter(f)}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${reportFilter === f
                                                        ? "bg-card-app text-primary shadow-sm"
                                                        : "text-muted hover:text-main"
                                                        }`}
                                                >
                                                    {f}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-input-app text-muted text-xs uppercase tracking-wider">
                                                <tr>
                                                    <th className="px-6 py-4 font-semibold">Incident</th>
                                                    <th className="px-6 py-4 font-semibold">Reason</th>
                                                    <th className="px-6 py-4 font-semibold">Status</th>
                                                    <th className="px-6 py-4 font-semibold">Date</th>
                                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-app text-sm text-main">
                                                {filteredReports.map(r => (
                                                    <tr key={r._id} className="hover:bg-input-app transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2 text-red-600 font-bold">
                                                                    <span className="text-xs px-1 border border-red-200 rounded ">Reported</span>
                                                                    {r.reportedUser?.name}
                                                                </div>
                                                                <div className="text-xs text-muted flex items-center gap-1">
                                                                    <span>by</span>
                                                                    <span className="font-medium text-main">{r.reporter?.name}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-main max-w-xs truncate" title={r.reason}>{r.reason}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${r.status === 'resolved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                                r.status === 'dismissed' ? 'bg-input-app text-muted' :
                                                                    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                                }`}>
                                                                {r.status || 'pending'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-muted">{format(r.createdAt)}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            {(!r.status || r.status === 'pending') ? (
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => handleReportAction(r._id, 'resolved')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition" title="Approve & Ban"><FaCheckCircle /></button>
                                                                    <button onClick={() => handleReportAction(r._id, 'dismissed')} className="p-2 text-muted hover:bg-input-app hover:text-main rounded-lg transition" title="Dismiss"><FaTimesCircle /></button>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-muted italic">Completed</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredReports.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-muted">No reports found</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SUPPORT TAB */}
                        {activeTab === "support" && (
                            <div className="space-y-6 animate-fade-in-up">
                                <div>
                                    <h1 className="text-3xl font-bold text-main mb-2">Support Tickets</h1>
                                    <p className="text-muted">Manage user inquiries and issues.</p>
                                </div>

                                {/* Analytics Section - Redesigned */}
                                <div className="grid grid-cols-1 mb-6">
                                    {/* Rating Distribution Chart */}
                                    <div className="bg-card-app p-6 rounded-2xl border border-app shadow-sm flex flex-col">
                                        <h3 className="text-lg font-bold text-main mb-6">User Rating Distribution</h3>
                                        <div className="h-48 w-full flex-1">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={[
                                                    { rating: '5 Stars', count: tickets.filter(t => t.rating === 5).length },
                                                    { rating: '4 Stars', count: tickets.filter(t => t.rating === 4).length },
                                                    { rating: '3 Stars', count: tickets.filter(t => t.rating === 3).length },
                                                    { rating: '2 Stars', count: tickets.filter(t => t.rating === 2).length },
                                                    { rating: '1 Star', count: tickets.filter(t => t.rating === 1).length },
                                                ]} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="rating" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} width={60} />
                                                    <Tooltip
                                                        cursor={{ fill: 'transparent' }}
                                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                                    />
                                                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24} background={{ fill: '#f1f5f9', radius: [0, 4, 4, 0] }}>
                                                        {tickets.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#34d399' : index === 2 ? '#fbbf24' : '#f87171'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex h-[600px] md:h-[calc(100vh-320px)] gap-6 relative">
                                    {/* Ticket List */}
                                    <div className={`w-full md:w-1/3 bg-card-app rounded-2xl shadow-sm border border-app overflow-hidden flex flex-col ${selectedTicket ? 'hidden md:flex' : 'flex'}`}>
                                        <div className="p-4 border-b border-app bg-card-app/50 backdrop-blur-sm space-y-3">
                                            {/* Search Bar */}
                                            <div className="relative">
                                                <FaSearch className="absolute left-3 top-3 text-muted" />
                                                <input
                                                    type="text"
                                                    placeholder="Search by Ticket ID or Subject..."
                                                    className="w-full pl-10 pr-4 py-2 bg-input-app border border-app rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-main transition shadow-sm"
                                                    value={ticketSearch}
                                                    onChange={(e) => setTicketSearch(e.target.value)}
                                                />
                                            </div>
                                            {/* Filter Tabs */}
                                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                                {["all", "open", "closed", "resolved"].map(status => (
                                                    <button
                                                        key={status}
                                                        onClick={() => setTicketFilter(status)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-all border ${ticketFilter === status
                                                            ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                                                            : 'bg-card-app text-muted border-app hover:bg-input-app hover:text-main'}`}
                                                    >
                                                        {status}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                            {filteredTickets.length === 0 && <p className="text-center text-muted text-sm my-10 flex flex-col items-center"><FaInbox className="text-2xl mb-2 opacity-50" />No tickets found</p>}
                                            {filteredTickets.map(ticket => (
                                                <div
                                                    key={ticket._id}
                                                    onClick={() => setSelectedTicket(ticket)}
                                                    className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 group ${selectedTicket?._id === ticket._id
                                                        ? 'bg-primary/5 border-primary/30 shadow-sm translate-x-1'
                                                        : 'bg-input-app/50 border-transparent hover:border-app hover:bg-input-app'}`}
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${ticket.priority === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                                                            ticket.priority === 'medium' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' : 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                                            }`}>{ticket.priority}</span>
                                                        <span className="text-[10px] text-muted font-medium">{format(ticket.createdAt)}</span>
                                                    </div>
                                                    <h4 className="font-bold text-main text-sm truncate mb-1">{ticket.subject}</h4>

                                                    <div className="flex justify-between items-center mb-1">
                                                        <p className="text-xs text-muted truncate max-w-[60%]">{ticket.user?.name || "Unknown User"}</p>
                                                        <span className={`text-[10px] capitalize px-1.5 rounded ${ticket.status === 'open' ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/10' :
                                                            ticket.status === 'closed' ? 'text-slate-500 bg-slate-100 dark:text-slate-400 dark:bg-slate-800' : 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/10'
                                                            }`}>{ticket.status}</span>
                                                    </div>

                                                    {/* Rating & Feedback Preview IN LIST */}
                                                    {ticket.rating && (
                                                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-app/50">
                                                            <div className="flex text-yellow-400 text-[10px]">
                                                                {[...Array(5)].map((_, i) => (
                                                                    <FaStar key={i} className={i < ticket.rating ? "fill-current" : "text-gray-300 dark:text-gray-600"} />
                                                                ))}
                                                            </div>
                                                            {ticket.feedback && <span className="text-[10px] text-muted italic line-clamp-1">"{ticket.feedback}"</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Ticket Detail / Chat */}
                                    <div className={`flex-1 bg-card-app rounded-2xl shadow-sm border border-app overflow-hidden flex flex-col w-full ${!selectedTicket ? 'hidden md:flex' : 'flex'}`}>
                                        {selectedTicket ? (
                                            <>
                                                <div className="p-4 border-b border-app flex justify-between items-center bg-card-app/80 backdrop-blur-md sticky top-0 z-10">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => setSelectedTicket(null)}
                                                                className="md:hidden p-2 -ml-2 text-main hover:bg-input-app rounded-full transition"
                                                            >
                                                                <FaArrowLeft />
                                                            </button>
                                                            <h3 className="font-bold text-lg text-main flex items-center gap-2">
                                                                {selectedTicket.subject}
                                                                <span className={`text-[10px] px-2 py-1 rounded-lg uppercase tracking-wider ${selectedTicket.status === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                                                                    selectedTicket.status === 'closed' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                                                    }`}>{selectedTicket.status}</span>
                                                            </h3>
                                                        </div>
                                                        <p className="text-xs text-muted mt-0.5">Submitted by <span className="font-bold text-main">{selectedTicket.user?.name}</span> ({selectedTicket.user?.email})</p>
                                                        <div className="flex gap-2 text-[10px] mt-1">
                                                            <span className="bg-input-app px-2 py-0.5 rounded capitalize text-muted">Category: {selectedTicket.category || 'general'}</span>
                                                            {selectedTicket.rating && (
                                                                <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 px-2 py-0.5 rounded flex items-center gap-1">
                                                                    <FaStar size={10} /> {selectedTicket.rating} Star
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {selectedTicket.status !== 'closed' && (
                                                            <button
                                                                onClick={() => handleTicketStatus(selectedTicket._id, 'closed')}
                                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                                                            >
                                                                <FaCheckCircle className="text-xs" /> Close Ticket
                                                            </button>
                                                        )}
                                                        {selectedTicket.status !== 'open' && (
                                                            <button
                                                                onClick={() => handleTicketStatus(selectedTicket._id, 'open')}
                                                                className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-600 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:text-green-400 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                                                            >
                                                                <FaReply className="text-xs" /> Re-open
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-app/50 scroll-smooth">
                                                    {selectedTicket.messages.map((msg, idx) => {
                                                        // Check if sender is admin. 
                                                        // Strategy: If sender is THIS currently logged in admin, or if sender has isAdmin=true in DB (but we might not have that populated deep enough).
                                                        // Best guess: compare sender._id to selectedTicket.user._id. If different, it's support/admin.
                                                        // Improved Sender Check
                                                        const senderId = msg.sender?._id || msg.sender;
                                                        const ticketUserId = selectedTicket.user?._id || selectedTicket.user;
                                                        const isSupport = senderId !== ticketUserId;
                                                        const isMe = senderId === currentUser._id;

                                                        // If I am admin, my messages should look like "Me" (right side). 
                                                        // User messages (left side).
                                                        // Other admins (also right side? or left with different color? Let's stick to Right = Support Team, Left = User)

                                                        // Wait, standard chat: Me (Right), Others (Left).
                                                        // In Admin Panel: 
                                                        // Me (Admin) -> Right
                                                        // User -> Left
                                                        // Other Admin -> Right (Internal team)

                                                        const alignRight = isSupport;

                                                        return (
                                                            <div key={idx} className={`flex ${alignRight ? 'justify-end' : 'justify-start'}`}>
                                                                <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${alignRight ? 'items-end' : 'items-start'}`}>
                                                                    <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm whitespace-pre-wrap leading-relaxed ${alignRight
                                                                        ? 'bg-primary text-white rounded-br-none'
                                                                        : 'bg-white dark:bg-slate-800 border border-app text-main rounded-bl-none'
                                                                        }`}>
                                                                        {msg.text}
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 mt-1.5 px-1">
                                                                        <span className={`text-[10px] font-bold ${alignRight ? 'text-primary' : 'text-main'}`}>
                                                                            {msg.sender?.name || (isSupport ? "Support Agent" : "User")}
                                                                        </span>
                                                                        <span className="text-[10px] text-muted">{format(msg.createdAt)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Rating Feedback Display for Admin */}
                                                {selectedTicket.rating && (
                                                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border-t border-yellow-100 dark:border-yellow-900/30">
                                                        <div className="flex items-start gap-3">
                                                            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-full">
                                                                <FaStar />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-main text-sm flex items-center gap-2">
                                                                    User Rating: {selectedTicket.rating}/5
                                                                </h4>
                                                                {selectedTicket.feedback && (
                                                                    <p className="text-sm text-muted mt-1 italic">"{selectedTicket.feedback}"</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="p-4 border-t border-app bg-card-app/80 backdrop-blur-md">
                                                    <form onSubmit={handleTicketReply} className="flex gap-3">
                                                        <input
                                                            type="text"
                                                            value={ticketReply}
                                                            onChange={(e) => setTicketReply(e.target.value)}
                                                            className="flex-1 bg-input-app border border-app rounded-2xl px-5 py-3 text-main focus:ring-2 focus:ring-primary/50 outline-none transition shadow-sm"
                                                            placeholder="Type a reply..."
                                                            disabled={selectedTicket.status === 'closed'}
                                                        />
                                                        <button
                                                            type="submit"
                                                            className="p-3.5 bg-primary text-white rounded-2xl hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-95"
                                                            disabled={!ticketReply.trim() || selectedTicket.status === 'closed'}
                                                        >
                                                            <FaPaperPlane className="text-lg" />
                                                        </button>
                                                    </form>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center text-muted p-8 text-center bg-app/50">
                                                <div className="w-20 h-20 bg-card-app rounded-3xl flex items-center justify-center mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5">
                                                    <FaLifeRing className="text-4xl text-primary/50" />
                                                </div>
                                                <p className="font-medium text-main">Select a ticket to view details</p>
                                                <p className="text-sm mt-1">You can reply to inquiries or manage ticket status.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BROADCAST TAB */}
                        {activeTab === "broadcast" && (
                            <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">System Broadcast</h1>
                                    <p className="text-slate-500 dark:text-slate-400">Send real-time notifications to all connected users.</p>
                                </div>
                                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-800">
                                    <div className="flex items-center gap-4 mb-6 text-indigo-600 dark:text-indigo-400">
                                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                                            <FaBroadcastTower size={28} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Create Announcement</h3>
                                            <p className="text-sm text-slate-500">This message will appear instantly on everyone's screen.</p>
                                        </div>
                                    </div>
                                    <form onSubmit={handleBroadcast}>
                                        <textarea
                                            className="w-full p-4 bg-input-app border border-app rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all text-main min-h-[150px] resize-none mb-6 placeholder-muted"
                                            placeholder="Type your message here..."
                                            value={broadcastMessage}
                                            onChange={(e) => setBroadcastMessage(e.target.value)}
                                            required
                                        ></textarea>
                                        <div className="flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={!broadcastMessage.trim()}
                                                className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-secondary text-white font-bold rounded-xl shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <FaPaperPlane /> Send Broadcast
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* SETTINGS TAB */}
                        {activeTab === "settings" && (
                            <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up">
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">System Settings</h1>
                                    <p className="text-slate-500 dark:text-slate-400">Manage platform configuration and maintenance.</p>
                                </div>

                                {/* Maintenance & Registration */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Maintenance Mode */}
                                    <div className="bg-card-app rounded-2xl shadow-sm border border-app p-8">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-xl h-fit">
                                                <FaBan size={24} />
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={settings.maintenanceMode}
                                                    onChange={(e) => {
                                                        if (confirm(e.target.checked ? "Enable Maintenance Mode? Users will be locked out." : "Disable Maintenance Mode?")) {
                                                            updateSetting("maintenanceMode", e.target.checked);
                                                        }
                                                    }}
                                                />
                                                <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/50 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                                            </label>
                                        </div>
                                        <h3 className="font-bold text-lg text-main">Maintenance Mode</h3>
                                        <p className="text-sm text-muted mt-1">
                                            Lock the application for all non-admin users.
                                        </p>
                                    </div>

                                    {/* Allow Registration */}
                                    <div className="bg-card-app rounded-2xl shadow-sm border border-app p-8">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-xl h-fit">
                                                <FaCheckCircle size={24} />
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={settings.allowRegistration}
                                                    onChange={(e) => updateSetting("allowRegistration", e.target.checked)}
                                                />
                                                <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/50 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                                            </label>
                                        </div>
                                        <h3 className="font-bold text-lg text-main">Allow Registration</h3>
                                        <p className="text-sm text-muted mt-1">
                                            Let new users create accounts.
                                        </p>
                                    </div>
                                </div>

                                {/* General Config */}
                                <div className="bg-card-app rounded-2xl shadow-sm border border-app p-8 space-y-6">
                                    <h3 className="font-bold text-lg text-main mb-4">General Configuration</h3>

                                    <div>
                                        <label className="block text-sm font-bold text-main mb-2">Application Name</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 px-4 py-2 border border-app rounded-xl bg-input-app text-main focus:ring-2 focus:ring-primary outline-none"
                                                value={settings.siteName}
                                                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                                            />
                                            <button
                                                onClick={() => updateSetting("siteName", settings.siteName)}
                                                className="px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-secondary transition"
                                            >Save</button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-main mb-2">Global System Banner</label>
                                        <p className="text-xs text-muted mb-2">A prominent message displayed at the top of every page (e.g., "Server Restart in 10 mins"). Leave empty to hide.</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 px-4 py-2 border border-app rounded-xl bg-input-app text-main focus:ring-2 focus:ring-primary outline-none"
                                                placeholder="Enter banner message..."
                                                value={settings.systemBanner}
                                                onChange={(e) => setSettings({ ...settings, systemBanner: e.target.value })}
                                            />
                                            <button
                                                onClick={() => updateSetting("systemBanner", settings.systemBanner)}
                                                className="px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-secondary transition"
                                            >Save</button>
                                        </div>
                                    </div>

                                </div>

                                {/* Data Export */}
                                <div className="bg-card-app rounded-2xl shadow-sm border border-app p-8">
                                    <h3 className="font-bold text-lg text-main mb-6">Data Management</h3>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => {
                                                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(users, null, 2));
                                                const downloadAnchorNode = document.createElement('a');
                                                downloadAnchorNode.setAttribute("href", dataStr);
                                                downloadAnchorNode.setAttribute("download", "chitchat_users.json");
                                                document.body.appendChild(downloadAnchorNode); // required for firefox
                                                downloadAnchorNode.click();
                                                downloadAnchorNode.remove();
                                            }}
                                            className="px-6 py-3 bg-input-app text-muted font-bold rounded-xl hover:bg-border-app transition"
                                        >
                                            Export Users (JSON)
                                        </button>
                                        <button
                                            onClick={() => {
                                                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reports, null, 2));
                                                const downloadAnchorNode = document.createElement('a');
                                                downloadAnchorNode.setAttribute("href", dataStr);
                                                downloadAnchorNode.setAttribute("download", "chitchat_reports.json");
                                                document.body.appendChild(downloadAnchorNode); // required for firefox
                                                downloadAnchorNode.click();
                                                downloadAnchorNode.remove();
                                            }}
                                            className="px-6 py-3 bg-input-app text-muted font-bold rounded-xl hover:bg-border-app transition"
                                        >
                                            Export Reports (JSON)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div >
        </Layout >
    );
}

// Sub-component for Stats
function StatsCard({ icon: Icon, label, value, sub, color }) {
    const colors = {
        indigo: "from-indigo-500 to-indigo-600 shadow-indigo-500/20",
        emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/20",
        red: "from-red-500 to-rose-600 shadow-red-500/20",
        orange: "from-orange-500 to-amber-600 shadow-orange-500/20",
    };

    return (
        <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300`}>
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                <Icon size={100} />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Icon size={20} />
                    </div>
                    <span className="font-semibold text-white/90">{label}</span>
                </div>
                <h3 className="text-3xl font-bold mb-1">{value}</h3>
                <p className="text-white/70 text-sm">{sub}</p>
            </div>
        </div>
    );
}
