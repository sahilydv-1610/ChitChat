import React from 'react';
import { FaTimes, FaEnvelope, FaMapMarkerAlt, FaPhone, FaCalendarAlt, FaUser, FaBirthdayCake, FaClock, FaShieldAlt, FaInstagram, FaTwitter, FaLinkedin } from 'react-icons/fa';
import UserAvatar from '../UserAvatar';
import { format } from 'timeago.js';

export default function UserProfileModal({ isOpen, onClose, user, isOnline }) {
    if (!isOpen || !user) return null;

    // Helper to format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const isSystem = user.isSystem || user._id === "system-broadcast";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-card-app/95 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">

                {/* Header / Cover Area */}
                <div className={`h-40 relative w-full overflow-hidden ${isSystem ? 'bg-gradient-to-r from-slate-800 to-slate-900' : 'bg-gradient-to-br from-primary/30 via-secondary/30 to-primary/10'}`}>
                    {/* Decorative Circles */}
                    <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/20 text-white hover:bg-black/40 backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-10"
                    >
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* Avatar & Main Info */}
                <div className="px-6 relative -mt-20 flex flex-col items-center text-center pb-6 border-b border-app">
                    <div className="p-2 bg-card-app rounded-full shadow-2xl relative">
                        <UserAvatar user={user} size="xl" isOnline={isOnline} showStatus={true} className="w-32 h-32 text-5xl shadow-inner" />
                        {isSystem && (
                            <div className="absolute bottom-2 right-2 bg-blue-500 text-white rounded-full p-2 border-4 border-card-app" title="System Account">
                                <FaShieldAlt size={14} />
                            </div>
                        )}
                    </div>

                    <h2 className="mt-4 text-3xl font-extrabold text-main tracking-tight">{user.name}</h2>

                    {!isSystem ? (
                        <div className="mt-2 space-y-1">
                            <p className="text-muted font-medium text-sm px-4 leading-relaxed">
                                {user.bio || "No bio set"}
                            </p>
                            {/* Status Pill */}
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-input-app/50 border border-app mt-2">
                                <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`}></div>
                                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                                    {isOnline ? "Active Now" : (user.lastSeen ? `Last seen ${format(user.lastSeen)}` : "Offline")}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-blue-400 font-bold mt-2 text-sm bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                            Official Application System
                        </p>
                    )}
                </div>

                {/* Details Scroll Area */}
                <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin">
                    {!isSystem && (
                        <>
                            {/* Contact Section */}
                            <div className="bg-input-app/30 rounded-2xl p-4 border border-app space-y-4">
                                <h3 className="text-xs font-bold text-muted uppercase tracking-wider opacity-70 mb-2 px-1">Contact Info</h3>

                                <div className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <FaEnvelope size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-muted font-medium">Email Address</p>
                                        <p className="text-main font-semibold truncate hover:text-primary transition-colors cursor-text selection:bg-primary/20">{user.email}</p>
                                    </div>
                                </div>

                                {user.mobile && (
                                    <div className="flex items-center gap-4 group">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FaPhone size={16} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-muted font-medium">Mobile Number</p>
                                            <p className="text-main font-semibold">{user.mobile}</p>
                                        </div>
                                    </div>
                                )}

                                {user.socials?.instagram && (
                                    <a
                                        href={`https://instagram.com/${user.socials.instagram}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-4 group cursor-pointer hover:bg-input-app/50 p-2 -mx-2 rounded-xl transition-all"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-red-500/20">
                                            <FaInstagram size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-muted font-medium">Instagram</p>
                                            <p className="text-main font-bold text-sm">@{user.socials.instagram}</p>
                                        </div>
                                        <div className="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                            Visit &rarr;
                                        </div>
                                    </a>
                                )}

                                {user.socials?.twitter && (
                                    <a
                                        href={`https://twitter.com/${user.socials.twitter}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-4 group cursor-pointer hover:bg-input-app/50 p-2 -mx-2 rounded-xl transition-all"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-black/20">
                                            <FaTwitter size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-muted font-medium">Twitter / X</p>
                                            <p className="text-main font-bold text-sm">@{user.socials.twitter}</p>
                                        </div>
                                        <div className="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                            Visit &rarr;
                                        </div>
                                    </a>
                                )}

                                {user.socials?.linkedin && (
                                    <a
                                        href={`https://linkedin.com/in/${user.socials.linkedin}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-4 group cursor-pointer hover:bg-input-app/50 p-2 -mx-2 rounded-xl transition-all"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-[#0077b5] text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
                                            <FaLinkedin size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs text-muted font-medium">LinkedIn</p>
                                            <p className="text-main font-bold text-sm">/{user.socials.linkedin}</p>
                                        </div>
                                        <div className="text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                            Visit &rarr;
                                        </div>
                                    </a>
                                )}
                            </div>

                            {/* Personal Details */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-input-app/30 rounded-2xl p-4 border border-app hover:bg-input-app/50 transition duration-300">
                                    <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center mb-2">
                                        <FaMapMarkerAlt size={14} />
                                    </div>
                                    <p className="text-xs text-muted font-medium">Location</p>
                                    <p className="text-main font-bold text-sm truncate">
                                        {user.address?.city || user.address?.state
                                            ? [
                                                user.address.village,
                                                user.address.city,
                                                user.address.tehsil,
                                                user.address.district,
                                                user.address.state,
                                                user.address.country,
                                                user.address.pincode
                                            ].filter(Boolean).join(", ")
                                            : (user.location || "Unknown")}
                                    </p>
                                </div>

                                <div className="bg-input-app/30 rounded-2xl p-4 border border-app hover:bg-input-app/50 transition duration-300">
                                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center mb-2">
                                        <FaBirthdayCake size={14} />
                                    </div>
                                    <p className="text-xs text-muted font-medium">Birthday</p>
                                    <p className="text-main font-bold text-sm truncate">{user.dob ? formatDate(user.dob) : "Hidden"}</p>
                                </div>

                                <div className="bg-input-app/30 rounded-2xl p-4 border border-app hover:bg-input-app/50 transition duration-300 col-span-2 flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                                        <FaCalendarAlt size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted font-medium">Member Since</p>
                                        <p className="text-main font-bold text-sm">{formatDate(user.createdAt)}</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
