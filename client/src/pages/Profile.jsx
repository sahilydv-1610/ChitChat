import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";
import { FaPen, FaSave, FaCheck, FaLock, FaTrash, FaShieldAlt, FaHistory, FaCamera, FaTimes, FaMapMarkerAlt, FaUser, FaInfoCircle, FaEye, FaEyeSlash, FaToggleOn, FaToggleOff, FaBell, FaSun, FaMoon, FaSignOutAlt, FaCog, FaLocationArrow } from "react-icons/fa";
import { axiosInstance } from "../config";
import UserAvatar from "../components/UserAvatar";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { format } from "timeago.js";

const AVATAR_COLORS = [
    "bg-red-500", "bg-orange-500", "bg-amber-500",
    "bg-green-500", "bg-emerald-500", "bg-teal-500",
    "bg-cyan-500", "bg-sky-500", "bg-blue-500",
    "bg-indigo-500", "bg-violet-500", "bg-purple-500",
    "bg-fuchsia-500", "bg-pink-500", "bg-rose-500"
];

export default function Profile() {
    const { user, dispatch } = useContext(AuthContext);
    const { theme, setTheme, colorTheme, setColorTheme } = useContext(ThemeContext);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeSection, setActiveSection] = useState("profile"); // profile, privacy, security
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Check initial permission
        const stored = localStorage.getItem('notifications') === 'true';
        const permission = Notification.permission === 'granted';
        setNotificationsEnabled(stored && permission);
    }, []);

    const handleNotificationToggle = async () => {
        if (!notificationsEnabled) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                setNotificationsEnabled(true);
                localStorage.setItem('notifications', 'true');
                new Notification("Notifications Enabled", { body: "You will now receive alerts for messages and calls." });
            } else {
                alert("Permission denied. Please enable notifications in your browser settings.");
            }
        } else {
            setNotificationsEnabled(false);
            localStorage.setItem('notifications', 'false');
        }
    };

    const handleSaveTheme = async () => {
        try {
            // Need to update both standard fields and themePreference object
            // Just sending themePreference object to /users/:id PUT route should populate it if we added it to schema
            // Route uses $set: req.body, so { themePreference: { theme, colorTheme } } works.
            const updateData = {
                userId: user._id,
                themePreference: {
                    theme: theme,
                    colorTheme: colorTheme
                }
            };

            const res = await axiosInstance.put("/users/" + user._id, updateData);
            dispatch({ type: "UPDATE_USER", payload: res.data });
            alert("Theme preferences saved to your account!");
        } catch (err) {
            console.error("Failed to save theme:", err);
            alert("Failed to save theme preferences.");
        }
    };

    // Form Data
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Initialize form data
    const [formData, setFormData] = useState({
        name: user.name || "",
        email: user.email || "",
        mobile: user.mobile || "",
        dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : "",
        avatarColor: user.avatarColor || "",
        bio: user.bio || "",
        location: user.location || "",

        // Privacy Settings
        lastSeen: user.privacy?.lastSeen ?? true,
        readReceipts: user.privacy?.readReceipts ?? true,
        blockedUsers: user.blockedUsers || [],
        blockedUsersList: [], // For UI display

        // Socials
        socials: {
            instagram: user.socials?.instagram || "",
            twitter: user.socials?.twitter || "",
            linkedin: user.socials?.linkedin || ""
        },
        address: {
            village: user.address?.village || "",
            city: user.address?.city || "",
            tehsil: user.address?.tehsil || "",
            district: user.address?.district || "",
            state: user.address?.state || "",
            country: user.address?.country || "",
            pincode: user.address?.pincode || ""
        }
    });

    // Update local state if user context updates
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            name: user.name || "",
            email: user.email || "",
            mobile: user.mobile || "",
            dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : "",
            avatarColor: user.avatarColor || "",
            bio: user.bio || "",
            location: user.location || "",
            lastSeen: user.privacy?.lastSeen ?? true,
            readReceipts: user.privacy?.readReceipts ?? true,
            readReceipts: user.privacy?.readReceipts ?? true,
            blockedUsers: user.blockedUsers || [],
            socials: {
                instagram: user.socials?.instagram || "",
                twitter: user.socials?.twitter || "",
                linkedin: user.socials?.linkedin || ""
            },
            address: {
                village: user.address?.village || "",
                city: user.address?.city || "",
                tehsil: user.address?.tehsil || "",
                district: user.address?.district || "",
                state: user.address?.state || "",
                country: user.address?.country || "",
                pincode: user.address?.pincode || ""
            }
        }));
    }, [user]);

    // Fetch Blocked User Details
    useEffect(() => {
        const fetchBlockedUsers = async () => {
            if (activeSection === "privacy" && user.blockedUsers?.length > 0) {
                try {
                    const res = await axiosInstance.get(`/users/${user._id}/blocked`);
                    setFormData(prev => ({ ...prev, blockedUsersList: res.data }));
                } catch (err) {
                    console.error(err);
                }
            } else if (activeSection === "privacy") {
                setFormData(prev => ({ ...prev, blockedUsersList: [] }));
            }
        };
        fetchBlockedUsers();
    }, [activeSection, user.blockedUsers, user._id]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name.startsWith("social_")) {
            const socialPlatform = name.split("_")[1];
            setFormData(prev => ({
                ...prev,
                socials: {
                    ...prev.socials,
                    [socialPlatform]: value
                }
            }));
        } else if (name.startsWith("addr_")) {
            const field = name.split("_")[1];
            setFormData(prev => ({
                ...prev,
                address: {
                    ...prev.address,
                    [field]: value
                }
            }));
        } else {
            setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
        }
    };

    const handleColorSelect = (color) => {
        if (!isEditing) return;
        setFormData({ ...formData, avatarColor: color });
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }

        setLoading(true); // Re-using loading state, or create specific one if needed, but loading is fine
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const data = await res.json();
                const addr = data.address || {};

                // Extract granular details
                const newAddress = {
                    village: addr.village || addr.hamlet || addr.suburb || "",
                    city: addr.city || addr.town || addr.municipality || "",
                    tehsil: addr.county || addr.suburb || "",
                    district: addr.state_district || addr.district || "",
                    state: addr.state || "",
                    country: addr.country || "",
                    pincode: addr.postcode || ""
                };

                const formattedLoc = [newAddress.city, newAddress.state, newAddress.country].filter(Boolean).join(", ");

                setFormData(prev => ({
                    ...prev,
                    location: formattedLoc,
                    address: newAddress
                }));
            } catch (error) {
                console.error("Error fetching location:", error);
                alert("Failed to fetch location details.");
            } finally {
                setLoading(false);
            }
        }, (error) => {
            console.error("Geolocation error:", error);
            alert("Unable to retrieve your location.");
            setLoading(false);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (formData.password && formData.password !== formData.confirmPassword) {
            alert("Passwords do not match!");
            setLoading(false);
            return;
        }

        const updateData = {
            userId: user._id,
            name: formData.name,
            mobile: formData.mobile,
            dob: formData.dob,
            avatarColor: formData.avatarColor,
            bio: formData.bio,
            location: formData.location,
            privacy: {
                lastSeen: formData.lastSeen,
                readReceipts: formData.readReceipts
            },
            socials: formData.socials,
            address: formData.address
        };

        if (formData.password) {
            updateData.password = formData.password;
        }

        try {
            const res = await axiosInstance.put("/users/" + user._id, updateData);
            dispatch({ type: "UPDATE_USER", payload: res.data });
            setIsEditing(false);
            setFormData(prev => ({ ...prev, password: "", confirmPassword: "" }));
        } catch (err) {
            console.error(err);
            alert("Update failed. Please try again.");
        }
        setLoading(false);
    };

    const handleDeleteAccount = async () => {
        if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
            try {
                await axiosInstance.delete("/users/" + user._id, { data: { userId: user._id } });
                dispatch({ type: "LOGOUT" });
                navigate("/login");
            } catch (err) {
                console.error(err);
                alert("Failed to delete account.");
            }
        }
    };

    const previewUser = {
        ...user,
        name: formData.name,
        avatarColor: formData.avatarColor
    };

    const navItems = [
        { id: "profile", icon: FaUser, label: "Profile" },
        { id: "settings", icon: FaCog, label: "App Settings" },
        { id: "privacy", icon: FaLock, label: "Privacy" },
        { id: "security", icon: FaShieldAlt, label: "Security" },
    ];

    return (
        <Layout>
            <div className="flex h-full bg-app overflow-hidden">
                {/* Desktop Sidebar (Left Panel) */}
                <div className="w-full md:w-72 bg-card-app border-r border-app flex flex-col hidden md:flex">
                    <div className="p-8 pb-6">
                        <h1 className="text-2xl font-bold text-main mb-2">Settings</h1>
                        <p className="text-sm text-muted">Personalize your chat experience.</p>
                    </div>
                    <nav className="flex-1 px-4 space-y-1">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-all duration-200 ${activeSection === item.id
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted hover:bg-input-app hover:text-main"
                                    }`}
                            >
                                <item.icon size={16} />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>

                    <div className="p-6 border-t border-app">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-input-app">
                            <UserAvatar user={user} size="sm" className="w-10 h-10 text-xs" />
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-main truncate text-sm">{user.name}</p>
                                <p className="text-xs text-muted truncate">{user.email}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto relative scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">

                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                        {/* Mobile Tabs */}
                        <div className="md:hidden flex overflow-x-auto gap-2 mb-8 pb-2 no-scrollbar">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveSection(item.id)}
                                    className={`px-5 py-2.5 rounded-full text-sm font-bold shadow-sm whitespace-nowrap transition-colors border ${activeSection === item.id ? "bg-primary text-white border-primary" : "bg-card-app text-muted border-app"}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        {/* Content Container */}
                        <div className="space-y-6">

                            {/* Profile Section */}
                            {activeSection === "profile" && (
                                <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
                                    {/* Identity Card */}
                                    <div className="bg-card-app rounded-2xl p-6 shadow-sm border border-app flex flex-col items-center text-center">
                                        <div className="relative group cursor-pointer" onClick={() => setIsEditing(true)}>
                                            <UserAvatar user={previewUser} size="xl" isOnline={true} showStatus={false} className="w-32 h-32 text-5xl shadow-xl" />
                                            {isEditing && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <FaCamera className="text-white text-xl" />
                                                </div>
                                            )}
                                        </div>

                                        {!isEditing ? (
                                            <div className="mt-4">
                                                <h2 className="text-2xl font-bold text-main">{user.name}</h2>
                                                <p className="text-muted">{user.email}</p>
                                                <button type="button" onClick={() => setIsEditing(true)} className="mt-4 px-6 py-2 bg-primary/10 text-primary rounded-full text-sm font-bold hover:bg-primary/20 transition">
                                                    Edit Profile
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="mt-6 w-full max-w-sm space-y-4">
                                                <div className="grid grid-cols-5 gap-3 justify-center">
                                                    {AVATAR_COLORS.map(c => (
                                                        <button key={c} type="button" onClick={() => handleColorSelect(c)} className={`w-8 h-8 rounded-full ${c} mx-auto transition-transform ${formData.avatarColor === c ? "ring-2 ring-offset-2 ring-indigo-500 scale-110" : "hover:scale-105"}`}></button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Fields */}
                                    <div className="bg-card-app rounded-2xl p-6 shadow-sm border border-app">
                                        <h3 className="text-lg font-bold text-main mb-6">About info</h3>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-xs font-bold text-muted uppercase flex items-center gap-2 mb-2"><FaUser /> Name</label>
                                                <input disabled={!isEditing} name="name" value={formData.name} onChange={handleChange} className="w-full p-3 bg-input-app rounded-xl border-transparent focus:border-primary focus:ring-0 text-main font-medium transition-all" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-muted uppercase flex items-center gap-2 mb-2"><FaInfoCircle /> About</label>
                                                <input disabled={!isEditing} name="bio" value={formData.bio} onChange={handleChange} placeholder="Hey there! I am using ChitChat." className="w-full p-3 bg-input-app rounded-xl border-transparent focus:border-primary focus:ring-0 text-main font-medium transition-all" />
                                            </div>
                                            {/* Detailed Address Section */}
                                            <div className="pt-4 border-t border-app">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-sm font-bold text-muted uppercase">Detailed Address</h4>
                                                    {isEditing && (
                                                        <button
                                                            type="button"
                                                            onClick={handleGetLocation}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors"
                                                        >
                                                            <FaMapMarkerAlt /> Auto Detect
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <input disabled={!isEditing} name="addr_village" value={formData.address?.village} onChange={handleChange} placeholder="Village/Locality" className="w-full p-3 bg-input-app rounded-xl border-transparent focus:border-primary focus:ring-0 text-main font-medium transition-all" />
                                                    <input disabled={!isEditing} name="addr_city" value={formData.address?.city} onChange={handleChange} placeholder="City/Town" className="w-full p-3 bg-input-app rounded-xl border-transparent focus:border-primary focus:ring-0 text-main font-medium transition-all" />
                                                    <input disabled={!isEditing} name="addr_tehsil" value={formData.address?.tehsil} onChange={handleChange} placeholder="Tehsil/Taluka" className="w-full p-3 bg-input-app rounded-xl border-transparent focus:border-primary focus:ring-0 text-main font-medium transition-all" />
                                                    <input disabled={!isEditing} name="addr_district" value={formData.address?.district} onChange={handleChange} placeholder="District" className="w-full p-3 bg-input-app rounded-xl border-transparent focus:border-primary focus:ring-0 text-main font-medium transition-all" />
                                                    <input disabled={!isEditing} name="addr_state" value={formData.address?.state} onChange={handleChange} placeholder="State" className="w-full p-3 bg-input-app rounded-xl border-transparent focus:border-primary focus:ring-0 text-main font-medium transition-all" />
                                                    <input disabled={!isEditing} name="addr_country" value={formData.address?.country} onChange={handleChange} placeholder="Country" className="w-full p-3 bg-input-app rounded-xl border-transparent focus:border-primary focus:ring-0 text-main font-medium transition-all" />
                                                    <input disabled={!isEditing} name="addr_pincode" value={formData.address?.pincode} onChange={handleChange} placeholder="Pincode" className="col-span-2 w-full p-3 bg-input-app rounded-xl border-transparent focus:border-primary focus:ring-0 text-main font-medium transition-all" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-muted uppercase mb-2 block">Mobile</label>
                                                    <input disabled={!isEditing} name="mobile" value={formData.mobile} onChange={handleChange} className="w-full p-3 bg-input-app rounded-xl border-transparent focus:border-primary focus:ring-0 text-main font-medium transition-all" />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-muted uppercase mb-2 block">Birthday</label>
                                                    <input type="date" disabled={!isEditing} name="dob" value={formData.dob} onChange={handleChange} className="w-full p-3 bg-input-app rounded-xl border-transparent focus:border-primary focus:ring-0 text-main font-medium transition-all" />
                                                </div>
                                            </div>

                                            {/* Social Links Section */}
                                            <div className="pt-4 border-t border-app">
                                                <h4 className="text-sm font-bold text-muted uppercase mb-4">Social Profiles</h4>
                                                <div className="grid gap-4">
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <span className="text-pink-500 font-bold">IG</span>
                                                        </div>
                                                        <input
                                                            disabled={!isEditing}
                                                            name="social_instagram"
                                                            value={formData.socials.instagram}
                                                            onChange={handleChange}
                                                            placeholder="Instagram Username"
                                                            className="w-full pl-10 p-3 bg-input-app rounded-xl border-transparent focus:border-primary focus:ring-0 text-main font-medium transition-all"
                                                        />
                                                    </div>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <span className="text-blue-400 font-bold">X</span>
                                                        </div>
                                                        <input
                                                            disabled={!isEditing}
                                                            name="social_twitter"
                                                            value={formData.socials.twitter}
                                                            onChange={handleChange}
                                                            placeholder="Twitter/X Handle"
                                                            className="w-full pl-10 p-3 bg-input-app rounded-xl border-transparent focus:border-primary focus:ring-0 text-main font-medium transition-all"
                                                        />
                                                    </div>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                            <span className="text-blue-700 font-bold">In</span>
                                                        </div>
                                                        <input
                                                            disabled={!isEditing}
                                                            name="social_linkedin"
                                                            value={formData.socials.linkedin}
                                                            onChange={handleChange}
                                                            placeholder="LinkedIn Profile"
                                                            className="w-full pl-10 p-3 bg-input-app rounded-xl border-transparent focus:border-primary focus:ring-0 text-main font-medium transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {isEditing && (
                                        <div className="sticky bottom-4 flex justify-end gap-3 z-20">
                                            <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-3 rounded-xl font-bold bg-card-app text-muted shadow-lg border border-app hover:bg-input-app transition">Cancel</button>
                                            <button type="submit" disabled={loading} className="px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 transition flex items-center gap-2">
                                                {loading ? "Saving..." : "Save Changes"}
                                            </button>
                                        </div>
                                    )}
                                </form>
                            )}

                            {/* App Settings with Notifications */}
                            {/* App Settings */}
                            {activeSection === "settings" && (
                                <div className="glass-card bg-card-app rounded-3xl p-8 shadow-xl border border-app mb-8 animate-fade-in">
                                    <h3 className="text-xl font-bold text-main mb-6 flex items-center gap-3">
                                        <FaCog className="text-primary" /> App Settings
                                    </h3>
                                    <div className="space-y-6">
                                        {/* Appearance / Theme */}
                                        <div className="p-4 bg-input-app rounded-2xl border border-app space-y-4">
                                            {/* Light/Dark Toggle */}
                                            {/* Background Theme Selector */}
                                            <div>
                                                <h3 className="font-bold text-main mb-3">Background Theme</h3>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    {[
                                                        { id: 'light', label: 'Light', bg: 'bg-slate-100', text: 'text-slate-900', border: 'border-slate-300' },
                                                        { id: 'dark', label: 'Slate', bg: 'bg-slate-900', text: 'text-slate-100', border: 'border-slate-700' },
                                                        { id: 'midnight', label: 'Midnight', bg: 'bg-[#000000]', text: 'text-white', border: 'border-zinc-800' },
                                                        { id: 'navy', label: 'Navy', bg: 'bg-[#0a1128]', text: 'text-white', border: 'border-blue-900' },
                                                        { id: 'forest', label: 'Forest', bg: 'bg-[#052e16]', text: 'text-white', border: 'border-emerald-900' },
                                                        { id: 'sunset', label: 'Sunset', bg: 'bg-[#450a0a]', text: 'text-white', border: 'border-red-900' },
                                                    ].map((t) => (
                                                        <button
                                                            key={t.id}
                                                            onClick={() => setTheme(t.id)}
                                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${t.bg} ${t.text} ${theme === t.id ? 'ring-2 ring-primary border-transparent shadow-lg scale-[1.02]' : `${t.border} opacity-80 hover:opacity-100`}`}
                                                        >
                                                            <div className={`w-4 h-4 rounded-full border border-current ${theme === t.id ? 'bg-primary border-none' : ''}`}></div>
                                                            <span className="text-sm font-medium">{t.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="w-full h-px bg-border sm:bg-border/50" />

                                            {/* Color Theme Selector */}
                                            <div>
                                                <h3 className="font-bold text-main mb-3">Accent Color</h3>
                                                <div className="flex flex-wrap gap-3">
                                                    {[
                                                        { id: 'violet', bg: 'bg-violet-600' },
                                                        { id: 'blue', bg: 'bg-blue-600' },
                                                        { id: 'emerald', bg: 'bg-emerald-600' },
                                                        { id: 'rose', bg: 'bg-rose-600' },
                                                        { id: 'amber', bg: 'bg-amber-500' },
                                                    ].map((c) => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => setColorTheme(c.id)}
                                                            className={`w-10 h-10 rounded-full ${c.bg} flex items-center justify-center transition-transform hover:scale-110 shadow-lg ${colorTheme === c.id ? "ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-500 scale-110" : "opacity-70 hover:opacity-100"}`}
                                                        >
                                                            {colorTheme === c.id && <FaCheck className="text-white text-sm" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 flex justify-end animate-fade-in">
                                            <button
                                                type="button"
                                                onClick={handleSaveTheme}
                                                className="px-6 py-2.5 bg-main text-card-app rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg flex items-center gap-2"
                                            >
                                                <FaSave /> Save Appearance
                                            </button>
                                        </div>

                                        {/* Notifications */}
                                        <div className="flex items-center justify-between p-4 bg-input-app rounded-2xl border border-app">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl ${notificationsEnabled ? 'bg-primary/10 text-primary' : 'bg-app text-muted'}`}>
                                                    <FaBell size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-main">Push Notifications</h3>
                                                    <p className="text-sm text-muted">Get alerts for messages and calls</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleNotificationToggle}
                                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 ${notificationsEnabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                                            >
                                                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 shadow-md ${notificationsEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                                            </button>
                                        </div>

                                        {notificationsEnabled && (
                                            <div className="flex justify-end animate-fade-in">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (Notification.permission === 'granted') {
                                                            new Notification("Test Notification", { body: "Notifications are working properly!" });
                                                        } else {
                                                            alert("Permission not granted.");
                                                        }
                                                    }}
                                                    className="px-4 py-2 text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors"
                                                >
                                                    Send Test Notification
                                                </button>
                                            </div>
                                        )}

                                        {/* Logout */}
                                        <div className="pt-4 border-t border-app">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    dispatch({ type: "LOGOUT" });
                                                    window.location.href = "/login";
                                                }}
                                                className="w-full p-4 flex items-center justify-center gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-2xl transition-all duration-300 group"
                                            >
                                                <FaSignOutAlt className="group-hover:translate-x-1 transition-transform" />
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Privacy Section */}
                            {activeSection === "privacy" && (
                                <form onSubmit={handleSubmit} className="animate-fade-in space-y-6">
                                    <div className="glass-card bg-card-app rounded-3xl p-8 shadow-xl border border-app">
                                        <div className="mb-6">
                                            <h3 className="text-xl font-bold text-main">Privacy Controls</h3>
                                            <p className="text-muted text-sm">Manage who can see your personal info</p>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between pb-6 border-b border-app">
                                                <div>
                                                    <p className="font-bold text-main">Last Seen</p>
                                                    <p className="text-xs text-muted">Allow users to see when you were last active</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" name="lastSeen" checked={formData.lastSeen} onChange={handleChange} className="sr-only peer" />
                                                    <div className="w-11 h-6 bg-input-app peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                                </label>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-main">Read Receipts</p>
                                                    <p className="text-xs text-muted">Show blue ticks when you read messages</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" name="readReceipts" checked={formData.readReceipts} onChange={handleChange} className="sr-only peer" />
                                                    <div className="w-11 h-6 bg-input-app peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="mt-8 flex justify-end">
                                            <button type="submit" className="px-6 py-2.5 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition shadow-sm">Save Privacy Settings</button>
                                        </div>
                                    </div>

                                    {/* Blocked Users Section */}
                                    <div className="glass-card bg-card-app rounded-3xl p-8 shadow-xl border border-app">
                                        <h3 className="text-xl font-bold text-main flex items-center gap-2 mb-6"><FaShieldAlt className="text-red-500" /> Blocked Contacts</h3>
                                        {formData.blockedUsers?.length > 0 ? (
                                            <div className="space-y-4">
                                                {formData.blockedUsersList?.map(blockedUser => (
                                                    <div key={blockedUser._id} className="flex items-center justify-between p-4 bg-input-app rounded-2xl border border-app">
                                                        <div className="flex items-center gap-4">
                                                            <UserAvatar user={blockedUser} size="md" />
                                                            <span className="font-bold text-main">{blockedUser.name}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={async () => {
                                                                try {
                                                                    await axiosInstance.put(`/users/${blockedUser._id}/unblock`, { userId: user._id });
                                                                    // Update local state
                                                                    const updatedList = formData.blockedUsersList.filter(u => u._id !== blockedUser._id);
                                                                    const updatedIds = formData.blockedUsers.filter(id => id !== blockedUser._id);
                                                                    setFormData(prev => ({ ...prev, blockedUsersList: updatedList, blockedUsers: updatedIds }));
                                                                    // Update Context
                                                                    dispatch({
                                                                        type: "UPDATE_USER",
                                                                        payload: { ...user, blockedUsers: updatedIds }
                                                                    });
                                                                } catch (err) {
                                                                    console.error(err);
                                                                    alert("Failed to unblock user.");
                                                                }
                                                            }}
                                                            className="px-4 py-2 bg-card-app border border-app text-muted rounded-xl text-xs font-bold hover:bg-input-app transition"
                                                        >
                                                            Unblock
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-muted">
                                                <div className="inline-flex justify-center items-center w-12 h-12 rounded-full bg-input-app mb-3">
                                                    <FaShieldAlt className="text-muted" />
                                                </div>
                                                <p>You have not blocked any contacts yet.</p>
                                            </div>
                                        )}
                                    </div>
                                </form>
                            )}

                            {/* Security Section */}
                            {activeSection === "security" && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-card-app rounded-2xl p-6 shadow-sm border border-app">
                                        <h3 className="text-lg font-bold text-main mb-6">Password</h3>
                                        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
                                            <div className="relative">
                                                <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} placeholder="New Password" className="w-full p-3 bg-app rounded-xl border border-app focus:ring-2 focus:ring-primary transition-all text-main" />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">{showPassword ? <FaEyeSlash /> : <FaEye />}</button>
                                            </div>
                                            <div className="relative">
                                                <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm Password" className="w-full p-3 bg-app rounded-xl border border-app focus:ring-2 focus:ring-primary transition-all text-main" />
                                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted">{showConfirmPassword ? <FaEyeSlash /> : <FaEye />}</button>
                                            </div>
                                            <button disabled={!formData.password} type="submit" className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition disabled:opacity-50">Change Password</button>
                                        </form>
                                    </div>

                                    <div className="bg-card-app rounded-2xl p-6 shadow-sm border border-app">
                                        <h3 className="text-lg font-bold text-red-500 mb-2">Delete Account</h3>
                                        <p className="text-sm text-muted mb-4">Permanently remove your account and all message history.</p>
                                        <button onClick={handleDeleteAccount} className="px-4 py-2 bg-red-500/10 text-red-500 rounded-lg text-sm font-bold hover:bg-red-500/20 transition">Delete Account</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
