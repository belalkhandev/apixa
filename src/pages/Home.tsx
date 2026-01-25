import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder,
  Plus,
  Loader2,
  Zap,
  Clock,
  ExternalLink,
  ChevronRight,
  FileText,
  CheckSquare,
  Activity,
  Circle,
  CheckCircle2,
  Star,
  ArrowRight,
  FolderOpen
} from "lucide-react";
import NewCollectionModal from "../components/NewCollectionModal";
import SelectCollectionModal from "../components/SelectCollectionModal";
import { api, Collection, Note, Todo } from "../api";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1.0] as [number, number, number, number]
    }
  }
};

export default function Home() {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [collectionsData, notesData, todosData] = await Promise.all([
        api.getCollections(),
        api.getNotes(),
        api.getTodos()
      ]);
      setCollections(collectionsData);
      setNotes(notesData);
      setTodos(todosData);
    } catch (error) {
      console.error("Failed to load data:", error);
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

  const recentCollections = collections.slice(0, 4);
  const recentNotes = notes.slice(0, 3);
  const recentTodos = todos.filter(t => t.status !== "completed").slice(0, 4);

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };

  return (
    <div className="min-h-screen bg-slate-50 font-inter text-slate-900 overflow-x-hidden">
      <AnimatePresence>
        {isLoading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 bg-slate-50"
          >
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </motion.div>
        ) : (
          <motion.div
            key="home-content"
            initial="hidden"
            animate="show"
            variants={containerVariants}
            className="p-8"
          >
            <motion.div variants={itemVariants} className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
              <p className="text-slate-500 mt-1">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric"
                })}
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="mb-8">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickActionCard
                  label="New Request"
                  description="Create API request"
                  icon={<Zap size={20} />}
                  onClick={() => navigate("/quick-request")}
                />
                <QuickActionCard
                  label="Collections"
                  description="Manage collections"
                  icon={<FolderOpen size={20} />}
                  onClick={() => navigate("/collections")}
                />
                <QuickActionCard
                  label="Load Runner"
                  description="Performance testing"
                  icon={<Activity size={20} />}
                  onClick={() => setIsSelectModalOpen(true)}
                />
                <QuickActionCard
                  label="New Collection"
                  description="Organize requests"
                  icon={<Plus size={20} />}
                  onClick={() => setIsModalOpen(true)}
                />
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div variants={itemVariants} className="lg:col-span-2">
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Folder size={16} className="text-blue-600" />
                      </div>
                      <h2 className="font-semibold text-slate-800">Recent Collections</h2>
                    </div>
                    {collections.length > 4 && (
                      <button
                        onClick={() => navigate("/collections")}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        View all <ChevronRight size={16} />
                      </button>
                    )}
                  </div>

                  {recentCollections.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <Folder size={24} className="text-slate-300" />
                      </div>
                      <p className="text-slate-500 text-sm mb-4">No collections yet</p>
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                      >
                        <Plus size={16} />
                        Create Collection
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {recentCollections.map((collection) => (
                        <CollectionRow
                          key={collection.id}
                          collection={collection}
                          onClick={() => navigate(`/collection/${collection.id}`)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

              <div className="space-y-6">
                <motion.div variants={itemVariants}>
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <FileText size={16} className="text-blue-600" />
                        </div>
                        <h2 className="font-semibold text-slate-800">Recent Notes</h2>
                      </div>
                      <button
                        onClick={() => navigate("/notes")}
                        className="text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        <ArrowRight size={18} />
                      </button>
                    </div>

                    {recentNotes.length === 0 ? (
                      <div className="p-8 text-center">
                        <FileText size={28} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm mb-3">No notes yet</p>
                        <button
                          onClick={() => navigate("/notes")}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                        >
                          Create a note
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {recentNotes.map((note) => (
                          <div
                            key={note.id}
                            className="px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                            onClick={() => navigate("/notes")}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {note.is_pinned && <Star size={12} className="text-blue-500 fill-blue-500" />}
                              <p className="font-medium text-sm text-slate-700 truncate">{note.title}</p>
                            </div>
                            <p className="text-xs text-slate-400 truncate">
                              {note.content ? stripHtml(note.content) : "No content"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <CheckSquare size={16} className="text-blue-600" />
                        </div>
                        <h2 className="font-semibold text-slate-800">Todo Tasks</h2>
                      </div>
                      <button
                        onClick={() => navigate("/todos")}
                        className="text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        <ArrowRight size={18} />
                      </button>
                    </div>

                    {recentTodos.length === 0 ? (
                      <div className="p-8 text-center">
                        <CheckSquare size={28} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm mb-3">No tasks yet</p>
                        <button
                          onClick={() => navigate("/todos")}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                        >
                          Add a task
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {recentTodos.map((todo) => (
                          <div
                            key={todo.id}
                            className="px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-3"
                            onClick={() => navigate("/todos")}
                          >
                            {todo.status === "completed" ? (
                              <CheckCircle2 size={16} className="text-blue-500 flex-shrink-0" />
                            ) : (
                              <Circle size={16} className="text-slate-300 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm truncate ${
                                todo.status === "completed" ? "text-slate-400 line-through" : "text-slate-700"
                              }`}>
                                {todo.title}
                              </p>
                            </div>
                            {todo.status === "in_progress" && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">
                                In Progress
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      <NewCollectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateCollection}
      />
      <SelectCollectionModal
        isOpen={isSelectModalOpen}
        onClose={() => setIsSelectModalOpen(false)}
        collections={collections}
        onSelect={(id) => navigate(`/runner/${id}`)}
      />
    </div>
  );
}

function QuickActionCard({
  label,
  description,
  icon,
  onClick,
}: {
  label: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
    >
      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-100 flex items-center justify-center mb-3 transition-colors">
        {icon}
      </div>
      <p className="font-semibold text-slate-800 text-sm">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{description}</p>
    </button>
  );
}

function CollectionRow({
  collection,
  onClick,
}: {
  collection: Collection;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full group flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
          <Folder size={18} className="text-slate-500 group-hover:text-blue-600 transition-colors" />
        </div>
        <div>
          <p className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
            {collection.name}
          </p>
          <p className="text-xs text-slate-400 truncate max-w-[300px]">
            {collection.description || "No description"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Clock size={12} />
          {new Date(collection.updated_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric"
          })}
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-all group-hover:translate-x-0.5">
          <ExternalLink size={14} />
        </div>
      </div>
    </button>
  );
}
