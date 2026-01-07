import { Link, useLocation, useSearchParams } from "react-router-dom";
import { FaComments, FaUser, FaPhone, FaChartBar, FaHeadset } from "react-icons/fa";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";

export default function Sidebar({ settings }) {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { user, dispatch } = useContext(AuthContext);
    const { theme } = useContext(ThemeContext);
    const isChatActive = searchParams.get("chat") || searchParams.get("ticket");

    const navItems = [
        { path: "/", icon: FaComments, title: "Chats" },
        { path: "/calls", icon: FaPhone, title: "Calls" },
        ...(user?.isAdmin ? [{ path: "/admin", icon: FaChartBar, title: "Admin" }] : []),
        { path: "/support", icon: FaHeadset, title: "Support" },
        { path: "/profile", icon: FaUser, title: "Profile" }
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <>
            {/* Desktop Sidebar */}
            <div className="hidden md:flex flex-col items-center w-24 h-full bg-card-app border-r border-app py-8 z-50 shadow-sm transition-colors duration-300">
                <div className="flex flex-col items-center gap-8 w-full">
                    <div className="flex flex-col items-center gap-2 mb-2">
                        <div className="h-12 w-12 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-primary/30 transform rotate-3 hover:rotate-6 transition-transform duration-300">
                            {settings?.siteName ? settings.siteName.charAt(0).toUpperCase() : "C"}
                        </div>
                        <span className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">
                            {settings?.siteName ? settings.siteName.substring(0, 3) : "APP"}
                        </span>
                    </div>

                    <nav className="flex flex-col gap-5 w-full px-4">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`relative p-4 rounded-2xl flex justify-center transition-all duration-300 group ${isActive(item.path)
                                    ? "bg-primary text-white shadow-xl shadow-primary/30 scale-105"
                                    : "text-muted hover:bg-input-app hover:text-primary dark:hover:text-primary"
                                    }`}
                                title={item.title}
                            >
                                <item.icon size={22} />
                                {isActive(item.path) && (
                                    <span className="absolute left-1/2 -bottom-1 w-1 h-1 bg-white/50 rounded-full"></span>
                                )}
                                <span className="absolute left-[120%] bg-slate-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl translate-x-2 group-hover:translate-x-0">
                                    {item.title}
                                </span>
                            </Link>
                        ))}
                    </nav>
                </div>
                {/* Bottom area intentionally empty as options moved to Profile */}
            </div>

            {/* Mobile Bottom Navigation - Hidden when In Chat */}
            {!isChatActive && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card-app/90 backdrop-blur-xl border-t border-app flex justify-between items-center px-6 py-3 z-50 pb-safe transition-all duration-300 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)]">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`relative p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all duration-300 ${isActive(item.path)
                                ? "text-primary dark:text-primary bg-primary/10 -translate-y-1"
                                : "text-muted hover:text-main"
                                }`}
                        >
                            <div className="relative">
                                <item.icon size={22} className={`transition-transform duration-300 ${isActive(item.path) ? "scale-110" : ""}`} />
                                {isActive(item.path) && (
                                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></span>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </>
    );
}
