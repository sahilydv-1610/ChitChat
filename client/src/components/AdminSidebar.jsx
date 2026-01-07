import { FaChartLine, FaUsers, FaFlag, FaBroadcastTower, FaCog, FaSignOutAlt, FaPhone, FaLifeRing } from 'react-icons/fa';

export default function AdminSidebar({ activeTab, setActiveTab }) {
    const menuItems = [
        { id: 'overview', label: 'Dashboard', icon: FaChartLine },
        { id: 'users', label: 'Users', icon: FaUsers },
        { id: 'calls', label: 'Call History', icon: FaPhone },
        { id: 'reports', label: 'Reports', icon: FaFlag },
        { id: 'support', label: 'Support', icon: FaLifeRing },
        { id: 'broadcast', label: 'Broadcast', icon: FaBroadcastTower },
        { id: 'settings', label: 'Settings', icon: FaCog },
    ];

    return (
        <div className="hidden md:flex flex-col w-64 bg-card-app/80 backdrop-blur-xl border-r border-app h-full p-6 shadow-sm z-20">
            <div className="flex items-center gap-3 px-2 mb-10">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-white font-bold text-lg">A</span>
                </div>
                <h2 className="text-xl font-bold text-main tracking-tight">Admin Panel</h2>
            </div>

            <nav className="flex-1 space-y-2">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${isActive
                                ? "bg-primary/10 text-primary font-bold shadow-sm"
                                : "text-muted hover:bg-input-app hover:text-main font-medium"
                                }`}
                        >
                            <Icon size={20} className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            <div className="pt-6 border-t border-app">
                <button
                    onClick={() => window.location.href = '/'}
                    className="w-full flex items-center gap-3 px-4 py-3 text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all font-medium"
                >
                    <FaSignOutAlt />
                    <span>Exit Admin</span>
                </button>
            </div>
        </div>
    );
}
