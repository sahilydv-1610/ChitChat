import { useEffect, useState } from "react";
import { axiosInstance } from "../../config";
import UserAvatar from "../UserAvatar";

export default function Conversation({ conversation, currentUser, isOnline }) {
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Assuming conversation is the user object for now
        setUser(conversation);
    }, [conversation, currentUser]);

    if (!user) return null;

    return (
        <div className="group relative flex items-center gap-4 p-3.5 hover:bg-input-app rounded-2xl cursor-pointer transition-all duration-200">
            <UserAvatar user={user} size="lg" isOnline={isOnline} />

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                    <span className="block font-semibold text-main truncate text-base">{user.name}</span>
                    <span className="text-[10px] text-muted font-medium">{isOnline ? "Now" : ""}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    {user.unreadCount > 0 ? (
                        <div className="flex flex-col">
                            {(user.lastMessage?.type === 'call_missed' || user.lastMessage?.text?.includes("Missed")) ? (
                                <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                                    Missed call
                                </span>
                            ) : (
                                <span className="block text-xs truncate text-primary font-bold animate-pulse">
                                    {user.unreadCount} new message{user.unreadCount > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className={`block text-xs truncate ${isOnline ? "text-primary font-medium" : "text-muted"}`}>
                            {isOnline ? "Active now" : "Offline"}
                        </span>
                    )}
                </div>
            </div>

            {/* Unread Badge or Hover Indicator */}
            {user.unreadCount > 0 ? (
                <div className="absolute right-4 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] text-white font-bold shadow-lg shadow-primary/30 animate-scale-in">
                    {user.unreadCount > 9 ? '9+' : user.unreadCount}
                </div>
            ) : (
                <div className="absolute right-4 w-2 h-2 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity transform scale-0 group-hover:scale-100"></div>
            )}
        </div>
    );
}
