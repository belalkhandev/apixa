import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FolderPlus, Folder, Plus, Check } from "lucide-react";
import { api, Collection } from "../api";

interface SaveToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (collectionId: string, folderId?: string) => void;
  requestName?: string;
}

function SaveToCollectionModal({
  isOpen,
  onClose,
  onSave,
  requestName = "Request",
}: SaveToCollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCollections();
    }
  }, [isOpen]);

  const loadCollections = async () => {
    try {
      const data = await api.getCollections();
      setCollections(data);
      if (data.length === 0) {
        setIsCreatingNew(true);
      } else {
        setSelectedCollectionId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load collections:", err);
    }
  };

  const handleCreateAndSave = async () => {
    if (!newCollectionName.trim()) return;

    setIsLoading(true);
    try {
      const newCollection = await api.createCollection(
        newCollectionName.trim(),
        newCollectionDescription.trim() || undefined
      );
      onSave(newCollection.id);
      resetAndClose();
    } catch (err) {
      console.error("Failed to create collection:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToExisting = () => {
    if (!selectedCollectionId) return;
    onSave(selectedCollectionId);
    resetAndClose();
  };

  const resetAndClose = () => {
    setIsCreatingNew(false);
    setNewCollectionName("");
    setNewCollectionDescription("");
    setSelectedCollectionId(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={resetAndClose}
          className="fixed inset-0 bg-slate-900/20 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl w-full max-w-md mx-4 overflow-hidden shadow-xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FolderPlus size={18} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Save to Collection</h2>
                  <p className="text-xs text-slate-500">Save "{requestName}" to a collection</p>
                </div>
              </div>
              <button
                onClick={resetAndClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              {!isCreatingNew && collections.length > 0 ? (
                <>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Collection
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                    {collections.map((collection) => (
                      <button
                        key={collection.id}
                        onClick={() => setSelectedCollectionId(collection.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                          selectedCollectionId === collection.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <Folder
                          size={16}
                          className={
                            selectedCollectionId === collection.id
                              ? "text-blue-500"
                              : "text-slate-400"
                          }
                        />
                        <span
                          className={`text-sm font-medium ${
                            selectedCollectionId === collection.id
                              ? "text-blue-700"
                              : "text-slate-700"
                          }`}
                        >
                          {collection.name}
                        </span>
                        {selectedCollectionId === collection.id && (
                          <Check size={16} className="ml-auto text-blue-500" />
                        )}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setIsCreatingNew(true)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-500 hover:border-slate-300 hover:text-slate-600 transition-colors mb-4"
                  >
                    <Plus size={14} />
                    Create New Collection
                  </button>

                  <div className="flex gap-3">
                    <button
                      onClick={resetAndClose}
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveToExisting}
                      disabled={!selectedCollectionId}
                      className="flex-1 px-4 py-2 bg-blue-500 rounded-lg text-sm font-medium text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Collection Name
                    </label>
                    <input
                      type="text"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      placeholder="My API Collection"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 transition-colors"
                      autoFocus
                    />
                  </div>

                  <div className="mb-5">
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={newCollectionDescription}
                      onChange={(e) => setNewCollectionDescription(e.target.value)}
                      placeholder="Optional description..."
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 transition-colors resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        if (collections.length > 0) {
                          setIsCreatingNew(false);
                        } else {
                          resetAndClose();
                        }
                      }}
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      {collections.length > 0 ? "Back" : "Cancel"}
                    </button>
                    <button
                      onClick={handleCreateAndSave}
                      disabled={!newCollectionName.trim() || isLoading}
                      className="flex-1 px-4 py-2 bg-blue-500 rounded-lg text-sm font-medium text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? "Creating..." : "Create & Save"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SaveToCollectionModal;
