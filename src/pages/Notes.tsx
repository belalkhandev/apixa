import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { format, isToday, isThisMonth } from "date-fns";
import {
  FileText,
  Plus,
  Search,
  Calendar as CalendarIcon,
  Trash2,
  Star,
  X,
  Loader2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Undo,
  Redo,
  ChevronLeft,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { api, Note } from "../api";
import ConfirmModal from "../components/ConfirmModal";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";

export default function Notes() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Write your note...",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3",
      },
    },
  });

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      if (editingNote) {
        setNoteTitle(editingNote.title);
        editor?.commands.setContent(editingNote.content || "");
      } else {
        setNoteTitle("");
        editor?.commands.clearContent();
      }
    }
  }, [isModalOpen, editingNote, editor]);

  const loadNotes = async () => {
    try {
      const data = await api.getNotes();
      setNotes(data);
    } catch (error) {
      console.error("Failed to load notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort notes
  const filteredNotes = notes
    .filter((note) => {
      const matchesSearch =
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note.content && note.content.toLowerCase().includes(searchTerm.toLowerCase()));

      if (filterDate) {
        const noteDate = new Date(note.created_at).toDateString();
        const selectedDate = filterDate.toDateString();
        return matchesSearch && noteDate === selectedDate;
      }

      return matchesSearch;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Group notes by time period
  const todayNotes = filteredNotes.filter((note) => isToday(new Date(note.created_at)));
  const thisMonthNotes = filteredNotes.filter((note) => {
    const noteDate = new Date(note.created_at);
    return isThisMonth(noteDate) && !isToday(noteDate);
  });
  const olderNotes = filteredNotes.filter((note) => {
    const noteDate = new Date(note.created_at);
    return !isThisMonth(noteDate);
  });

  const toggleNoteExpand = (noteId: string) => {
    setExpandedNoteId(expandedNoteId === noteId ? null : noteId);
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) return;

    setIsSaving(true);
    try {
      const content = editor?.getHTML() || "";

      if (editingNote) {
        const updated = await api.updateNote(editingNote.id, noteTitle, content);
        setNotes(notes.map((n) => (n.id === updated.id ? updated : n)));
      } else {
        const newNote = await api.createNote(noteTitle, content);
        setNotes([newNote, ...notes]);
      }

      closeModal();
    } catch (error) {
      console.error("Failed to save note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteId) return;

    try {
      await api.deleteNote(deleteNoteId);
      setNotes(notes.filter((n) => n.id !== deleteNoteId));
    } catch (error) {
      console.error("Failed to delete note:", error);
    } finally {
      setDeleteNoteId(null);
    }
  };

  const handleTogglePin = async (e: React.MouseEvent, id: string, currentPinned: boolean) => {
    e.stopPropagation();
    try {
      const updated = await api.toggleNotePin(id, !currentPinned);
      setNotes(notes.map((n) => (n.id === id ? updated : n)));
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };

  const openCreateModal = () => {
    setEditingNote(null);
    setIsModalOpen(true);
  };

  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNote(null);
    setNoteTitle("");
    editor?.commands.clearContent();
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const clearDateFilter = () => {
    setFilterDate(undefined);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full min-h-0 bg-slate-50 dark:bg-slate-900">
        <Header navigate={navigate} onNewNote={openCreateModal} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 dark:bg-slate-900">
      <Header navigate={navigate} onNewNote={openCreateModal} />

      <main className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
        <div className="px-6 py-6 pb-12">
          {/* Search and Date Filter */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>

            {/* Date Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal shadow-none bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700",
                    !filterDate && "text-slate-400 dark:text-slate-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterDate ? format(filterDate, "PPP") : "Filter by date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={filterDate}
                  onSelect={setFilterDate}
                  autoFocus
                />
              </PopoverContent>
            </Popover>

            {filterDate && (
              <button
                onClick={clearDateFilter}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Notes List */}
          {notes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-16 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                <FileText size={28} className="text-slate-300 dark:text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-white mb-2">No notes yet</h3>
              <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
                Start capturing your thoughts and ideas.
              </p>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Plus size={18} />
                Create your first note
              </button>
            </motion.div>
          ) : filteredNotes.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
              <p className="text-slate-400 dark:text-slate-500 text-sm">No notes found matching your criteria</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Today's Notes */}
              {todayNotes.length > 0 && (
                <NoteSection
                  title="Today"
                  notes={todayNotes}
                  expandedNoteId={expandedNoteId}
                  onToggleExpand={toggleNoteExpand}
                  onEdit={openEditModal}
                  onTogglePin={handleTogglePin}
                  onDelete={(id) => setDeleteNoteId(id)}
                  formatTime={formatTime}
                />
              )}

              {/* This Month's Notes */}
              {thisMonthNotes.length > 0 && (
                <NoteSection
                  title="This Month"
                  notes={thisMonthNotes}
                  expandedNoteId={expandedNoteId}
                  onToggleExpand={toggleNoteExpand}
                  onEdit={openEditModal}
                  onTogglePin={handleTogglePin}
                  onDelete={(id) => setDeleteNoteId(id)}
                  formatTime={formatTime}
                />
              )}

              {/* Older Notes */}
              {olderNotes.length > 0 && (
                <NoteSection
                  title="Older"
                  notes={olderNotes}
                  expandedNoteId={expandedNoteId}
                  onToggleExpand={toggleNoteExpand}
                  onEdit={openEditModal}
                  onTogglePin={handleTogglePin}
                  onDelete={(id) => setDeleteNoteId(id)}
                  formatTime={formatTime}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                  {editingNote ? "Edit Note" : "New Note"}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder="Note title..."
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">
                    Content
                  </label>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <EditorToolbar editor={editor} />
                    <EditorContent editor={editor} className="bg-white dark:bg-slate-800 dark:text-slate-200" />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={!noteTitle.trim() || isSaving}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  {editingNote ? "Save Changes" : "Create Note"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteNoteId !== null}
        onClose={() => setDeleteNoteId(null)}
        onConfirm={handleDeleteNote}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}

function Header({ navigate, onNewNote }: { navigate: (path: string) => void; onNewNote: () => void }) {
  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 dark:text-slate-400 cursor-pointer"
          title="Back to Home"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Notes</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Capture your thoughts and ideas</p>
        </div>
      </div>

      <button
        onClick={onNewNote}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm cursor-pointer"
      >
        <Plus size={16} />
        New Note
      </button>
    </header>
  );
}

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded-lg transition-colors cursor-pointer ${editor.isActive("bold") ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded-lg transition-colors cursor-pointer ${editor.isActive("italic") ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
      >
        <Italic size={16} />
      </button>
      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded-lg transition-colors cursor-pointer ${editor.isActive("bulletList") ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
      >
        <List size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded-lg transition-colors cursor-pointer ${editor.isActive("orderedList") ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
      >
        <ListOrdered size={16} />
      </button>
      <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
      >
        <Undo size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
      >
        <Redo size={16} />
      </button>
    </div>
  );
}

interface NoteSectionProps {
  title: string;
  notes: Note[];
  expandedNoteId: string | null;
  onToggleExpand: (id: string) => void;
  onEdit: (note: Note) => void;
  onTogglePin: (e: React.MouseEvent, id: string, isPinned: boolean) => void;
  onDelete: (id: string) => void;
  formatTime: (date: string) => string;
}

function NoteSection({
  title,
  notes,
  expandedNoteId,
  onToggleExpand,
  onEdit,
  onTogglePin,
  onDelete,
  formatTime,
}: NoteSectionProps) {
  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{title}</h2>
        <span className="text-sm font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
          {notes.length}
        </span>
      </div>

      {/* Notes List */}
      <div className="space-y-2">
        {notes.map((note) => {
          const isExpanded = expandedNoteId === note.id;

          return (
            <div
              key={note.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              {/* Note Header - Clickable to expand */}
              <div
                onClick={() => onToggleExpand(note.id)}
                className="flex items-center px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group"
              >
                {/* Expand/Collapse Icon */}
                {isExpanded ? (
                  <ChevronDown size={18} className="text-slate-400 mr-3 flex-shrink-0" />
                ) : (
                  <ChevronRight size={18} className="text-slate-400 mr-3 flex-shrink-0" />
                )}

                {/* Pin indicator */}
                <button
                  onClick={(e) => onTogglePin(e, note.id, note.is_pinned)}
                  className={`p-1 rounded-lg mr-2 transition-colors cursor-pointer ${note.is_pinned
                    ? "text-amber-500"
                    : "text-slate-300 dark:text-slate-600 hover:text-slate-400 dark:hover:text-slate-500"
                    }`}
                >
                  <Star size={14} className={note.is_pinned ? "fill-amber-500" : ""} />
                </button>

                {/* Title */}
                <h4 className="flex-1 font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
                  {note.title}
                </h4>

                {/* Time */}
                <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap ml-4">
                  {formatTime(note.created_at)}
                </span>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(note.id);
                  }}
                  className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 ml-2 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700/50">
                      {/* Note Content */}
                      <div
                        className="prose prose-sm max-w-none text-slate-600 dark:text-slate-400 py-3"
                        dangerouslySetInnerHTML={{
                          __html: note.content || "<p class='text-slate-400 italic'>No content</p>",
                        }}
                      />

                      {/* Edit Button */}
                      <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700/50">
                        <button
                          onClick={() => onEdit(note)}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer"
                        >
                          Edit Note
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
