import { useContext, useRef, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { axiosInstance } from "../config";
import { Link, useNavigate } from "react-router-dom";
import { FaGoogle, FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";

export default function Login() {
    const email = useRef();
    const password = useRef();
    const { isFetching, dispatch } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleClick = async (e) => {
        e.preventDefault();
        dispatch({ type: "LOGIN_START" });
        try {
            const res = await axiosInstance.post("/auth/login", {
                email: email.current.value,
                password: password.current.value
            });
            dispatch({ type: "LOGIN_SUCCESS", payload: res.data });
            navigate("/");
        } catch (err) {
            dispatch({ type: "LOGIN_FAILURE", payload: err });
            console.error("Login Error:", err);
            let msg = "Network Error: Unable to reach server.";
            if (err.response && err.response.data) {
                const data = err.response.data;
                if (typeof data === 'string') msg = data;
                else if (data.message) msg = data.message;
                else {
                    const str = JSON.stringify(data);
                    msg = str === '{}' ? "Server Error (See Console)" : str;
                }
            }
            alert(msg);
        }
    };

    const [showPassword, setShowPassword] = useState(false);

    const handleGoogleResponse = async (response) => {
        try {
            // Decode the JWT credential
            const base64Url = response.credential.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const { sub: googleId, email, name, picture: avatar } = JSON.parse(jsonPayload);

            // Send to backend
            dispatch({ type: "LOGIN_START" });
            const res = await axiosInstance.post("/auth/google", {
                googleId,
                email,
                name,
                avatar
            });
            dispatch({ type: "LOGIN_SUCCESS", payload: res.data });
            navigate("/");
        } catch (err) {
            dispatch({ type: "LOGIN_FAILURE", payload: err });
            console.error("Google Login Error:", err);
            alert("Google Login Failed. Please try again.");
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
                document.getElementById("googleSignInDiv"),
                { theme: "outline", size: "large", width: "100%" }  // Customization attributes
            );
        }
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-app p-4 transition-colors duration-300">
            <div className="w-full max-w-md bg-card-app rounded-2xl shadow-2xl p-8 border border-app animate-slide-up">

                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        ChitChat
                    </h1>
                    <p className="mt-2 text-muted">
                        Welcome back! Please sign in to continue.
                    </p>
                </div>

                <form className="space-y-6" onSubmit={handleClick}>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-main">Email Address</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaEnvelope className="h-5 w-5 text-muted" />
                            </div>
                            <input
                                type="email"
                                required
                                ref={email}
                                className="block w-full pl-10 pr-3 py-3 border border-app rounded-xl leading-5 bg-input-app text-main placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-main">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaLock className="h-5 w-5 text-muted" />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                minLength="6"
                                ref={password}
                                className="block w-full pl-10 pr-10 py-3 border border-app rounded-xl leading-5 bg-input-app text-main placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                                placeholder="••••••••"
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

                    <button
                        type="submit"
                        disabled={isFetching}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/20 text-sm font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5"
                    >
                        {isFetching ? (
                            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            "Sign In"
                        )}
                    </button>
                </form>

                <div className="mt-8">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-app"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-card-app text-muted">Or continue with</span>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-center">
                        <div id="googleSignInDiv" className="w-full"></div>
                        {/* 
                        <button
                            onClick={googleLogin}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-app rounded-xl shadow-sm bg-card-app text-sm font-medium text-main hover:bg-input-app transition-colors duration-200"
                        >
                            <FaGoogle className="h-5 w-5 text-red-500" />
                            <span>Sign in with Google</span>
                        </button> 
                        */}
                    </div>
                </div>

                <p className="mt-8 text-center text-sm text-muted">
                    Don't have an account?{" "}
                    <Link to="/register" className="font-semibold text-primary hover:text-primary/80 dark:text-primary/80 transition-colors">
                        Create an account
                    </Link>
                </p>
            </div>
        </div>
    );
}
