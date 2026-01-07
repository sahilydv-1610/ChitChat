import { createContext, useState, useEffect, useContext } from "react";
import { AuthContext } from "./AuthContext";

export const ThemeContext = createContext();

export const ThemeContextProvider = ({ children }) => {
    // Check localStorage or system preference
    const [theme, setTheme] = useState(
        localStorage.getItem("theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    );

    // Color Theme State (violet, blue, emerald, rose, amber)
    const [colorTheme, setColorTheme] = useState(
        localStorage.getItem("colorTheme") || "violet"
    );

    const { user } = useContext(AuthContext);

    // Sync from User Profile
    useEffect(() => {
        if (user?.themePreference) {
            const { theme: userBase, colorTheme: userAccent } = user.themePreference;
            if (userBase && userBase !== theme) setTheme(userBase);
            if (userAccent && userAccent !== colorTheme) setColorTheme(userAccent);
        }
    }, [user]);

    useEffect(() => {
        const root = window.document.documentElement;

        // Manage Base Theme
        // Remove all previous base classes
        const classes = root.classList;
        classes.remove("light", "dark", "base-midnight", "base-navy", "base-forest", "base-sunset");

        if (theme === 'light') {
            classes.add("light");
        } else {
            classes.add("dark"); // All others trigger dark mode utilities
            if (theme !== 'dark') { // 'dark' is default slate, others need specific class
                classes.add(`base-${theme}`);
            }
        }

        // Save to local storage
        localStorage.setItem("theme", theme);
    }, [theme]);

    useEffect(() => {
        const root = window.document.documentElement;

        // Manage Color Theme
        // Remove existing theme-* classes
        const classes = root.classList;
        for (const cls of classes) {
            if (cls.startsWith("theme-")) {
                root.classList.remove(cls);
            }
        }
        root.classList.add(`theme-${colorTheme}`);
        localStorage.setItem("colorTheme", colorTheme);

    }, [colorTheme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, colorTheme, setColorTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
