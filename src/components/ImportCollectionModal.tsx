import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileJson, Check, AlertCircle, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Collection } from "../api";

interface ImportCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImportSuccess: (collection: Collection) => void;
}

export default function ImportCollectionModal({
    isOpen,
    onClose,
    onImportSuccess,
}: ImportCollectionModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setProgress(0);
        }
    };

    const handleImport = async () => {
        if (!file) {
            setError("Please select a file first.");
            return;
        }

        setIsImporting(true);
        setError(null);
        setProgress(10);

        // Simulate progress start
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 90) {
                    clearInterval(interval);
                    return 90;
                }
                return prev + 10;
            });
        }, 200);

        try {
            const content = await file.text();
            // Simulate a bit more delay for visual feedback if file read is too fast
            await new Promise(r => setTimeout(r, 500));

            const importedCollection: Collection = await invoke("import_postman_collection", {
                jsonContent: content
            });

            clearInterval(interval);
            setProgress(100);

            // Small delay to show 100%
            setTimeout(() => {
                setIsImporting(false);
                setFile(null);
                setProgress(0);
                onImportSuccess(importedCollection);
                onClose();
            }, 500);

        } catch (err) {
            clearInterval(interval);
            setIsImporting(false);
            setProgress(0);
            console.error("Import failed:", err);
            setError("Failed to import collection. Please check if the file is a valid Postman v2.1 export.");
        }
    };

    const handleClose = () => {
        if (isImporting) return;
        setFile(null);
        setError(null);
        setProgress(0);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-white rounded-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <h2 className="text-xl font-semibold text-slate-800">Import Collection</h2>
                        <button
                            onClick={handleClose}
                            disabled={isImporting}
                            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        <div className="mb-6">
                            <p className="text-slate-600 text-sm mb-4">
                                Select a Postman Collection (v2.1) JSON file to import into Apixa.
                            </p>

                            {!file ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                                        <Upload size={24} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-600 group-hover:text-blue-600">Click to choose a file</span>
                                    <span className="text-xs text-slate-400 mt-1">.json files only</span>
                                </div>
                            ) : (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <FileJson size={20} className="text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                                        <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    {!isImporting && (
                                        <button
                                            onClick={() => setFile(null)}
                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>
                            )}

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".json"
                                className="hidden"
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 flex items-start gap-3 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Progress Bar */}
                        {isImporting && (
                            <div className="mb-6">
                                <div className="flex justify-between text-xs font-medium text-slate-500 mb-2">
                                    <span>Importing...</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-blue-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={handleClose}
                                disabled={isImporting}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!file || isImporting}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Importing...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} />
                                        <span>Import Collection</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
