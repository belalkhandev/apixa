import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { format } from "date-fns";
import {
  X,
  Loader2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Undo,
  Redo,
  Calendar as CalendarIcon,
  Timer,
  FolderKanban,
  Plus,
  Flag,
  Check,
  Search,
  ChevronsUpDown
} from "lucide-react";
import { api, Todo, Project } from "../api";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { toast } from "sonner";

export type TodoPriority = "low" | "medium" | "high";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (todo: Todo) => void;
  todo?: Todo | null;
  projects: Project[];
  onProjectCreate: (project: Project) => void;
}

const priorityConfig = {
  low: { label: "Low", color: "bg-slate-100 text-slate-600", dotColor: "bg-slate-400" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700", dotColor: "bg-amber-400" },
  high: { label: "High", color: "bg-red-100 text-red-600", dotColor: "bg-red-500" },
};

const challengePresets = [
  { label: "30m", value: 30 },
  { label: "1h", value: 60 },
  { label: "2h", value: 120 },
  { label: "3h", value: 180 },
  { label: "4h", value: 240 },
  { label: "5h", value: 300 },
  { label: "6h", value: 360 },
  { label: "8h", value: 480 },
];

const projectColors = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1"
];

export default function TaskModal({
  isOpen,
  onClose,
  onSave,
  todo,
  projects,
  onProjectCreate,
}: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("medium");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [isChallenge, setIsChallenge] = useState(false);
  const [challengeDuration, setChallengeDuration] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("#3b82f6");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(projectSearch.toLowerCase())
  );
  const selectedProject = projects.find((p) => p.id === projectId);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Add description...",
      }),
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[120px] px-4 py-3",
      },
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (todo) {
        setTitle(todo.title);
        setPriority(todo.priority as TodoPriority);
        setProjectId(todo.project_id);
        setStartDate(todo.start_date ? new Date(todo.start_date) : undefined);
        setDueDate(todo.end_date ? new Date(todo.end_date) : undefined);
        setIsChallenge(todo.is_challenge);
        setChallengeDuration(todo.challenge_duration_minutes);
        editor?.commands.setContent(todo.description || "");
      } else {
        setTitle("");
        setPriority("medium");
        setProjectId(null);
        setStartDate(undefined);
        setDueDate(undefined);
        setIsChallenge(false);
        setChallengeDuration(null);
        editor?.commands.clearContent();
      }
    }
  }, [isOpen, todo, editor]);

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const description = (editor?.storage as any)?.markdown?.getMarkdown() || "";
      const formattedStartDate = startDate ? format(startDate, "yyyy-MM-dd") : undefined;
      const formattedDueDate = dueDate ? format(dueDate, "yyyy-MM-dd") : undefined;

      if (todo) {
        const updated = await api.updateTodo({
          id: todo.id,
          title,
          status: todo.status,
          priority,
          description: description || undefined,
          projectId: projectId || undefined,
          startDate: formattedStartDate,
          endDate: formattedDueDate,
          isChallenge,
          challengeDurationMinutes: challengeDuration || undefined,
        });
        onSave(updated);
        toast.success("Task updated");
      } else {
        const newTodo = await api.createTodo({
          title,
          priority,
          description: description || undefined,
          projectId: projectId || undefined,
          startDate: formattedStartDate,
          endDate: formattedDueDate,
          isChallenge,
          challengeDurationMinutes: challengeDuration || undefined,
        });
        onSave(newTodo);
        toast.success("Task created");
      }
      onClose();
    } catch (error) {
      console.error("Failed to save todo:", error);
      toast.error("Failed to save task");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const project = await api.createProject(newProjectName, newProjectColor);
      onProjectCreate(project);
      setProjectId(project.id);
      setShowNewProject(false);
      setNewProjectName("");
      setNewProjectColor("#3b82f6");
      setProjectSearch("");
      setProjectPopoverOpen(false);
      toast.success("Project created");
    } catch (error) {
      console.error("Failed to create project:", error);
      toast.error("Failed to create project");
    }
  };

  const handleSelectProject = (id: string | null) => {
    setProjectId(id);
    setProjectSearch("");
    setProjectPopoverOpen(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {todo ? "Edit Task" : "New Task"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Title</label>
              <input
                type="text"
                placeholder="Task title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Description</label>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <EditorToolbar editor={editor} />
                <EditorContent editor={editor} className="bg-white dark:bg-slate-800 dark:text-slate-200" />
              </div>
            </div>

            {/* Priority & Project */}
            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2 flex items-center gap-2">
                  <Flag size={14} />
                  Priority
                </label>
                <div className="flex gap-2">
                  {(["low", "medium", "high"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${priority === p
                        ? priorityConfig[p].color + " ring-2 ring-offset-1 ring-slate-300 dark:ring-slate-600 dark:ring-offset-slate-800"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${priorityConfig[p].dotColor}`} />
                      {priorityConfig[p].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2 flex items-center gap-2">
                  <FolderKanban size={14} />
                  Project
                </label>
                <Popover open={projectPopoverOpen} onOpenChange={setProjectPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={projectPopoverOpen}
                      className="w-full justify-between h-11 rounded-lg shadow-none bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      {selectedProject ? (
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: selectedProject.color }}
                          />
                          {selectedProject.name}
                        </span>
                      ) : (
                        <span className="text-slate-400">Select project...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <div className="p-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <Search size={16} className="text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search projects..."
                          value={projectSearch}
                          onChange={(e) => setProjectSearch(e.target.value)}
                          className="flex-1 bg-transparent text-sm focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-[200px] overflow-auto p-1 bg-white dark:bg-slate-800">
                      <button
                        onClick={() => handleSelectProject(null)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer transition-colors",
                          projectId === null
                            ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                        )}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                        None
                        {projectId === null && <Check size={14} className="ml-auto" />}
                      </button>
                      {filteredProjects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => handleSelectProject(project.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer transition-colors",
                            projectId === project.id
                              ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
                              : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                          )}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          {project.name}
                          {projectId === project.id && <Check size={14} className="ml-auto" />}
                        </button>
                      ))}
                      {filteredProjects.length === 0 && projectSearch && (
                        <div className="px-3 py-2 text-sm text-slate-400">
                          No projects found
                        </div>
                      )}
                    </div>
                    <div className="p-2 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                      {showNewProject ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Project name..."
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white"
                            autoFocus
                          />
                          <div className="flex items-center gap-1 justify-center">
                            {projectColors.map((color) => (
                              <button
                                key={color}
                                onClick={() => setNewProjectColor(color)}
                                className={`w-5 h-5 rounded-full cursor-pointer ${newProjectColor === color ? "ring-2 ring-offset-1 ring-slate-400" : ""
                                  }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setShowNewProject(false);
                                setNewProjectName("");
                              }}
                              className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleCreateProject}
                              disabled={!newProjectName.trim()}
                              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                            >
                              Create
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowNewProject(true)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                        >
                          <Plus size={14} />
                          Create new project
                        </button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2 flex items-center gap-2">
                  <CalendarIcon size={14} />
                  Start Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-11 rounded-lg shadow-none bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700",
                        !startDate && "text-slate-500 dark:text-slate-400"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2 flex items-center gap-2">
                  <CalendarIcon size={14} />
                  Due Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-11 rounded-lg shadow-none bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700",
                        !dueDate && "text-slate-500 dark:text-slate-400"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Challenge Mode */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2 flex items-center gap-2">
                <Timer size={14} />
                Challenge Mode
              </label>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setIsChallenge(!isChallenge);
                    if (!isChallenge && !challengeDuration) {
                      setChallengeDuration(60);
                    }
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer w-full ${isChallenge
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                >
                  <Timer size={18} />
                  <span>Enable Challenge Timer</span>
                  {isChallenge && <Check size={16} className="ml-auto" />}
                </button>

                {isChallenge && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2"
                  >
                    {challengePresets.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => setChallengeDuration(preset.value)}
                        className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${challengeDuration === preset.value
                          ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-400 dark:ring-amber-700"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                          }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || isSaving}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              {todo ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
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
