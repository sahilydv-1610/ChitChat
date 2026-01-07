import { useRef, useState, useEffect } from "react";
import { axiosInstance } from "../config";
import { useNavigate, Link } from "react-router-dom";
import { FaEye, FaEyeSlash, FaUser, FaEnvelope, FaPhone, FaLock, FaGoogle } from "react-icons/fa";

export default function Register() {
    const name = useRef();
    const email = useRef();
    const mobile = useRef();
    const password = useRef();
    const confirmPassword = useRef();
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleResponse = async (response) => {
        try {
            // Decode the JWT credential
            const base64Url = response.credential.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const { sub: googleId, email, name, picture: avatar } = JSON.parse(jsonPayload);

            // Register/Login via Google
            setIsLoading(true);
            const res = await axiosInstance.post("/auth/google", {
                googleId,
                email,
                name,
                avatar
            });
            // Google auth endpoint usually returns token + user data just like login
            // But Register page usually redirects to Login or Home.
            // If the backend /google endpoint logs them in directly (which it does), we can save context.
            // But to keep it simple and safe, let's redirect to login or home. 
            // Actually, /google endpoint returns token, so it effectively logs them in.
            // We should ideally dispatch LOGIN_SUCCESS, but we don't have AuthContext here in Register (forgot to import useContext).
            // Let's just navigate to login or home. Navigating to login is safer flow if we don't update context.
            // Wait, if I want to log them in, I need AuthContext.
            // Let's stick to navigating to Login for now, or just / (if we had context).
            navigate("/login");

        } catch (err) {
            console.error("Google Register Error:", err);
            setError("Google Sign-In Failed");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        /* global google */
        if (typeof google !== 'undefined') {
            google.accounts.id.initialize({
                client_id: "YOUR_GOOGLE_CLIENT_ID", // TODO: Replace with actual Client ID
                callback: handleGoogleResponse
            });

            google.accounts.id.renderButton(
                document.getElementById("googleSignUpDiv"),
                { theme: "outline", size: "large", width: "100%", text: "signup_with" }
            );
        }
    }, []);

    const handleClick = async (e) => {
        e.preventDefault();
        setError(null);
        if (confirmPassword.current.value !== password.current.value) {
            setError("Passwords don't match!");
            return;
        }

        setIsLoading(true);
        const user = {
            name: name.current.value,
            email: email.current.value,
            mobile: mobile.current.value,
            password: password.current.value,
        };

        try {
            await axiosInstance.post("/auth/register", user);
            navigate("/login");
        } catch (err) {
            console.error("Register Error:", err);
            if (!err.response) {
                setError("Network Error: Unable to reach server.");
            } else {
                const errorData = err.response.data;
                setError(typeof errorData === 'string'
                    ? errorData
                    : errorData?.message || JSON.stringify(errorData));
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-app p-4 transition-colors duration-300">
            <div className="w-full max-w-md bg-card-app rounded-2xl shadow-2xl p-8 border border-app animate-slide-up">

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-main">Create Account</h1>
                    <p className="mt-2 text-muted">Join the ChitChat community</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm flex items-center shadow-sm border border-red-100 dark:border-red-900/50">
                        {error}
                    </div>
                )}

                <form className="space-y-5" onSubmit={handleClick}>
                    <div className="space-y-1">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaUser className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                placeholder="Full Name"
                                required
                                ref={name}
                                className="block w-full pl-10 pr-3 py-3 border border-app rounded-xl bg-input-app text-main placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaEnvelope className="h-4 w-4 text-muted" />
                            </div>
                            <input
                                placeholder="Email Address"
                                type="email"
                                required
                                ref={email}
                                className="block w-full pl-10 pr-3 py-3 border border-app rounded-xl bg-input-app text-main placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaPhone className="h-4 w-4 text-muted" />
                            </div>
                            <input
                                placeholder="Mobile Number"
                                required
                                ref={mobile}
                                className="block w-full pl-10 pr-3 py-3 border border-app rounded-xl bg-input-app text-main placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaLock className="h-4 w-4 text-muted" />
                            </div>
                            <input
                                placeholder="Password"
                                type={showPassword ? "text" : "password"}
                                required
                                minLength="6"
                                ref={password}
                                className="block w-full pl-10 pr-10 py-3 border border-app rounded-xl bg-input-app text-main placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-main cursor-pointer"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaLock className="h-4 w-4 text-muted" />
                            </div>
                            <input
                                placeholder="Confirm Password"
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                ref={confirmPassword}
                                className="block w-full pl-10 pr-10 py-3 border border-app rounded-xl bg-input-app text-main placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-main cursor-pointer"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/20 text-sm font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5"
                    >
                        {isLoading ? "Creating Account..." : "Sign Up"}
                    </button>

                    <div className="mt-6">
                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-app"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-card-app text-muted">Or join with</span>
                            </div>
                        </div>
                        <div id="googleSignUpDiv" className="w-full"></div>
                    </div>
                </form>

                <p className="mt-8 text-center text-sm text-muted">
                    Already have an account?{" "}
                    <Link to="/login" className="font-semibold text-primary hover:text-primary/80 dark:text-primary/80 transition-colors">
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    );
}
