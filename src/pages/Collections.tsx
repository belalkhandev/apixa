import { useState, useEffect, default as React } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
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
    Download,
    Import
} from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import NewCollectionModal from "../components/NewCollectionModal";
import ImportCollectionModal from "../components/ImportCollectionModal";
import ConfirmModal from "../components/ConfirmModal";
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
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

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
                toast.success("Collection updated successfully");
            } else {
                await api.createCollection(name, description);
                toast.success("Collection created successfully");
            }
            loadCollections();
            setIsModalOpen(false);
            setEditingCollection(null);
        } catch (error) {
            console.error("Failed to process collection:", error);
            toast.error(editingCollection ? "Failed to update collection" : "Failed to create collection");
        }
    };

    const handleDeleteCollection = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await api.deleteCollection(deleteId);
            setCollections(collections.filter(c => c.id !== deleteId));
            toast.success("Collection deleted successfully");
        } catch (error) {
            console.error("Failed to delete collection:", error);
            toast.error("Failed to delete collection");
        } finally {
            setDeleteId(null);
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
                toast.success("Collections exported successfully");
            }
        } catch (error) {
            console.error("Failed to export all collections:", error);
            toast.error("Failed to export collections");
        }
    };

    const filteredCollections = collections.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="flex flex-col h-full font-inter bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/")}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 dark:text-slate-400"
                        title="Back to Home"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-800 dark:text-white">All Collections</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Manage and organize your API workspaces</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm"
                    >
                        <Import size={16} />
                        Import
                    </button>
                    <button
                        onClick={handleExportAll}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm"
                    >
                        <Download size={16} />
                        Export All
                    </button>
                    <button
                        onClick={() => {
                            setEditingCollection(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors text-sm"
                    >
                        <Plus size={16} />
                        New Collection
                    </button>
                </div>
            </header>

            <AnimatePresence>
                {isLoading ? (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex items-center justify-center"
                    >
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </motion.div>
                ) : (
                    <motion.main
                        key="content"
                        initial="hidden"
                        animate="show"
                        variants={containerVariants}
                        className="flex-1 p-6 w-full"
                    >
                        {/* Search */}
                        <motion.div variants={itemVariants} className="relative group max-w-md mb-6">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10" />
                            <input
                                type="text"
                                placeholder="Search collections..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-12 pr-4 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm w-full focus:outline-none focus:border-blue-500 transition-all font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                        </motion.div>

                        {/* List */}
                        <motion.div variants={itemVariants} className="flex flex-col gap-3">
                            {filteredCollections.length === 0 ? (
                                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed p-24 flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center mb-6">
                                        <Folder size={32} className="text-slate-300 dark:text-slate-500" />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-800 dark:text-white">No collections found</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[320px] mt-2">Create your first collection to start organizing your requests.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1.5">
                                    <div className="grid grid-cols-12 px-6 py-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-transparent">
                                        <div className="col-span-6">Name</div>
                                        <div className="col-span-3 text-center">Last Updated</div>
                                        <div className="col-span-3 text-right pr-4">Actions</div>
                                    </div>

                                    {filteredCollections.map((collection) => (
                                        <motion.div
                                            key={collection.id}
                                            variants={itemVariants}
                                            onClick={() => navigate(`/collection/${collection.id}`)}
                                            className="grid grid-cols-12 items-center bg-white dark:bg-slate-800 px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm transition-all cursor-pointer group active:scale-[0.99]"
                                        >
                                            <div className="col-span-6 flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 flex items-center justify-center transition-colors">
                                                    <Folder size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{collection.name}</span>
                                                    {collection.description && (
                                                        <span className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1 italic">{collection.description}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="col-span-3 text-center">
                                                <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                                    <Clock size={14} className="text-slate-300 dark:text-slate-500" />
                                                    {new Date(collection.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </div>

                                            <div className="col-span-3 flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => handleEditClick(collection, e)}
                                                    className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-800 cursor-pointer"
                                                    title="Edit Collection"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteCollection(collection.id, e)}
                                                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all border border-transparent hover:border-red-100 dark:hover:border-red-800 cursor-pointer"
                                                    title="Delete Collection"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <div className="w-px h-6 bg-slate-100 dark:bg-slate-700 mx-1" />
                                                <div className="p-2.5 text-slate-300 dark:text-slate-500 group-hover:text-blue-500 transition-all">
                                                    <ChevronRight size={20} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </motion.main>
                )}
            </AnimatePresence>

            <NewCollectionModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingCollection(null);
                }}
                onCreate={handleCreateCollection}
                initialData={editingCollection ? { name: editingCollection.name, description: editingCollection.description || "" } : undefined}
            />

            <ConfirmModal
                isOpen={deleteId !== null}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Delete Collection"
                message="Are you sure you want to delete this collection? This will permanently remove all requests and folders inside it."
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
            />

            <ImportCollectionModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportSuccess={(c) => {
                    setCollections([c, ...collections]);
                    toast.success("Collection imported successfully");
                    navigate(`/collection/${c.id}`);
                }}
            />
        </div>
    );
}

export default Collections;
