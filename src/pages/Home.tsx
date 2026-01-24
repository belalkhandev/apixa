import { useState, useEffect, default as React } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder,
  Plus,
  Terminal,
  Loader2,
  Zap,
  Import,
  PlayCircle,
  Search,
  Clock,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import NewCollectionModal from "../components/NewCollectionModal";
import ImportCollectionModal from "../components/ImportCollectionModal";
import SelectCollectionModal from "../components/SelectCollectionModal";
import { api, Collection } from "../api";

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.1, 0.25, 1.0] as any
    }
  }
};

function Home() {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredCollections = collections.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white font-inter text-slate-900 overflow-x-hidden selection:bg-indigo-50">
      <AnimatePresence>
        {isLoading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 bg-white"
          >
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </motion.div>
        ) : (
          <motion.div
            key="home-content"
            initial="hidden"
            animate="show"
            variants={containerVariants}
            className="flex flex-col items-center w-full min-h-screen relative py-16 pb-32"
          >
            {/* 1. Logo Section - Minimal 'Apixa' */}
            <motion.div variants={itemVariants} className="mb-8 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center">
                <Terminal size={24} className="text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">Apixa</span>
            </motion.div>

            {/* 2. Welcome Section - Simple Text */}
            <motion.div variants={itemVariants} className="text-center mb-12">
              <h1 className="text-lg font-bold text-slate-400 uppercase tracking-[0.2em]">Workspace Dashboard</h1>
            </motion.div>

            {/* 3. Three Compact Action Cards */}
            <motion.div variants={itemVariants} className="flex gap-4 mb-24">
              <MinimalActionCard
                label="New Request"
                icon={<Zap size={18} />}
                onClick={() => navigate("/quick-request")}
              />
              <MinimalActionCard
                label="Import"
                icon={<Import size={18} />}
                onClick={() => setIsImportModalOpen(true)}
              />
              <MinimalActionCard
                label="Runner"
                icon={<PlayCircle size={18} />}
                onClick={() => setIsSelectModalOpen(true)}
              />
            </motion.div>

            {/* 4. Collections Section */}
            <div className="w-full max-w-5xl px-12 flex flex-col">
              {/* Collection Header */}
              <motion.div variants={itemVariants} className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Collections</h2>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                    {collections.length} UNITS
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 h-9 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium w-48 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 h-9 bg-indigo-600 text-[11px] font-bold text-white rounded-xl hover:bg-slate-900 transition-all active:scale-95 shadow-none"
                  >
                    <Plus size={14} />
                    NEW PROJECT
                  </button>
                </div>
              </motion.div>

              {/* 5. Collection List View */}
              {filteredCollections.length === 0 ? (
                <motion.div variants={itemVariants} className="py-24 border border-slate-100 border-dashed rounded-[32px] flex flex-col items-center justify-center text-center bg-slate-50/20">
                  <Folder size={32} className="text-slate-200 mb-4" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Workspace is empty</p>
                </motion.div>
              ) : (
                <motion.div variants={itemVariants} className="flex flex-col divide-y divide-slate-50">
                  {filteredCollections.slice(0, 10).map((collection) => (
                    <CollectionRowItem
                      key={collection.id}
                      collection={collection}
                      onClick={() => navigate(`/collection/${collection.id}`)}
                    />
                  ))}
                </motion.div>
              )}

              {/* 6. Show All Button */}
              {filteredCollections.length > 10 && (
                <motion.div variants={itemVariants} className="mt-12 flex justify-center">
                  <button
                    onClick={() => navigate("/collections")}
                    className="flex items-center gap-3 px-8 h-12 bg-white border border-slate-200 rounded-2xl text-[11px] font-black tracking-[0.2em] text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all active:scale-95 group"
                  >
                    SHOW ALL COLLECTIONS
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              )}
            </div>

            {/* Modals */}
            <NewCollectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreate={handleCreateCollection} />
            <ImportCollectionModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImportSuccess={(c) => { setCollections([c, ...collections]); navigate(`/collection/${c.id}`); }} />
            <SelectCollectionModal isOpen={isSelectModalOpen} onClose={() => setIsSelectModalOpen(false)} collections={collections} onSelect={(id) => navigate(`/runner/${id}`)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MinimalActionCard({ label, icon, onClick }: { label: string, icon: React.ReactNode, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-6 h-12 bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 hover:bg-slate-50 transition-all active:scale-[0.98] group"
    >
      <span className="text-indigo-600 group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-[13px] font-bold text-slate-800 tracking-tight">{label}</span>
    </button>
  );
}

function CollectionRowItem({ collection, onClick }: { collection: Collection, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center justify-between py-6 px-2 hover:bg-slate-50/50 transition-all text-left first:rounded-t-2xl last:rounded-b-2xl border-b border-slate-50 last:border-b-0"
    >
      <div className="flex items-center gap-5">
        <div className="w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-indigo-600 flex items-center justify-center transition-all">
          <Folder size={18} className="text-slate-400 group-hover:text-white transition-colors" />
        </div>
        <div>
          <div className="text-[17px] font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors uppercase">
            {collection.name}
          </div>
          <div className="text-xs text-slate-400 font-medium italic opacity-70 truncate max-w-[320px]">
            {collection.description || "Project environment active..."}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-10">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Clock size={14} className="opacity-60" />
          {new Date(collection.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div className="w-9 h-9 rounded-full bg-slate-50 group-hover:bg-indigo-600 flex items-center justify-center text-slate-300 group-hover:text-white transition-all transform group-hover:translate-x-1">
          <ExternalLink size={16} />
        </div>
      </div>
    </button>
  );
}

export default Home;
