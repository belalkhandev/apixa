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
  Clock
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
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1.0] as any // Smooth ease-out
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
    <div className="min-h-screen bg-[#fafbfc] font-inter relative overflow-hidden">
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
            key="home-content"
            initial="hidden"
            animate="show"
            variants={containerVariants}
            className="flex flex-col items-center w-full min-h-screen relative z-10"
          >
            {/* Top Navigation Bar */}
            <header className="w-full max-w-6xl px-8 flex items-center py-12">
              <motion.div variants={itemVariants} className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center">
                  <Terminal size={22} className="text-white" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Apixa</h1>
              </motion.div>
            </header>

            <main className="w-full max-w-6xl px-8 py-4 flex flex-col gap-14">
              <motion.div variants={itemVariants} className="flex flex-col gap-1">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Welcome to your workspace</h2>
                <p className="text-sm text-slate-500 font-medium opacity-80">Manage your API requests and collections in one place.</p>
              </motion.div>

              {/* Action Cards */}
              <motion.section variants={itemVariants}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <ActionCard
                    title="New Request"
                    description="Fast HTTP testing without overhead"
                    icon={<Zap size={22} className="text-emerald-500" />}
                    color="emerald"
                    onClick={() => navigate("/quick-request")}
                  />
                  <ActionCard
                    title="Load Test"
                    description="Execute performance runs on collections"
                    icon={<PlayCircle size={22} className="text-blue-500" />}
                    color="blue"
                    onClick={() => setIsSelectModalOpen(true)}
                  />
                  <ActionCard
                    title="Import"
                    description="Load collections from file or URL"
                    icon={<Import size={22} className="text-indigo-500" />}
                    color="indigo"
                    onClick={() => setIsImportModalOpen(true)}
                  />
                </div>
              </motion.section>

              {/* Collections Section */}
              <motion.section variants={itemVariants} className="mb-32">
                <div className="flex items-center justify-between mb-6 px-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Collections</h3>
                    <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{collections.length}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative group">
                      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10" />
                      <input
                        type="text"
                        placeholder="Search collections..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 h-12 bg-white border border-slate-200 rounded-xl text-sm w-72 focus:outline-none focus:border-blue-500 transition-all font-medium"
                      />
                    </div>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="flex items-center gap-2 px-6 h-12 bg-blue-600 text-xs font-bold text-white rounded-xl hover:bg-blue-700 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      <Plus size={16} />
                      NEW COLLECTION
                    </button>
                  </div>
                </div>

                {filteredCollections.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 border-dashed p-24 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-6">
                      <Folder size={32} className="text-slate-300" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-800">No collections found</h4>
                    <p className="text-sm text-slate-500 max-w-[320px] mt-2">Create your first collection to start organizing your requests.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredCollections.slice(0, 9).map((collection) => (
                      <CollectionGridCard
                        key={collection.id}
                        collection={collection}
                        onClick={() => navigate(`/collection/${collection.id}`)}
                      />
                    ))}
                    {filteredCollections.length > 9 ? (
                      <ViewMoreCard
                        remainingCount={filteredCollections.length - 9}
                        onClick={() => navigate("/collections")}
                      />
                    ) : (
                      <NewCollectionCard onClick={() => setIsModalOpen(true)} />
                    )}
                  </div>
                )}
              </motion.section>
            </main>

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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionCard({ title, description, icon, color, onClick }: { title: string, description: string, icon: React.ReactNode, color: string, onClick: () => void }) {
  const iconColors: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };

  return (
    <motion.button
      variants={itemVariants}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="flex flex-col gap-4 p-6 text-left rounded-xl bg-white border border-slate-200 transition-all active:scale-[0.98] group cursor-pointer hover:border-blue-300"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${iconColors[color]}`}>
        {icon}
      </div>
      <div>
        <h3 className="text-[13px] font-bold text-slate-800 leading-tight mb-0.5 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-1">{description}</p>
      </div>
    </motion.button>
  );
}

function CollectionGridCard({ collection, onClick }: { collection: Collection, onClick: () => void }) {
  return (
    <motion.button
      variants={itemVariants}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="group bg-white p-4 rounded-xl border border-slate-200 transition-all text-left flex flex-col gap-3 h-full min-h-[100px] active:scale-[0.98] cursor-pointer hover:border-blue-300 hover:bg-slate-50/50"
    >
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
          <Folder size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
        </div>
        <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-wider">
          <Clock size={8} />
          {new Date(collection.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </div>
      </div>

      <div className="flex-1">
        <h4 className="text-[13px] font-bold text-slate-800 mb-0.5 group-hover:text-blue-600 transition-colors line-clamp-1 tracking-tight">{collection.name}</h4>
        {collection.description && (
          <p className="text-[11px] text-slate-500 line-clamp-2 font-medium leading-relaxed italic opacity-80">
            {collection.description}
          </p>
        )}
      </div>
    </motion.button>
  );
}

function NewCollectionCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      variants={itemVariants}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="group p-5 rounded-xl border border-slate-200 border-dashed transition-all flex flex-col items-center justify-center gap-3 min-h-[160px] active:scale-[0.98] cursor-pointer hover:border-blue-300 hover:bg-blue-50/30"
    >
      <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
        <Plus size={20} className="text-slate-400 group-hover:text-blue-500" />
      </div>
      <div className="text-center">
        <span className="text-[13px] font-bold text-slate-500 group-hover:text-blue-600 uppercase tracking-widest">New Collection</span>
      </div>
    </motion.button>
  );
}

function ViewMoreCard({ remainingCount, onClick }: { remainingCount: number, onClick: () => void }) {
  return (
    <motion.button
      variants={itemVariants}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="group bg-slate-50 p-5 rounded-xl border border-slate-200 transition-all text-left flex flex-col items-center justify-center gap-3 min-h-[120px] active:scale-[0.98] cursor-pointer hover:border-blue-300 hover:bg-white"
    >
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600 mb-1">+{remainingCount}</div>
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-blue-600 transition-colors">View All Collections</div>
      </div>
    </motion.button>
  );
}

export default Home;
