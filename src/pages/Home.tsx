import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Folder, Plus, Terminal, Loader2, Zap, Import, PlayCircle } from "lucide-react";
import NewCollectionModal from "../components/NewCollectionModal";
import ImportCollectionModal from "../components/ImportCollectionModal";
import SelectCollectionModal from "../components/SelectCollectionModal";
import { api, Collection } from "../api";

function Home() {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const data = await api.getCollections();
      setCollections(data);
    } catch (error) {
      console.error("Failed to load collections:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCollectionClick = (collectionId: string) => {
    navigate(`/collection/${collectionId}`);
  };

  const handleCreateCollection = async (name: string, description: string) => {
    try {
      const newCollection = await api.createCollection(name, description || undefined);
      setCollections([newCollection, ...collections]);
      setIsModalOpen(false);
      navigate(`/collection/${newCollection.id}`);
    } catch (error) {
      console.error("Failed to create collection:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 mb-5 shadow-lg shadow-blue-500/25">
            <Terminal size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Apixa</h1>
          <p className="text-slate-500 mt-2">Lightweight API Client</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {/* Quick Request Button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => navigate("/quick-request")}
            className="flex items-center gap-2 px-5 py-3 border-2 border-dashed border-emerald-300 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
          >
            <Zap size={18} className="text-emerald-500" />
            <span className="text-sm font-medium text-emerald-600">New Request</span>
          </motion.button>

          {/* Load Test Button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            onClick={() => setIsSelectModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 border-2 border-dashed border-blue-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <PlayCircle size={18} className="text-blue-500" />
            <span className="text-sm font-medium text-blue-600">Load Test</span>
          </motion.button>

          {collections.map((collection, index) => (
            <div key={collection.id} className="group relative">
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: (index + 2) * 0.05 }}
                onClick={() => handleCollectionClick(collection.id)}
                className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-colors w-full"
              >
                <Folder size={18} className="text-amber-500" />
                <span className="text-sm font-medium text-slate-700">{collection.name}</span>
              </motion.button>
            </div>
          ))}

          {/* New Collection Button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: (collections.length + 3) * 0.05 }}
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-colors"
          >
            <Plus size={18} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-500">New Collection</span>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: (collections.length + 4) * 0.05 }}
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors group"
          >
            <Import size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
            <span className="text-sm font-medium text-slate-500 group-hover:text-blue-600 transition-colors">Import</span>
          </motion.button>
        </div>
      </motion.div >

      <NewCollectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateCollection}
      />

      <ImportCollectionModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={(collection) => {
          setCollections([collection, ...collections]);
          navigate(`/collection/${collection.id}`);
        }}
      />

      <SelectCollectionModal
        isOpen={isSelectModalOpen}
        onClose={() => setIsSelectModalOpen(false)}
        collections={collections}
        onSelect={(id) => navigate(`/runner/${id}`)}
      />
    </div >
  );
}

export default Home;
