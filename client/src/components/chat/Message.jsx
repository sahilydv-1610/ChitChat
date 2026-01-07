import { format } from "timeago.js";
import { useState } from "react";
import { FaTrash, FaPen, FaPhoneSlash, FaVideo, FaCheck, FaCheckDouble } from "react-icons/fa";

import UserAvatar from "../UserAvatar";

export default function Message({ message, own, senderName, senderColor, onDelete, onEdit }) {
    const [showOptions, setShowOptions] = useState(false);

    // System / Broadcast Messages
    if (message.type === "system" || message.sender === "system-broadcast" || message.conversationId?.includes("system")) {
        return (
            <div className="flex justify-center my-6 animate-fade-in px-4">
                <div className="flex flex-col items-center gap-1 max-w-[85%] text-center">
                    <span className="bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                        System Announcement
                    </span>
                    <div className="bg-card-app/80 backdrop-blur-md p-4 rounded-2xl border border-app shadow-sm text-sm text-main mt-2 leading-relaxed">
                        {message.text}
                    </div>
                    <span className="text-[10px] text-muted opacity-70 mt-1">{format(message.createdAt)}</span>
                </div>
            </div>
        );
    }

    // Call Messages
    if (message.type === "call_missed" || message.type === "call_ended" || message.type === "call_declined") {
        const isMissed = message.type === "call_missed" || message.type === "call_declined";
        return (
            <div className="flex justify-center my-6">
                <div className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold tracking-wide uppercase ${isMissed ? "bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30" : "bg-card-app text-muted border border-app shadow-sm"}`}>
                    {isMissed ? <FaPhoneSlash size={12} /> : <FaVideo size={12} />}
                    <span>{message.text}</span>
                    <span className="opacity-70 ml-1 font-normal normal-case">• {format(message.createdAt)}</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col mt-4 group animate-fade-in ${own ? "items-end" : "items-start"}`}>
            <div className={`flex items-end gap-3 max-w-[75%] ${own ? "flex-row-reverse" : "flex-row"}`}>

                <UserAvatar
                    user={{ name: senderName, avatarColor: senderColor }}
                    size="sm"
                    showStatus={false}
                    className="flex-shrink-0 shadow-sm"
                />

                <div
                    className={`relative p-3.5 md:p-4 rounded-2xl text-sm leading-relaxed shadow-sm transition-all duration-200 break-words max-w-full
                ${own
                            ? "bg-gradient-to-br from-primary to-secondary text-white rounded-br-none shadow-lg shadow-primary/20"
                            : "bg-card-app text-main border border-app rounded-bl-none shadow-sm"}
                `}
                    onMouseEnter={() => own && setShowOptions(true)}
                    onMouseLeave={() => setShowOptions(false)}
                >
                    {message.mediaUrl && (message.type === 'image' || message.type === 'gif') && (
                        <img
                            src={message.mediaUrl}
                            alt="attachment"
                            className="max-w-full rounded-lg mb-2 cursor-pointer hover:opacity-90 transition"
                            onClick={() => window.open(message.mediaUrl, '_blank')}
                        />
                    )}
                    {message.mediaUrl && message.type === 'video' && (
                        <video
                            src={message.mediaUrl}
                            controls
                            className="max-w-full rounded-lg mb-2 bg-black"
                        />
                    )}
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    {message.isEdited && <span className="text-[10px] opacity-70 block text-right mt-1 font-medium italic">(edited)</span>}

                    {/* Options Menu */}
                    {own && showOptions && (
                        <div className="absolute -top-3 right-0 mr-2 flex gap-1 bg-card-app p-1 rounded-lg shadow-lg border border-app active:scale-95 transition-transform">
                            <button onClick={() => onEdit(message)} className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 dark:hover:bg-slate-700 rounded-md transition"><FaPen size={10} /></button>
                            <button onClick={() => onDelete(message._id)} className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 rounded-md transition"><FaTrash size={10} /></button>
                        </div>
                    )}
                </div>
            </div>
            <div className={`text-[10px] text-slate-400 font-medium mt-1.5 mx-12 ${own ? "text-right flex items-center justify-end gap-1.5" : "text-left"}`}>
                {format(message.createdAt)}
                {own && (
                    <span className={message.isRead ? "text-blue-500" : "text-slate-400"}>
                        {message.isRead ? <FaCheckDouble size={12} /> : <FaCheck size={10} />}
                    </span>
                )}
            </div>
        </div>
    );
}
