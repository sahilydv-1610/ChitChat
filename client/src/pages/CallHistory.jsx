import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { axiosInstance } from "../config";
import Layout from "../components/Layout";
import { format } from "timeago.js";
import { FaPhone, FaVideo, FaPhoneSlash, FaArrowDown, FaArrowUp } from "react-icons/fa";
import UserAvatar from "../components/UserAvatar";

export default function CallHistory() {
    const { user } = useContext(AuthContext);
    const [calls, setCalls] = useState([]);

    useEffect(() => {
        const getCalls = async () => {
            try {
                const res = await axiosInstance.get("/calls/" + user._id);
                setCalls(res.data);
            } catch (err) {
                console.log(err);
            }
        };
        getCalls();
    }, [user._id]);

    return (
        <Layout>
            <div className="flex h-full bg-app">
                <div className="w-full max-w-4xl mx-auto p-4 md:p-8 overflow-y-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                            <FaPhone size={24} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-main">Call History</h2>
                            <p className="text-muted">Recent voice and video calls</p>
                        </div>
                    </div>

                    <div className="bg-card-app rounded-3xl shadow-xl border border-app overflow-hidden transition-colors duration-200">
                        {calls.length === 0 ? (
                            <div className="p-16 text-center text-muted flex flex-col items-center">
                                <div className="w-20 h-20 bg-input-app rounded-full flex items-center justify-center mb-4">
                                    <FaPhoneSlash size={32} />
                                </div>
                                <p className="text-lg font-medium">No calls yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-app">
                                {calls.map((call) => {
                                    const callerId = call.caller?._id;
                                    const receiverId = call.receiver?._id;
                                    const isCaller = callerId === user._id;
                                    const otherUser = isCaller ? call.receiver : call.caller;
                                    const isMissed = call.status === 'missed';

                                    return (
                                        <div key={call._id} className="p-5 flex items-center justify-between hover:bg-input-app transition cursor-pointer group">
                                            <div className="flex items-center gap-5 min-w-0 flex-1">
                                                <UserAvatar user={otherUser} size="md" showStatus={false} />

                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-bold text-main truncate text-base mb-0.5">{otherUser?.name || "Unknown"}</h4>
                                                    <div className="flex items-center gap-2 text-sm text-muted">
                                                        {isCaller ? (
                                                            <FaArrowUp className="text-green-500 rotate-45" size={10} />
                                                        ) : (
                                                            <FaArrowDown className={isMissed ? "text-red-500 rotate-45" : "text-green-500 rotate-45"} size={10} />
                                                        )}
                                                        <span className="capitalize">{isMissed ? "Missed Call" : (isCaller ? "Outgoing" : "Incoming")}</span>
                                                        <span>•</span>
                                                        <span>{format(call.createdAt)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-right hidden md:block">
                                                    <span className="block text-sm font-bold text-main">{call.duration}s</span>
                                                    <span className="text-xs text-muted capitalize">{call.type}</span>
                                                </div>
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isMissed ? 'bg-red-50 text-red-500 dark:bg-red-900/20' : 'bg-input-app text-muted group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                                    {call.type === 'video' ? <FaVideo size={16} /> : <FaPhone size={16} />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
