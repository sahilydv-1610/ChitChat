import Sidebar from "./Sidebar";
import { ThemeContext } from "../context/ThemeContext";
import { AuthContext } from "../context/AuthContext";
import { useEffect, useState, useContext } from "react";
import { axiosInstance } from "../config";
import { FaBroadcastTower, FaTools } from "react-icons/fa";
import { io } from "socket.io-client";

export default function Layout({ children }) {
    const { user } = useContext(AuthContext);
    const [settings, setSettings] = useState(null);
    const [broadcast, setBroadcast] = useState(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await axiosInstance.get("/settings");
                setSettings(res.data);
            } catch (err) {
                console.log("Failed to load settings", err);
            }
        }
        fetchSettings();

        const socket = io("/");
        socket.on("receive_broadcast", (data) => {
            setBroadcast(data);
            setTimeout(() => setBroadcast(null), 10000); // Hide after 10s
        });

        // Listen for maintenance updates
        socket.on("maintenance_status", (status) => {
            setSettings(prev => prev ? ({ ...prev, maintenanceMode: status }) : { maintenanceMode: status });
        });

        // Listen for generic setting updates
        socket.on("settings_update", ({ key, value }) => {
            setSettings(prev => prev ? ({ ...prev, [key]: value }) : { [key]: value });
        });

        return () => socket.close();
    }, []);

    // Update Document Title
    useEffect(() => {
        if (settings?.siteName) {
            document.title = settings.siteName;
        }
    }, [settings?.siteName]);

    // Maintenance Mode Check
    if (settings?.maintenanceMode && !user?.isAdmin) {
        return (
            <div className="min-h-screen bg-app flex flex-col items-center justify-center p-6 text-center transition-colors duration-300">
                <div className="p-6 bg-primary/10 text-primary rounded-full mb-6 animate-pulse">
                    <FaTools size={48} />
                </div>
                <h1 className="text-3xl font-bold text-main mb-4">Under Maintenance</h1>
                <p className="text-muted max-w-md mx-auto leading-relaxed">
                    We are currently upgrading our systems to provide you with a better experience.
                    Please check back shortly.
                </p>
                {settings.systemBanner && (
                    <div className="mt-8 px-4 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium border border-primary/20">
                        Note: {settings.systemBanner}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row h-[100dvh] md:h-screen overflow-hidden transition-colors duration-300 relative">
            <Sidebar settings={settings} />
            <main className="flex-1 h-full overflow-hidden relative">
                {/* SYSTEM BANNER */}
                {settings?.systemBanner && (
                    <div className="bg-primary text-white text-center text-sm font-bold py-2 px-4 shadow-md relative z-50">
                        {settings.systemBanner}
                    </div>
                )}
                {children}
            </main>

            {/* Broadcast Toast */}
            {broadcast && (
                <div className="fixed top-6 right-6 z-50 animate-bounce-soft max-w-sm w-full">
                    <div className="bg-gradient-to-r from-primary to-secondary p-4 rounded-2xl shadow-2xl text-white border border-white/10 flex gap-4">
                        <div className="p-3 bg-white/20 rounded-xl h-fit">
                            <FaBroadcastTower size={24} className="animate-pulse" />
                        </div>
                        <div>
                            <h4 className="font-bold text-lg mb-1">System Announcement</h4>
                            <p className="text-indigo-100 text-sm leading-relaxed">{broadcast.message}</p>
                            <span className="text-xs text-indigo-200 mt-2 block opacity-70">Just now</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
