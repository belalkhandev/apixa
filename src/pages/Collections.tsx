import { useState, useEffect, default as React } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Folder,
    Plus,
    Loader2,
    Search,
    ChevronRight,
    Clock,
    Edit2,
    Trash2,
    ChevronLeft,
    Download
} from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import NewCollectionModal from "../components/NewCollectionModal";
import { api, Collection } from "../api";

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.03,
            delayChildren: 0.05
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.3,
            ease: [0.25, 0.1, 0.25, 1.0] as any
        }
    }
};

function Collections() {
    const navigate = useNavigate();
    const [collections, setCollections] = useState<Collection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCollection, setEditingCollection] = useState<Collection | null>(null);

    useEffect(() => {
        loadCollections();
    }, []);

    const loadCollections = async () => {
        try {
            const data = await api.getCollections();
            // Order by updated_at desc
            const sorted = [...data].sort((a, b) =>
                new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
            setCollections(sorted);
        } catch (error) {
            console.error("Failed to load collections:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateCollection = async (name: string, description: string) => {
        try {
            if (editingCollection) {
                await api.updateCollection(editingCollection.id, name, description);
            } else {
                await api.createCollection(name, description);
            }
            loadCollections();
            setIsModalOpen(false);
            setEditingCollection(null);
        } catch (error) {
            console.error("Failed to process collection:", error);
        }
    };

    const handleDeleteCollection = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this collection?")) {
            try {
                await api.deleteCollection(id);
                setCollections(collections.filter(c => c.id !== id));
            } catch (error) {
                console.error("Failed to delete collection:", error);
            }
        }
    };

    const handleEditClick = (collection: Collection, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingCollection(collection);
        setIsModalOpen(true);
    };

    const handleExportAll = async () => {
        try {
            const json = await api.exportAllCollections();
            const filePath = await save({
                defaultPath: `apixa_backup_${new Date().toISOString().split('T')[0]}.postman_collection.json`,
                filters: [{ name: "Postman Collection", extensions: ["json"] }]
            });

            if (filePath) {
                await writeTextFile(filePath, json);
            }
        } catch (error) {
            console.error("Failed to export all collections:", error);
        }
    };

    const filteredCollections = collections.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-[#fafbfc] font-inter">
            <AnimatePresence>
                {isLoading ? (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 flex items-center justify-center z-50 bg-[#fafbfc]"
                    >
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </motion.div>
                ) : (
                    <motion.div
                        key="content"
                        initial="hidden"
                        animate="show"
                        variants={containerVariants}
                        className="w-full max-w-6xl mx-auto px-8 py-12"
                    >
                        {/* Header */}
                        <div className="flex flex-col gap-8 mb-12">
                            <motion.div variants={itemVariants} className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => navigate("/")}
                                        className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all cursor-pointer active:scale-95"
                                        title="Back to Home"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <div className="flex flex-col">
                                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">All Collections</h1>
                                        <p className="text-sm text-slate-500 font-medium">Manage and organize your API workspaces.</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleExportAll}
                                        className="flex items-center gap-2 px-6 h-12 bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
                                    >
                                        <Download size={16} />
                                        EXPORT ALL
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingCollection(null);
                                            setIsModalOpen(true);
                                        }}
                                        className="flex items-center gap-2 px-6 h-12 bg-blue-600 text-xs font-bold text-white rounded-xl hover:bg-blue-700 transition-all active:scale-95 cursor-pointer"
                                    >
                                        <Plus size={16} />
                                        NEW COLLECTION
                                    </button>
                                </div>
                            </motion.div>

                            {/* Search */}
                            <motion.div variants={itemVariants} className="relative group max-w-md">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10" />
                                <input
                                    type="text"
                                    placeholder="Search collections..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-12 pr-4 h-12 bg-white border border-slate-200 rounded-xl text-sm w-full focus:outline-none focus:border-blue-500 transition-all font-medium"
                                />
                            </motion.div>
                        </div>

                        {/* List */}
                        <motion.div variants={itemVariants} className="flex flex-col gap-3">
                            {filteredCollections.length === 0 ? (
                                <div className="bg-white rounded-3xl border border-slate-200 border-dashed p-24 flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-6">
                                        <Folder size={32} className="text-slate-300" />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-800">No collections found</h4>
                                    <p className="text-sm text-slate-500 max-w-[320px] mt-2">Create your first collection to start organizing your requests.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    <div className="grid grid-cols-12 px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-transparent">
                                        <div className="col-span-6">Name</div>
                                        <div className="col-span-3 text-center">Last Updated</div>
                                        <div className="col-span-3 text-right pr-4">Actions</div>
                                    </div>

                                    {filteredCollections.map((collection) => (
                                        <motion.div
                                            key={collection.id}
                                            variants={itemVariants}
                                            onClick={() => navigate(`/collection/${collection.id}`)}
                                            className="grid grid-cols-12 items-center bg-white px-6 py-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]"
                                        >
                                            <div className="col-span-6 flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                                                    <Folder size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{collection.name}</span>
                                                    {collection.description && (
                                                        <span className="text-xs text-slate-400 line-clamp-1 italic">{collection.description}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="col-span-3 text-center">
                                                <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
                                                    <Clock size={14} className="text-slate-300" />
                                                    {new Date(collection.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </div>

                                            <div className="col-span-3 flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => handleEditClick(collection, e)}
                                                    className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100 cursor-pointer"
                                                    title="Edit Collection"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteCollection(collection.id, e)}
                                                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 cursor-pointer"
                                                    title="Delete Collection"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <div className="w-px h-6 bg-slate-100 mx-1" />
                                                <div className="p-2.5 text-slate-300 group-hover:text-blue-500 transition-all">
                                                    <ChevronRight size={20} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </motion.div >
                )
                }
            </AnimatePresence >

            <NewCollectionModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingCollection(null);
                }}
                onCreate={handleCreateCollection}
                initialData={editingCollection ? { name: editingCollection.name, description: editingCollection.description || "" } : undefined}
            />
        </div >
    );
}

export default Collections;
