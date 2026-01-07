import { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { axiosInstance } from '../config';

export default function ReportModal({ isOpen, onClose, reportedUser, currentUser }) {
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axiosInstance.post('/reports', {
                reporter: currentUser._id,
                reportedUser: reportedUser._id,
                reason: reason
            });
            alert("User reported successfully.");
            setReason("");
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to report user.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card-app rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in-up">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-main">Report User</h3>
                    <button onClick={onClose} className="text-muted hover:text-main transition-colors">
                        <FaTimes size={20} />
                    </button>
                </div>
                <p className="text-muted mb-4">
                    Reporting <span className="font-semibold text-main">{reportedUser?.name}</span>. Please tell us why.
                </p>
                <form onSubmit={handleSubmit}>
                    <textarea
                        className="w-full p-3 bg-app border border-app rounded-xl focus:ring-2 focus:ring-red-500/50 outline-none transition-all text-main mb-4 resize-none h-32"
                        placeholder="Reason for reporting..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        required
                    />
                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-muted font-medium hover:bg-input-app rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? "Submitting..." : "Report User"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
