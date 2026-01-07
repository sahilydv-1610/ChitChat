import React, { useEffect, useRef, useState, useContext } from "react";
import Peer from "simple-peer";
import { FaMicrophone, FaMicrophoneSlash, FaPhoneSlash, FaVideo, FaVideoSlash, FaExpand, FaCompress, FaSyncAlt } from "react-icons/fa";
import { axiosInstance } from "../../config";

// Note: simple-peer requires 'global' and 'process' polyfills in Vite usually, 
// or define 'global' in index.html. We might hit a runtime error if not handled.
// Quick fix: Add to index.html <script>window.global = window;</script> if needed.

export default function CallInterface({ socket, user, chatPartner, callerId, isCaller, signalData, onClose }) {
    const [stream, setStream] = useState(null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);

    const [remoteStream, setRemoteStream] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState("Initializing...");
    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();
    const [insecureOriginError, setInsecureOriginError] = useState(false);
    const [facingMode, setFacingMode] = useState("user");

    const switchCamera = async () => {
        try {
            const targetMode = facingMode === "user" ? "environment" : "user";

            // Mobile Fix: Stop old track FIRST to release hardware
            const oldVideoTrack = stream?.getVideoTracks()[0];
            if (oldVideoTrack) {
                oldVideoTrack.stop();
            }

            let constraints = {
                video: { facingMode: targetMode },
                audio: true
            };

            // Smart Device Selection for Environment (Back) Camera
            if (targetMode === "environment" && navigator.mediaDevices?.enumerateDevices) {
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const videoDevices = devices.filter(d => d.kind === 'videoinput');

                    // Filter for back cameras
                    const backCameras = videoDevices.filter(d =>
                        d.label.toLowerCase().includes('back') ||
                        d.label.toLowerCase().includes('environment') ||
                        d.label.toLowerCase().includes('rear')
                    );

                    if (backCameras.length > 0) {
                        // Heuristic: Avoid "wide", "ultra", "0.5x", "macro" to find the MAIN camera
                        const mainBack = backCameras.find(d => {
                            const l = d.label.toLowerCase();
                            return !l.includes('wide') && !l.includes('ultra') && !l.includes('0.5') && !l.includes('macro');
                        });

                        const selectedDevice = mainBack || backCameras[0]; // Fallback to first found

                        // console.log("Smart selecting camera:", selectedDevice.label);
                        constraints = {
                            video: { deviceId: { exact: selectedDevice.deviceId } },
                            audio: true
                        };
                    }
                } catch (e) {
                    console.warn("Smart camera selection failed, falling back to basic switch", e);
                }
            }

            // Get new stream
            const newStream = await navigator.mediaDevices.getUserMedia(constraints)
                .catch(async (err) => {
                    console.warn("Smart/Exact constraints failed, trying loose...", err);
                    return await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: targetMode },
                        audio: true
                    });
                });

            const newVideoTrack = newStream.getVideoTracks()[0];

            if (stream) {
                if (oldVideoTrack) stream.removeTrack(oldVideoTrack);
                stream.addTrack(newVideoTrack);

                if (connectionRef.current) {
                    connectionRef.current.replaceTrack(oldVideoTrack, newVideoTrack, stream);
                }

                setFacingMode(targetMode);

                if (myVideo.current) {
                    myVideo.current.srcObject = stream;
                }
            }
        } catch (err) {
            console.error("Failed to switch camera:", err);
            // alert("Failed to switch camera: " + err.message);
        }
    };

    useEffect(() => {
        // Safe check for Insecure Context (HTTP on mobile/LAN)
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn("Media Devices not supported due to Insecure Context (HTTP)");
            setInsecureOriginError(true);
            return;
        }

        // Helper to get media with fallback
        const getMedia = async () => {
            try {
                return await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
            } catch (err) {
                console.warn("Front camera failed, trying any camera...", err);
                try {
                    return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                } catch (err2) {
                    throw err2;
                }
            }
        };

        getMedia()
            .then((currentStream) => {
                setStream(currentStream);
                setConnectionStatus("Media Acquired");

                if (isCaller) {
                    setConnectionStatus("Creating Offer...");
                    // Initiate Call
                    const peer = new Peer({
                        initiator: true,
                        trickle: false,
                        stream: currentStream,
                        config: {
                            iceServers: [
                                { urls: 'stun:stun1.l.google.com:19302' },
                                { urls: 'stun:stun2.l.google.com:19302' }
                            ]
                        }
                    });

                    peer.on("signal", (data) => {
                        // Only send signal if we have data
                        if (data) {
                            setConnectionStatus("Sending Offer...");
                            socket.emit("callUser", {
                                userToCall: chatPartner._id,
                                signalData: data,
                                from: user._id,
                                name: user.name
                            });
                        }
                    });

                    peer.on("stream", (stream) => {
                        console.log("Caller received stream");
                        setConnectionStatus("Stream Received");
                        setRemoteStream(stream);
                    });

                    peer.on("connect", () => {
                        console.log("Caller Peer connected");
                        setConnectionStatus("Peer Connected");
                    });

                    peer.on("error", (err) => {
                        console.error("Peer connection error (Caller):", err);
                        setConnectionStatus(`Error: ${err.message}`);
                        // Ignore 'ERR_WEBRTC_SUPPORT' or similar if handshake is just flaky
                        if (err.code === 'ERR_DATA_CHANNEL') return;
                        // Don't close immediately on minor errors, but alert if critical
                        // alert("Call connection failed: " + err.message);
                    });

                    socket.on("callAccepted", (signal) => {
                        setCallAccepted(true);
                        setConnectionStatus("Call Accepted, Connecting...");
                        // Using a simple safety check instead of strict 'answerProcessed'
                        // because 'setRemoteDescription' error often happens if we signal TWICE with the SAME data.
                        // But blocking it entirely might prevent the first valid signal if 'callAccepted' fires oddly.
                        // Let's rely on peer state checks.
                        if (peer && !peer.destroyed) {
                            // If peer is already stable, it might be a renegotiation or a duplicate.
                            // Simple-peer doesn't expose 'signalingState' easily on the instance, but we can try/catch.
                            try {
                                peer.signal(signal);
                            } catch (e) {
                                // Only log specific errors, ignore known stable state errors implies duplicate signal
                                if (e.message.includes("stable")) {
                                    console.warn("Peer already stable, ignoring duplicate signal.");
                                } else {
                                    console.error("Signal error:", e);
                                }
                            }
                        }
                    });

                    connectionRef.current = peer;
                } else {
                    // Answer Call
                    if (!signalData) {
                        alert("Call failed: No signal data received.");
                        onClose();
                        return;
                    }

                    // setCallAccepted(true); // Don't set true immediately for visual, wait for accept? 
                    // Actually for this logic, we accept immediately as we opened the component
                    setCallAccepted(true);
                    setConnectionStatus("Answering...");

                    const peer = new Peer({
                        initiator: false,
                        trickle: false, // Keeping false for simplicity, maybe try true if stuck
                        stream: currentStream,
                        config: {
                            iceServers: [
                                { urls: 'stun:stun1.l.google.com:19302' },
                                { urls: 'stun:stun2.l.google.com:19302' }
                            ]
                        }
                    });

                    peer.on("signal", (data) => {
                        const targetId = callerId || chatPartner?._id;
                        if (targetId) {
                            socket.emit("answerCall", { signal: data, to: targetId });
                        } else {
                            console.error("No caller ID found to answer call");
                        }
                    });

                    peer.on("stream", (stream) => {
                        console.log("Receiver received stream");
                        setConnectionStatus("Stream Received");
                        setRemoteStream(stream);
                    });

                    peer.on("connect", () => {
                        console.log("Receiver Peer connected");
                        setConnectionStatus("Peer Connected");
                    });

                    peer.on("error", (err) => {
                        console.error("Peer connection error (Receiver):", err);
                        setConnectionStatus(`Error: ${err.message}`);
                        if (err.code === 'ERR_DATA_CHANNEL') return;
                        // alert("Call connection failed: " + err.message);
                    });

                    // Signal immediately
                    if (peer && !peer.destroyed) {
                        try {
                            peer.signal(signalData);
                        } catch (e) {
                            if (e.message.includes("stable")) {
                                console.warn("Peer already stable (Receiver).");
                            } else {
                                console.error("Signal error (Receiver):", e);
                            }
                        }
                    }
                    connectionRef.current = peer;
                }
            })
            .catch(err => {
                console.error("Media Error:", err);
                setConnectionStatus("Media Failure");
                alert(`Cannot access Camera/Mic. If on Mobile/LAN, you likely need HTTPS. Error: ${err.message}`);
                onClose();
            });

        // Listen for remote hangup
        socket.on("callEnded", () => {
            setCallEnded(true);
            window.location.reload(); // Auto-refresh on remote hangup
        });

        return () => {
            // Cleanup
            if (stream) stream.getTracks().forEach(track => track.stop());
            socket.off("callAccepted");
            socket.off("callEnded");
            if (connectionRef.current) connectionRef.current.destroy();
        }
    }, []); // Run once on mount

    // Fix for Camera Preview: Explicitly attach stream when available
    useEffect(() => {
        if (myVideo.current && stream) {
            myVideo.current.srcObject = stream;
        }
    }, [stream]);

    // Fix for Remote Video: Explicitly attach stream when available (fixes race condition)
    useEffect(() => {
        if (userVideo.current && remoteStream) {
            console.log("Attaching remote stream to video element");
            userVideo.current.srcObject = remoteStream;
            setConnectionStatus("Video Attached and Playing");
        }
    }, [remoteStream, callAccepted]); // Re-run when stream arrives or when callAccepted mounts the video

    const leaveCall = async () => {
        const endTime = Date.now();
        let duration = 0;

        if (startTime.current && callAccepted) {
            duration = Math.round((endTime - startTime.current) / 1000);
        }

        const formatDuration = (sec) => {
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            return `${m}m ${s}s`;
        };

        let callStatus = "completed";
        let msgType = "call_ended";
        let msgText = `Video Call • ${formatDuration(duration)}`;

        if (!callAccepted) {
            if (isCaller) {
                callStatus = "missed";
                msgType = "call_missed";
                msgText = "Missed video call";
            } else {
                callStatus = "declined";
                msgType = "call_declined";
                msgText = "Call declined";
            }
        }

        try {
            // Log the call in DB
            await axiosInstance.post("/calls", {
                caller: isCaller ? user._id : chatPartner._id,
                receiver: isCaller ? chatPartner._id : user._id,
                duration: callAccepted ? duration : 0,
                status: callStatus,
                type: "video"
            });

            // Send System Message to Chat
            // Only send if it's a "completed" call OR "missed" (caller left) OR "declined" (receiver left)
            // Essentially always send a message when explicit action is taken to end/leave.

            const conversationId = [user._id, chatPartner._id].sort().join("-");
            await axiosInstance.post("/messages", {
                conversationId,
                sender: user._id,
                receiver: chatPartner._id,
                text: msgText,
                type: msgType
            });

            // Emit Socket Message for Real-time update
            socket.emit("send_message", {
                senderId: user._id,
                receiverId: chatPartner._id,
                text: msgText,
                type: msgType,
                room: chatPartner._id
            });

        } catch (err) {
            console.error("Failed to log call/message:", err);
        }

        setCallEnded(true);
        if (connectionRef.current) connectionRef.current.destroy();

        if (chatPartner?._id) {
            socket.emit("endCall", { to: chatPartner._id });
        }
        window.location.reload();
    };

    const startTime = useRef(null);

    useEffect(() => {
        if (callAccepted) {
            startTime.current = Date.now();
        }
    }, [callAccepted]);

    const toggleVideo = () => {
        setIsVideoOff(!isVideoOff);
        const videoTrack = stream?.getVideoTracks()[0];
        if (videoTrack) videoTrack.enabled = !videoTrack.enabled;
    }

    // Call Timeout Logic (20 seconds)
    useEffect(() => {
        let timeout;
        if (isCaller && !callAccepted) {
            timeout = setTimeout(() => {
                console.log("Call timed out (20s)");
                leaveCall(); // This will trigger the "missed" logic in leaveCall since callAccepted is false
            }, 20000);
        }
        return () => clearTimeout(timeout);
    }, [isCaller, callAccepted]); // Dependency: reset if accepted or caller status changes

    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef(null);

    const resetControlsTimeout = () => {
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        setShowControls(true);
        controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
        }, 3000);
    };

    const toggleControls = () => {
        if (showControls) {
            setShowControls(false);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        } else {
            resetControlsTimeout();
        }
    };

    useEffect(() => {
        resetControlsTimeout();
        return () => {
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, []);

    // ... (rest of useEffects)



    const toggleMute = (e) => {
        e.stopPropagation();
        setIsMuted(!isMuted);
        const audioTrack = stream?.getAudioTracks()[0];
        if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
        resetControlsTimeout();
    }

    const handleEndCall = (e) => {
        e.stopPropagation();
        leaveCall();
    }

    const handleToggleVideo = (e) => {
        e.stopPropagation();
        toggleVideo();
        resetControlsTimeout();
    }

    if (insecureOriginError) {
        return (
            <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center p-6 text-white text-center">
                <FaVideoSlash size={64} className="text-red-500 mb-6" />
                <h2 className="text-3xl font-bold mb-4">Camera Access Blocked</h2>
                <p className="text-xl mb-6 max-w-lg">
                    Your browser is blocking camera access because you are using <b>HTTP</b> on a network address.
                </p>
                <div className="bg-gray-800 p-6 rounded-xl text-left max-w-lg w-full mb-8 border border-gray-700">
                    <h3 className="text-lg font-bold mb-4 text-yellow-400">To Fix This (One-Time Setup):</h3>
                    <ol className="list-decimal pl-5 space-y-3 text-gray-300">
                        <li>Open a new tab and go to <code className="bg-black px-2 py-1 rounded text-green-400">chrome://flags</code></li>
                        <li>Search for <b className="text-white">"Insecure origins"</b></li>
                        <li>Enable <b>"Insecure origins treated as secure"</b></li>
                        <li>Add this URL to the text box: <br /><code className="bg-black px-2 py-1 rounded text-blue-400 block mt-1">{window.location.origin}</code></li>
                        <li>Relaunch Chrome.</li>
                    </ol>
                </div>
                <button
                    onClick={onClose}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-xl font-bold transition"
                >
                    Close & Try Later
                </button>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-[9999] bg-gray-900 flex flex-col items-center justify-center overflow-hidden font-sans cursor-pointer"
            onClick={toggleControls}
        >
            {/* Background / Remote Video */}
            <div className="absolute inset-0 bg-black">
                {callAccepted && !callEnded ? (
                    <video
                        playsInline
                        ref={userVideo}
                        autoPlay
                        className="w-full h-full object-contain"
                    />
                ) : (
                    // Connecting State with Avatar
                    <div className="flex flex-col items-center justify-center h-full space-y-6 animate-fade-in text-white/90">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full border-4 border-white/10 bg-gray-800 flex items-center justify-center text-4xl font-bold shadow-2xl animate-pulse">
                                {chatPartner?.name?.charAt(0) || "?"}
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full border-2 border-black font-bold uppercase tracking-wider shadow">
                                {isCaller ? "Calling" : "Connecting"}
                            </div>
                        </div>
                        <div className="text-center space-y-1">
                            <h2 className="text-3xl font-bold tracking-tight">{chatPartner?.name || "Unknown"}</h2>
                            <p className="text-white/60 font-medium tracking-wide text-sm uppercase">{isCaller ? "Calling..." : "Connecting..."}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Gradient Overlay for Readability */}
            <div className={`absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent pointer-events-none transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}></div>
            <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}></div>

            {/* Top Bar Info (Glass) */}
            <div className={`absolute top-6 left-6 right-6 flex items-center justify-between z-20 transition-all duration-300 transform ${showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"}`}>
                <div className="flex items-center gap-3 bg-black/30 backdrop-blur-md border border-white/10 pl-2 pr-4 py-2 rounded-full shadow-lg">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs border border-white/20">
                        {chatPartner?.name?.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white text-sm font-bold leading-none">{chatPartner?.name}</span>
                        <span className="text-white/60 text-[10px] font-medium uppercase tracking-wide mt-0.5">
                            {callAccepted ? "In Call" : (isCaller ? "Calling..." : "Connecting...")}
                        </span>
                    </div>
                </div>

                {/* Connection Status Indicator (Small) - Simplified */}
                <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                    <div className={`w-2 h-2 rounded-full ${connectionStatus === "Peer Connected" ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`}></div>
                    <span className="text-white/70 text-xs font-medium">{connectionStatus === "Peer Connected" ? "Connected" : "Calling..."}</span>
                </div>
            </div>

            {/* Self Video (PiP) - Responsive Sizing */}
            <div
                className={`absolute bottom-24 right-4 w-28 h-40 md:bottom-32 md:right-6 md:w-36 md:h-48 bg-black/40 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl border border-white/10 transition-all duration-300 hover:scale-105 z-30 group ${showControls ? "translate-y-0" : "translate-y-16"}`}
                onClick={(e) => e.stopPropagation()} // Allow interacting with self video without toggling controls
            >
                {stream ? (
                    <video playsInline muted ref={myVideo} autoPlay className={`w-full h-full object-cover transition-transform duration-500 ${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}`} />
                ) : (
                    <div className="flex items-center justify-center h-full text-white/50 text-xs">No Camera</div>
                )}
                <div className="absolute bottom-2 left-2 text-[10px] text-white/80 font-bold bg-black/40 px-2 py-0.5 rounded backdrop-blur-md">You</div>
            </div>

            {/* Bottom Controls Bar (Glassmorphism) */}
            <div className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-50 transition-all duration-300 ${showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
                {/* Mute Button */}
                <button
                    onClick={toggleMute}
                    className={`p-4 md:p-5 rounded-full backdrop-blur-xl border border-white/10 transition-all duration-300 transform hover:scale-110 shadow-lg group relative
                    ${isMuted ? "bg-white text-gray-900 hover:bg-gray-200" : "bg-gray-800/60 text-white hover:bg-gray-700/80"}`}
                >
                    {isMuted ? <FaMicrophoneSlash size={20} /> : <FaMicrophone size={20} />}
                </button>

                {/* End Call Button (Prominent) */}
                <button
                    onClick={handleEndCall}
                    className="p-5 md:p-6 rounded-full bg-red-500/90 text-white shadow-red-900/40 border-4 border-red-500/20 hover:bg-red-600 transition-all duration-300 transform hover:scale-110 shadow-2xl mx-2 group relative"
                >
                    <FaPhoneSlash size={28} fill="white" />
                </button>

                {/* Video Toggle Button */}
                <button
                    onClick={handleToggleVideo}
                    className={`p-4 md:p-5 rounded-full backdrop-blur-xl border border-white/10 transition-all duration-300 transform hover:scale-110 shadow-lg group relative
                    ${isVideoOff ? "bg-white text-gray-900 hover:bg-gray-200" : "bg-gray-800/60 text-white hover:bg-gray-700/80"}`}
                >
                    {isVideoOff ? <FaVideoSlash size={20} /> : <FaVideo size={20} />}
                </button>

                {/* Switch Camera Button (New) */}
                <button
                    onClick={(e) => { e.stopPropagation(); switchCamera(); resetControlsTimeout(); }}
                    className="p-4 md:p-5 rounded-full backdrop-blur-xl border border-white/10 transition-all duration-300 transform hover:scale-110 shadow-lg bg-gray-800/60 text-white hover:bg-gray-700/80 group relative"
                    title="Switch Camera"
                >
                    <FaSyncAlt size={20} />
                </button>
            </div>
        </div>
    );
}
