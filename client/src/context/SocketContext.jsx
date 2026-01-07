import { createContext, useState, useEffect, useContext } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "./AuthContext";

export const SocketContext = createContext();

export const SocketContextProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const { user } = useContext(AuthContext);

    useEffect(() => {
        if (user) {
            // Use relative path so it goes through Vite proxy
            const newSocket = io("/", { path: "/socket.io" });
            setSocket(newSocket);
            newSocket.emit("addUser", user._id);

            newSocket.on("getUsers", (users) => {
                setOnlineUsers(users);
            });

            // Notification Handlers
            // Notification Handlers
            newSocket.on("receive_message", (data) => {
                console.log("NOTIFY DEBUG: Event received", data);

                if (Notification.permission === 'granted') {
                    try {
                        const notif = new Notification("New Message", {
                            body: data.text || "You have a new message",
                            icon: '/vite.svg',
                            requireInteraction: true // Keep it on screen
                        });
                        notif.onclick = function () {
                            window.focus();
                            this.close();
                        };
                    } catch (err) {
                        console.error("Notification Error:", err);
                    }
                } else {
                    console.log("NOTIFY DEBUG: Permission not granted", Notification.permission);
                }
            });

            newSocket.on("callUser", (data) => {
                const enabled = localStorage.getItem('notifications') === 'true';
                if (enabled && Notification.permission === 'granted') {
                    new Notification(`Incoming Call`, {
                        body: `${data.name || 'Someone'} is calling you...`,
                        icon: '/vite.svg'
                    });
                }
            });

            return () => {
                newSocket.close();
            };
        } else {
            if (socket) {
                socket.close();
                setSocket(null);
            }
        }
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
};
