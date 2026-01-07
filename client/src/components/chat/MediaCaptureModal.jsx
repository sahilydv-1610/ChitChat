import { useRef, useState, useEffect } from "react";
import { FaTimes, FaCamera, FaVideo, FaCircle, FaCheck, FaRedo, FaSyncAlt, FaPlay, FaPause } from "react-icons/fa";

export default function MediaCaptureModal({ isOpen, onClose, onConfirm }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [mode, setMode] = useState("photo"); // "photo" | "video"
    const [capturedImage, setCapturedImage] = useState(null);
    const [recordedChunks, setRecordedChunks] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [videoBlob, setVideoBlob] = useState(null);
    const mediaRecorderRef = useRef(null);
    const [facingMode, setFacingMode] = useState("user"); // "user" | "environment"
    const [recordingTime, setRecordingTime] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen, facingMode]); // Restart when facingMode changes

    const startCamera = async () => {
        // Stop existing stream if any before starting new one
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        try {
            const constraints = {
                video: { facingMode: facingMode },
                audio: mode === "video"
            };
            const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Camera access denied:", err);
            // alert("Could not access camera. Please allow permissions."); // Optional: Don't spam alert on switch fail
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setCapturedImage(null);
        setVideoBlob(null);
        setRecordedChunks([]);
        setIsRecording(false);
        setRecordingTime(0);
        clearInterval(timerRef.current);
    };

    const toggleCamera = () => {
        setFacingMode(prev => prev === "user" ? "environment" : "user");
    };

    const capturePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");

        // Mirror if user facing
        if (facingMode === "user") {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL("image/png"));
    };

    const startRecording = () => {
        setRecordedChunks([]);
        setRecordingTime(0);

        const mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                setRecordedChunks((prev) => [...prev, e.data]);
            }
        };

        mediaRecorder.onstop = () => {
            // Blob creation handled in effect or manual confirm
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setIsRecording(true);

        timerRef.current = setInterval(() => {
            setRecordingTime(prev => prev + 1);
        }, 1000);
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
        clearInterval(timerRef.current);
    };

    // Create blob when recording stops
    useEffect(() => {
        if (!isRecording && recordedChunks.length > 0 && !videoBlob) {
            const blob = new Blob(recordedChunks, { type: "video/webm" });
            setVideoBlob(blob);
        }
    }, [isRecording, recordedChunks]);

    const handleConfirm = () => {
        if (mode === "photo" && capturedImage) {
            fetch(capturedImage)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], `capture-${Date.now()}.png`, { type: "image/png" });
                    onConfirm(file);
                });
        } else if (mode === "video") {
            // Ensure we have the latest blob
            const blob = videoBlob || (recordedChunks.length > 0 ? new Blob(recordedChunks, { type: "video/webm" }) : null);
            if (blob) {
                const file = new File([blob], `record-${Date.now()}.webm`, { type: "video/webm" });
                onConfirm(file);
            }
        }
    };

    const handleRetake = () => {
        setCapturedImage(null);
        setVideoBlob(null);
        setRecordedChunks([]);
        setRecordingTime(0);
        // Ensure stream is active
        if (!stream || !stream.active) {
            startCamera();
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative w-full max-w-2xl bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                {/* Header */}
                <div className="absolute top-4 right-4 z-10 flex gap-4">
                    {/* Camera Toggle */}
                    {!capturedImage && !videoBlob && !isRecording && (
                        <button onClick={toggleCamera} className="bg-black/50 text-white p-3 rounded-full hover:bg-white/20 transition backdrop-blur-md">
                            <FaSyncAlt size={18} />
                        </button>
                    )}
                    <button onClick={onClose} className="bg-black/50 text-white p-3 rounded-full hover:bg-white/20 transition backdrop-blur-md">
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Main View */}
                <div className="relative aspect-video bg-black flex items-center justify-center group">
                    {capturedImage ? (
                        <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
                    ) : videoBlob ? (
                        <div className="w-full h-full relative">
                            <video
                                src={URL.createObjectURL(videoBlob)}
                                controls
                                className="w-full h-full object-contain"
                            />
                        </div>
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover transform ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                        />
                    )}

                    {/* Recording Timer */}
                    {isRecording && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-4 py-1.5 rounded-full font-mono text-sm font-bold flex items-center gap-2 shadow-lg animate-pulse">
                            <div className="w-2.5 h-2.5 bg-white rounded-full" />
                            {formatTime(recordingTime)}
                        </div>
                    )}

                    <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Controls */}
                <div className="p-6 bg-gray-900 flex flex-col items-center gap-6">
                    {/* Mode Switcher */}
                    {!capturedImage && !videoBlob && !isRecording && (
                        <div className="flex bg-gray-800 rounded-full p-1 border border-gray-700">
                            <button
                                onClick={() => setMode("photo")}
                                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${mode === "photo" ? "bg-white text-black shadow-md" : "text-gray-400 hover:text-white"}`}
                            >
                                Photo
                            </button>
                            <button
                                onClick={() => setMode("video")}
                                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${mode === "video" ? "bg-white text-black shadow-md" : "text-gray-400 hover:text-white"}`}
                            >
                                Video
                            </button>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-8">
                        {(capturedImage || videoBlob) ? (
                            <>
                                <button
                                    onClick={handleRetake}
                                    className="flex flex-col items-center gap-2 text-red-400 hover:text-red-300 transition"
                                >
                                    <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center border border-red-500/50">
                                        <FaRedo />
                                    </div>
                                    <span className="text-xs uppercase font-bold tracking-wider">Retake</span>
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className="flex flex-col items-center gap-2 text-emerald-400 hover:text-emerald-300 transition"
                                >
                                    <div className="w-12 h-12 rounded-full bg-emerald-900/30 flex items-center justify-center border border-emerald-500/50">
                                        <FaCheck />
                                    </div>
                                    <span className="text-xs uppercase font-bold tracking-wider">Send</span>
                                </button>
                            </>
                        ) : (
                            <>
                                {mode === "photo" ? (
                                    <button
                                        onClick={capturePhoto}
                                        className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg hover:shadow-white/20"
                                    >
                                        <div className="w-12 h-12 bg-white rounded-full" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={isRecording ? stopRecording : startRecording}
                                        className={`w-16 h-16 rounded-full border-4 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg ${isRecording ? "border-red-500 hover:shadow-red-500/20" : "border-white hover:shadow-white/20"}`}
                                    >
                                        <div className={`transition-all duration-300 ${isRecording ? "w-8 h-8 bg-red-500 rounded-sm" : "w-12 h-12 bg-red-500 rounded-full"}`} />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
