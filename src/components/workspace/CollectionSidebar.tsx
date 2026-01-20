import { motion, AnimatePresence } from "framer-motion";
import {
    Home as HomeIcon,
    MoreHorizontal,
    Edit3,
    Trash2,
    Search,
    Plus,
    FolderPlus,
    Folder,
    Loader2,
    Check,
    X,
    ChevronUp,
    Layers,
} from "lucide-react";
import { Collection, TreeItem } from "../../api";
import TreeItemRenderer from "./TreeItemRenderer";
import { useState, useRef, useEffect } from "react";

interface CollectionSidebarProps {
    collection: Collection | null;
    collections: Collection[];
    treeItems: TreeItem[];
    isLoading: boolean;
    activeTabId: string | null;
    folderOpenState: Record<string, boolean>;
    draggedItemId: string | null;
    draggedItemType: "request" | "folder" | null;
    dragOverFolderId: string | null;
    showNewFolderInput: string | null;
    newFolderName: string;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onToggleFolder: (id: string) => void;
    onRequestClick: (id: string, name: string, method: string, url: string) => void;
    onNewRequest: (folderId?: string) => void;
    onCreateFolder: (parentId?: string) => void;
    onDeleteFolder: (id: string) => void;
    onDeleteRequest: (id: string) => void;
    onShowNewFolderInput: (id: string | null) => void;
    onSetNewFolderName: (name: string) => void;
    onDragStart: (e: React.DragEvent, id: string, type: "request" | "folder") => void;
    onDragEnd: () => void;
    onDragOver: (e: React.DragEvent, id: string) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, id: string) => void;
    onHomeClick: () => void;
    onSwitchCollection: (collectionId: string) => void;

    isEditingCollectionName: boolean;
    editedCollectionName: string;
    onSetEditedCollectionName: (name: string) => void;
    onSaveCollectionName: () => void;
    onCancelEditCollectionName: () => void;
    onRenameCollectionStart: () => void;
    onDeleteCollection: () => void;
}

const filterTreeItems = (items: TreeItem[], query: string): TreeItem[] => {
    if (!query) return items;

    const lowerQuery = query.toLowerCase();

    return items.reduce((filtered: TreeItem[], item) => {
        if (item.type === "Folder") {
            // Recursively filter folder children
            const filteredChildren = filterTreeItems(item.items, query);
            if (filteredChildren.length > 0) {
                filtered.push({ ...item, items: filteredChildren });
            }
        } else if (item.type === "Request") {
            // Check if request name or URL matches
            const nameMatches = item.name.toLowerCase().includes(lowerQuery);
            const urlMatches = item.url.toLowerCase().includes(lowerQuery);

            if (nameMatches || urlMatches) {
                filtered.push(item);
            }
        }

        return filtered;
    }, []);
};

