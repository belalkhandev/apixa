import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  FileText,
  Plus,
  Search,
  Calendar,
  MoreHorizontal,
  Trash2,
  Star,
  Clock,
  X,
  Loader2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Undo,
  Redo,
  Edit3
} from "lucide-react";
import { api, Note } from "../api";
import ConfirmModal from "../components/ConfirmModal";

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

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

  const editEditor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Write your note...",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3",
      },
    },
  });

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    if (selectedNote && editEditor) {
      editEditor.commands.setContent(selectedNote.content || "");
    }
  }, [selectedNote, editEditor]);

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

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.content && note.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pinnedNotes = filteredNotes.filter((n) => n.is_pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.is_pinned);

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim()) return;

    setIsSaving(true);
    try {
      const content = editor?.getHTML() || "";
      const newNote = await api.createNote(newNoteTitle, content);
      setNotes([newNote, ...notes]);
      setNewNoteTitle("");
      editor?.commands.clearContent();
      setIsCreating(false);
          } catch (error) {
            console.error("Failed to create note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateNote = async () => {
    if (!selectedNote) return;

    setIsSaving(true);
    try {
      const content = editEditor?.getHTML() || "";
      const updated = await api.updateNote(selectedNote.id, selectedNote.title, content);
      setNotes(notes.map((n) => (n.id === updated.id ? updated : n)));
      setSelectedNote(null);
          } catch (error) {
            console.error("Failed to update note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteId) return;

    try {
      await api.deleteNote(deleteNoteId);
      setNotes(notes.filter((n) => n.id !== deleteNoteId));
      if (selectedNote?.id === deleteNoteId) {
        setSelectedNote(null);
      }
          } catch (error) {
            console.error("Failed to delete note:", error);
    } finally {
      setDeleteNoteId(null);
    }
  };

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    try {
      const updated = await api.toggleNotePin(id, !currentPinned);
      setNotes(notes.map((n) => (n.id === id ? updated : n)));
          } catch (error) {
            console.error("Failed to toggle pin:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileText size={20} className="text-blue-600" />
                </div>
                Notes
              </h1>
              <p className="text-slate-500 mt-1 text-sm">
                Capture your thoughts, ideas, and daily notes
              </p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus size={18} />
              New Note
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <div className="relative max-w-md">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </motion.div>

        {isCreating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Create New Note</h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewNoteTitle("");
                  editor?.commands.clearContent();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Note title..."
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              autoFocus
            />
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <EditorToolbar editor={editor} />
              <EditorContent editor={editor} className="bg-slate-50" />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewNoteTitle("");
                  editor?.commands.clearContent();
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNote}
                disabled={!newNoteTitle.trim() || isSaving}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                Save Note
              </button>
            </div>
          </motion.div>
        )}

        {notes.length === 0 && !isCreating ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No notes yet</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
              Start capturing your thoughts, ideas, and daily development notes.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus size={18} />
              Create your first note
            </button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {pinnedNotes.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Star size={12} />
                  Pinned
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pinnedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onDelete={(id) => setDeleteNoteId(id)}
                      onTogglePin={handleTogglePin}
                      onEdit={setSelectedNote}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              </div>
            )}

            {unpinnedNotes.length > 0 && (
              <div>
                {pinnedNotes.length > 0 && (
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Clock size={12} />
                    Recent
                  </h3>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unpinnedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onDelete={(id) => setDeleteNoteId(id)}
                      onTogglePin={handleTogglePin}
                      onEdit={setSelectedNote}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <input
                type="text"
                value={selectedNote.title}
                onChange={(e) => setSelectedNote({ ...selectedNote, title: e.target.value })}
                className="text-xl font-bold text-slate-900 bg-transparent border-none focus:outline-none w-full"
              />
              <button
                onClick={() => setSelectedNote(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <div className="border-b border-slate-200">
                <EditorToolbar editor={editEditor} />
              </div>
              <EditorContent editor={editEditor} />
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setSelectedNote(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateNote}
                disabled={isSaving}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}

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

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-1 p-2 border-b border-slate-200 bg-white">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-2 rounded-lg transition-colors cursor-pointer ${
          editor.isActive("bold") ? "bg-blue-100 text-blue-600" : "text-slate-500 hover:bg-slate-100"
        }`}
      >
        <Bold size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-2 rounded-lg transition-colors cursor-pointer ${
          editor.isActive("italic") ? "bg-blue-100 text-blue-600" : "text-slate-500 hover:bg-slate-100"
        }`}
      >
        <Italic size={16} />
      </button>
      <div className="w-px h-5 bg-slate-200 mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded-lg transition-colors cursor-pointer ${
          editor.isActive("bulletList") ? "bg-blue-100 text-blue-600" : "text-slate-500 hover:bg-slate-100"
        }`}
      >
        <List size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded-lg transition-colors cursor-pointer ${
          editor.isActive("orderedList") ? "bg-blue-100 text-blue-600" : "text-slate-500 hover:bg-slate-100"
        }`}
      >
        <ListOrdered size={16} />
      </button>
      <div className="w-px h-5 bg-slate-200 mx-1" />
      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
      >
        <Undo size={16} />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
      >
        <Redo size={16} />
      </button>
    </div>
  );
}

function NoteCard({
  note,
  onDelete,
  onTogglePin,
  onEdit,
  formatDate,
}: {
  note: Note;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, isPinned: boolean) => void;
  onEdit: (note: Note) => void;
  formatDate: (date: string) => string;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl border p-5 hover:shadow-md transition-all group cursor-pointer ${
        note.is_pinned ? "border-blue-200 bg-blue-50/30" : "border-slate-200"
      }`}
      onClick={() => onEdit(note)}
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-slate-800 line-clamp-1">{note.title}</h4>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
          >
            <MoreHorizontal size={16} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
              <button
                onClick={() => {
                  onEdit(note);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Edit3 size={14} />
                Edit
              </button>
              <button
                onClick={() => {
                  onTogglePin(note.id, note.is_pinned);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Star size={14} className={note.is_pinned ? "text-blue-500 fill-blue-500" : ""} />
                {note.is_pinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={() => {
                  onDelete(note.id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-slate-500 line-clamp-3 mb-4">
        {note.content ? stripHtml(note.content) : "No content"}
      </p>
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Calendar size={12} />
        {formatDate(note.updated_at)}
      </div>
    </motion.div>
  );
}
