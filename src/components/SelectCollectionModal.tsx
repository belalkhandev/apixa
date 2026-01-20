import { motion, AnimatePresence } from "framer-motion";
import { X, Folder, ChevronRight, Search } from "lucide-react";
import { Collection } from "../api";
import { useState } from "react";

interface SelectCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    collections: Collection[];
    onSelect: (collectionId: string) => void;
}

export default function SelectCollectionModal({ isOpen, onClose, collections, onSelect }: SelectCollectionModalProps) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredCollections = collections.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                    >
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-800">Select Collection</h2>
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-slate-200 rounded-lg transition-colors text-slate-400"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="relative mb-4">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search collections..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>

                            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredCollections.length > 0 ? (
                                    filteredCollections.map((collection) => (
                                        <button
                                            key={collection.id}
                                            onClick={() => {
                                                onSelect(collection.id);
                                                onClose();
                                            }}
                                            className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-blue-50 group transition-all border border-transparent hover:border-blue-100"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-amber-50 rounded-lg text-amber-500 group-hover:bg-amber-100 transition-colors">
                                                    <Folder size={18} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-semibold text-slate-700 group-hover:text-blue-700">{collection.name}</p>
                                                    {collection.description && (
                                                        <p className="text-[10px] text-slate-400 line-clamp-1">{collection.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                                        </button>
                                    ))
                                ) : (
                                    <div className="py-10 text-center">
                                        <p className="text-sm text-slate-400">No collections found</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