export default function CollectionSidebar({
    collection,
    collections,
    treeItems,
    isLoading,
    activeTabId,
    folderOpenState,
    draggedItemId,
    draggedItemType,
    dragOverFolderId,
    showNewFolderInput,
    newFolderName,
    searchQuery,
    onSearchChange,
    onToggleFolder,
    onRequestClick,
    onNewRequest,
    onCreateFolder,
    onDeleteFolder,
    onDeleteRequest,
    onShowNewFolderInput,
    onSetNewFolderName,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragLeave,
    onDrop,
    onHomeClick,
    onSwitchCollection,
    isEditingCollectionName,
    editedCollectionName,
    onSetEditedCollectionName,
    onSaveCollectionName,
    onCancelEditCollectionName,
    onRenameCollectionStart,
    onDeleteCollection,
}: CollectionSidebarProps) {
    const [showCollectionMenu, setShowCollectionMenu] = useState(false);
    const [showCollectionSwitcher, setShowCollectionSwitcher] = useState(false);
    const treeContainerRef = useRef<HTMLDivElement>(null);

    const otherCollections = collections.filter(c => c.id !== collection?.id);

    // Scroll to top when showing root folder input
    useEffect(() => {
        if (showNewFolderInput === "root" && treeContainerRef.current) {
            treeContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
    }, [showNewFolderInput]);

    return (
        <aside className="w-[280px] bg-white border-r border-slate-200 flex flex-col h-full">
            {/* Collection Header */}
            <div className="p-4 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <button
                        onClick={onHomeClick}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Back to Home"
                    >
                        <HomeIcon size={16} className="text-slate-500" />
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowCollectionMenu(!showCollectionMenu)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <MoreHorizontal size={16} className="text-slate-500" />
                        </button>
                        <AnimatePresence>
                            {showCollectionMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-30"
                                >
                                    <button
                                        onClick={() => {
                                            onRenameCollectionStart();
                                            setShowCollectionMenu(false);
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                    >
                                        <Edit3 size={14} />
                                        Rename
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowCollectionMenu(false);
                                            onDeleteCollection();
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <Trash2 size={14} />
                                        Delete
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {isEditingCollectionName ? (
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={editedCollectionName}
                            onChange={(e) => onSetEditedCollectionName(e.target.value)}
                            className="flex-1 px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter") onSaveCollectionName();
                                if (e.key === "Escape") onCancelEditCollectionName();
                            }}
                        />
                        <button onClick={onSaveCollectionName} className="text-blue-600 hover:text-blue-700">
                            <Check size={16} />
                        </button>
                        <button onClick={onCancelEditCollectionName} className="text-slate-400 hover:text-slate-600">
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <h2
                        className="text-lg font-bold text-slate-800 truncate"
                        title={collection?.name}
                    >
                        {collection?.name || "Loading..."}
                    </h2>
                )}
                <p className="text-xs text-slate-500 mt-1 truncate">
                    {collection?.description || "No description"}
                </p>

                <div className="mt-4 relative group">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-blue-400 focus:bg-white transition-all placeholder:text-slate-400"
                    />
                </div>

                <div className="flex gap-2 mt-3">
                    <button
                        onClick={() => onNewRequest()}
                        className="flex-1 flex items-center justify-center gap-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                        <Plus size={14} />
                        New Request
                    </button>
                    <button
                        onClick={() => onShowNewFolderInput("root")}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                        title="New Folder"
                    >
                        <FolderPlus size={14} />
                    </button>
                </div>
            </div>

            {/* Collection Tree */}
            <div ref={treeContainerRef} className="flex-1 overflow-y-auto p-2">
                {/* Root folder input */}
                {showNewFolderInput === "root" && (
                    <div className="flex items-center gap-2 p-2 mb-2 bg-slate-50 rounded-lg border border-blue-200">
                        <Folder size={14} className="text-amber-500 shrink-0" />
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => onSetNewFolderName(e.target.value)}
                            placeholder="Folder name"
                            className="flex-1 text-sm bg-transparent focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && newFolderName.trim()) {
                                    onCreateFolder();
                                }
                                if (e.key === "Escape") {
                                    onShowNewFolderInput(null);
                                    onSetNewFolderName("");
                                }
                            }}
                        />
                        <button
                            onClick={() => {
                                if (newFolderName.trim()) {
                                    onCreateFolder();
                                }
                            }}
                            className="p-1 hover:bg-slate-200 rounded text-blue-600"
                        >
                            <Check size={14} />
                        </button>
                        <button
                            onClick={() => {
                                onShowNewFolderInput(null);
                                onSetNewFolderName("");
                            }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-400"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-slate-400" />
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {treeItems.map((item) => (
                            <TreeItemRenderer
                                key={item.id}
                                item={item}
                                activeTabId={activeTabId}
                                folderOpenState={folderOpenState}
                                draggedItemId={draggedItemId}
                                draggedItemType={draggedItemType}
                                dragOverFolderId={dragOverFolderId}
                                showNewFolderInput={showNewFolderInput}
                                newFolderName={newFolderName}
                                onToggleFolder={onToggleFolder}
                                onRequestClick={onRequestClick}
                                onDeleteRequest={onDeleteRequest}
                                onDeleteFolder={onDeleteFolder}
                                onNewRequest={onNewRequest}
                                onShowNewFolderInput={onShowNewFolderInput}
                                onSetNewFolderName={onSetNewFolderName}
                                onCreateFolder={onCreateFolder}
                                onDragStart={onDragStart}
                                onDragEnd={onDragEnd}
                                onDragOver={onDragOver}
                                onDragLeave={onDragLeave}
                                onDrop={onDrop}
                            />
                        ))}
                    </div>
                )}
            </div>

            {otherCollections.length > 0 && (
                <div className="border-t border-slate-200 flex-shrink-0 relative">
                    <button
                        onClick={() => setShowCollectionSwitcher(!showCollectionSwitcher)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                    >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <Layers size={16} className="text-white" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-xs text-slate-400">Switch Collection</p>
                            <p className="text-sm font-medium text-slate-700 truncate">
                                {collection?.name || "Select"}
                            </p>
                        </div>
                        <ChevronUp
                            size={16}
                            className={`text-slate-400 transition-transform ${showCollectionSwitcher ? "" : "rotate-180"}`}
                        />
                    </button>

                    <AnimatePresence>
                        {showCollectionSwitcher && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ duration: 0.15 }}
                                className="absolute bottom-full left-2 right-2 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-40"
                            >
                                <div className="py-1 max-h-48 overflow-y-auto">
                                    {otherCollections.map((col) => (
                                        <button
                                            key={col.id}
                                            onClick={() => {
                                                onSwitchCollection(col.id);
                                                setShowCollectionSwitcher(false);
                                            }}
                                            className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors flex items-center gap-3"
                                        >
                                            <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
                                                <Layers size={12} className="text-slate-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-700 truncate">
                                                    {col.name}
                                                </p>
                                                {col.description && (
                                                    <p className="text-xs text-slate-400 truncate">
                                                        {col.description}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </aside>
    );
}
