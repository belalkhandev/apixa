import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronRight,
    Folder,
    Plus,
    FolderPlus,
    Trash2,
    Check,
    X,
} from "lucide-react";
import { methodTextColors } from "../../constants";
import { TreeItem } from "../../api";

interface TreeItemRendererProps {
    item: TreeItem;
    depth?: number;
    activeTabId: string | null;
    folderOpenState: Record<string, boolean>;
    draggedItemId: string | null;
    draggedItemType: "request" | "folder" | null;
    dragOverFolderId: string | null;
    showNewFolderInput: string | null;
    newFolderName: string;
    onToggleFolder: (id: string) => void;
    onRequestClick: (id: string, name: string, method: string, url: string) => void;
    onDeleteRequest: (id: string) => void;
    onDeleteFolder: (id: string) => void;
    onNewRequest: (folderId?: string) => void;
    onShowNewFolderInput: (id: string | null) => void;
    onSetNewFolderName: (name: string) => void;
    onCreateFolder: (parentId: string) => void;
    onDragStart: (e: React.DragEvent, id: string, type: "request" | "folder") => void;
    onDragEnd: () => void;
    onDragOver: (e: React.DragEvent, id: string) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, id: string) => void;
}

const countTreeItems = (items: TreeItem[]): number => {
    let count = 0;
    items.forEach((item) => {
        if (item.type === "Request") {
            count++;
        } else {
            count += countTreeItems(item.items);
        }
    });
    return count;
};

export default function TreeItemRenderer({
    item,
    depth = 0,
    activeTabId,
    folderOpenState,
    draggedItemId,
    draggedItemType,
    dragOverFolderId,
    showNewFolderInput,
    newFolderName,
    onToggleFolder,
    onRequestClick,
    onDeleteRequest,
    onDeleteFolder,
    onNewRequest,
    onShowNewFolderInput,
    onSetNewFolderName,
    onCreateFolder,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragLeave,
    onDrop,
}: TreeItemRendererProps) {
    if (item.type === "Request") {
        const isDragging = draggedItemId === item.id && draggedItemType === "request";

        return (
            <div
                key={item.id}
                draggable
                onDragStart={(e) => onDragStart(e, item.id, "request")}
                onDragEnd={onDragEnd}
                className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab transition-all ${isDragging
                        ? "opacity-50 bg-blue-100"
                        : activeTabId === item.id
                            ? "bg-blue-50 text-blue-700"
                            : "hover:bg-slate-50 text-slate-600"
                    }`}
                style={{ marginLeft: `${depth * 12}px` }}
                onClick={() => onRequestClick(item.id, item.name, item.method, item.url)}
            >
                <span
                    className={`text-[10px] font-bold uppercase w-10 shrink-0 ${activeTabId === item.id
                            ? methodTextColors[item.method]?.replace("text-", "text-") || "text-blue-600"
                            : methodTextColors[item.method] || "text-slate-500"
                        }`}
                >
                    {item.method}
                </span>
                <span className="text-sm truncate flex-1">{item.name}</span>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRequest(item.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-500 transition-all"
                >
                    <Trash2 size={12} />
                </button>
            </div>
        );
    }

    const isOpen = folderOpenState[item.id] ?? false;
    const isDragOver = dragOverFolderId === item.id;
    const isFolderDragging = draggedItemId === item.id && draggedItemType === "folder";
    // Don't allow dropping a folder into itself
    const canDrop = !(draggedItemType === "folder" && draggedItemId === item.id);

    return (
        <div key={item.id}>
            <div
                draggable
                onDragStart={(e) => onDragStart(e, item.id, "folder")}
                onDragEnd={onDragEnd}
                onDragOver={(e) => canDrop && onDragOver(e, item.id)}
                onDragLeave={onDragLeave}
                onDrop={(e) => canDrop && onDrop(e, item.id)}
                className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg transition-colors cursor-grab ${isFolderDragging
                        ? "opacity-50 bg-blue-100"
                        : isDragOver && canDrop
                            ? "bg-blue-100 ring-2 ring-blue-400 ring-inset"
                            : "hover:bg-slate-50"
                    }`}
                style={{ marginLeft: `${depth * 12}px` }}
            >
                <button
                    onClick={() => onToggleFolder(item.id)}
                    className="flex-1 flex items-center gap-2 min-w-0"
                >
                    <ChevronRight
                        size={14}
                        className={`text-slate-400 transition-transform shrink-0 ${isOpen ? "rotate-90" : ""}`}
                    />
                    <Folder size={14} className={isDragOver ? "text-blue-500" : "text-amber-500"} />
                    <span className="text-sm text-slate-700 truncate">{item.name}</span>
                    <span className="text-xs text-slate-400 shrink-0">{countTreeItems(item.items)}</span>
                </button>
                <div className="opacity-0 group-hover:opacity-100 flex items-center shrink-0 transition-opacity">
                    <button
                        onClick={() => onNewRequest(item.id)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-blue-600"
                        title="Add Request"
                    >
                        <Plus size={12} />
                    </button>
                    <button
                        onClick={() => onShowNewFolderInput(item.id)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-blue-600"
                        title="Add Folder"
                    >
                        <FolderPlus size={12} />
                    </button>
                    <button
                        onClick={() => onDeleteFolder(item.id)}
                        className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-500"
                        title="Delete Folder"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                    >
                        {showNewFolderInput === item.id && (
                            <div
                                className="flex items-center gap-2 p-2 mx-2 my-1 bg-slate-50 rounded-lg"
                                style={{ marginLeft: `${(depth + 1) * 12 + 8}px` }}
                            >
                                <Folder size={14} className="text-slate-400 shrink-0" />
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => onSetNewFolderName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") onCreateFolder(item.id);
                                        if (e.key === "Escape") onShowNewFolderInput(null);
                                    }}
                                    placeholder="Folder name"
                                    className="flex-1 text-sm bg-transparent focus:outline-none"
                                    autoFocus
                                />
                                <button
                                    onClick={() => onCreateFolder(item.id)}
                                    className="p-1 hover:bg-slate-200 rounded text-blue-600"
                                >
                                    <Check size={14} />
                                </button>
                                <button
                                    onClick={() => onShowNewFolderInput(null)}
                                    className="p-1 hover:bg-slate-200 rounded text-slate-400"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                        {item.items.map((child) => (
                            <TreeItemRenderer
                                key={child.id}
                                item={child}
                                depth={depth + 1}
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
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
