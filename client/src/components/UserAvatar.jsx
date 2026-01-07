import React from 'react';
import { FaBroadcastTower } from 'react-icons/fa';

// Utility to generate hash-based color if user hasn't chosen one
const getHashColor = (name) => {
    if (!name) return "bg-gray-500";
    const colors = [
        "bg-red-500", "bg-orange-500", "bg-amber-500",
        "bg-green-500", "bg-emerald-500", "bg-teal-500",
        "bg-cyan-500", "bg-sky-500", "bg-blue-500",
        "bg-indigo-500", "bg-violet-500", "bg-purple-500",
        "bg-fuchsia-500", "bg-pink-500", "bg-rose-500"
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name) => {
    if (!name) return "?";
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
};

export default function UserAvatar({ user, size = "md", isOnline = false, showStatus = true, className = "" }) {
    if (!user) return null;

    const sizeClasses = {
        sm: "w-8 h-8 text-xs",
        md: "w-10 h-10 text-sm",
        lg: "w-12 h-12 text-lg",
        xl: "w-32 h-32 text-4xl",
    };

    const statusSizeClasses = {
        sm: "w-2 h-2",
        md: "w-3 h-3",
        lg: "w-3.5 h-3.5",
        xl: "w-6 h-6 border-4",
    };

    // Use user-selected color from DB, or fallback to hash-based
    const bgColor = user.avatarColor === "slate" || user.isSystem ? "bg-gradient-to-br from-primary to-secondary" : (user.avatarColor || getHashColor(user.name || ""));
    const isSystem = user.isSystem || user._id === "system-broadcast";

    return (
        <div className="relative inline-block">
            {user.avatar ? (
                <img
                    src={user.avatar}
                    className={`${sizeClasses[size]} rounded-full object-cover border border-app ${className}`}
                    alt={user.name}
                />
            ) : (
                <div className={`${sizeClasses[size]} rounded-full ${bgColor} text-white flex items-center justify-center font-bold border border-white dark:border-slate-800 shadow-sm ${className}`}>
                    {isSystem ? <span className="animate-pulse"><FaBroadcastTower /></span> : getInitials(user.name)}
                </div>
            )}

            {showStatus && isOnline && (
                <div className={`absolute bottom-0 right-0 ${statusSizeClasses[size]} bg-green-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm`} title="Online"></div>
            )}
        </div>
    );
}
