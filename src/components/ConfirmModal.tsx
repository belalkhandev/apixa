import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = "danger"
}: ConfirmModalProps) {
    const typeStyles = {
        danger: {
            icon: <AlertTriangle className="text-red-500" size={24} />,
            bg: "bg-red-50",
            button: "bg-red-600 hover:bg-red-700 text-white"
        },
        warning: {
            icon: <AlertTriangle className="text-amber-500" size={24} />,
            bg: "bg-amber-50",
            button: "bg-amber-600 hover:bg-amber-700 text-white"
        },
        info: {
            icon: <AlertTriangle className="text-blue-500" size={24} />,
            bg: "bg-blue-50",
            button: "bg-blue-600 hover:bg-blue-700 text-white"
        }
    };

    const style = typeStyles[type];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
                    >
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-xl ${style.bg} flex items-center justify-center shrink-0`}>
                                    {style.icon}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-slate-800 mb-1">{title}</h3>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{message}</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 flex items-center justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                                className={`px-5 py-2 text-sm font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer ${style.button}`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default ConfirmModal;
