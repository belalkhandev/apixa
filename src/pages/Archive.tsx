import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Archive as ArchiveIcon,
    Calendar,
    Flag,
    ChevronLeft,
    RotateCcw,
    Trash2
} from "lucide-react";
import { api, Todo, Project } from "../api";
import { toast } from "sonner";
import ConfirmModal from "../components/ConfirmModal";

export type TodoStatus = "pending" | "in_progress" | "completed";
export type TodoPriority = "low" | "medium" | "high";

const priorityColors = {
    low: "bg-blue-500",
    medium: "bg-amber-500",
    high: "bg-red-500",
};

const stageConfig = {
    pending: { label: "PENDING", bg: "bg-purple-100", text: "text-purple-700" },
    in_progress: { label: "WORKING", bg: "bg-orange-100", text: "text-orange-600" },
    completed: { label: "DONE", bg: "bg-green-100", text: "text-green-700" },
};

export default function Archive() {
    const navigate = useNavigate();
    const [todos, setTodos] = useState<Todo[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteTodoId, setDeleteTodoId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [todosData, projectsData] = await Promise.all([
                api.getTodos(),
                api.getProjects(),
            ]);

            // Filter for ONLY archived todos
            const archivedIds = JSON.parse(localStorage.getItem("apixa_archived_todos") || "[]");
            const archivedTodos = todosData.filter((t) => archivedIds.includes(t.id));

            setTodos(archivedTodos);
            setProjects(projectsData);
        } catch (error) {
            console.error("Failed to load data:", error);
            toast.error("Failed to load archived todos");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = (id: string) => {
        const archivedIds = JSON.parse(localStorage.getItem("apixa_archived_todos") || "[]");
        const newArchivedIds = archivedIds.filter((archivedId: string) => archivedId !== id);
        localStorage.setItem("apixa_archived_todos", JSON.stringify(newArchivedIds));

        setTodos(todos.filter((t) => t.id !== id));
        toast.success("Task restored to main list");
    };

    const handleDeleteTodo = async () => {
        if (!deleteTodoId) return;

        try {
            await api.deleteTodo(deleteTodoId);

            // Also remove from local storage if it exists (cleanup)
            const archivedIds = JSON.parse(localStorage.getItem("apixa_archived_todos") || "[]");
            const newArchivedIds = archivedIds.filter((archivedId: string) => archivedId !== deleteTodoId);
            localStorage.setItem("apixa_archived_todos", JSON.stringify(newArchivedIds));

            setTodos(todos.filter((t) => t.id !== deleteTodoId));
            toast.success("Task permanently deleted");
        } catch (error) {
            console.error("Failed to delete todo:", error);
            toast.error("Failed to delete task");
        } finally {
            setDeleteTodoId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col h-full min-h-0 bg-slate-50 dark:bg-slate-900">
                <Header navigate={navigate} />
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full min-h-0 bg-slate-50 dark:bg-slate-900">
            <Header navigate={navigate} />

            <main className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
                <div className="px-6 py-6 pb-12">

                    {todos.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="space-y-4">
                            {/* Column Headers */}
                            <div className="flex items-center text-xs font-medium text-slate-400 uppercase tracking-wider px-4">
                                <div className="flex-1">Task</div>
                                <div className="w-28 text-center">Project</div>
                                <div className="w-24 text-center">Due Date</div>
                                <div className="w-24 text-center">Stage</div>
                                <div className="w-16 text-center">Priority</div>
                                <div className="w-24"></div>
                            </div>

                            {todos.map((todo) => (
                                <ArchivedTaskRow
                                    key={todo.id}
                                    todo={todo}
                                    project={projects.find((p) => p.id === todo.project_id)}
                                    onRestore={handleRestore}
                                    onDelete={setDeleteTodoId}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <ConfirmModal
                isOpen={deleteTodoId !== null}
                onClose={() => setDeleteTodoId(null)}
                onConfirm={handleDeleteTodo}
                title="Delete Task Permanently"
                message="Are you sure you want to permanently delete this task? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
}

function Header({ navigate }: { navigate: (path: string) => void }) {
    return (
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate("/todos")}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 dark:text-slate-400 cursor-pointer"
                    title="Back to Tasks"
                >
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <h1 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                        <ArchiveIcon size={20} className="text-slate-500 dark:text-slate-400" />
                        Archive
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Archived tasks</p>
                </div>
            </div>
        </header>
    );
}

function EmptyState() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center"
        >
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <ArchiveIcon size={28} className="text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">No archived tasks</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto">
                Tasks you archive will appear here.
            </p>
        </motion.div>
    );
}

interface ArchivedTaskRowProps {
    todo: Todo;
    project?: Project;
    onRestore: (id: string) => void;
    onDelete: (id: string) => void;
}

function ArchivedTaskRow({
    todo,
    project,
    onRestore,
    onDelete,
}: ArchivedTaskRowProps) {

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    };

    const stage = stageConfig[todo.status as TodoStatus] || stageConfig.pending;

    return (
        <div
            className="flex items-center bg-white dark:bg-slate-800 rounded-lg px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group border border-transparent hover:border-slate-200 dark:hover:border-slate-600 opacity-75 hover:opacity-100"
        >
            {/* Priority Dot + Title */}
            <div className="flex-1 flex items-center gap-3 min-w-0">
                <span className={`w-2 h-2 rounded-sm flex-shrink-0 ${priorityColors[todo.priority as TodoPriority]}`} />
                <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center">
                    <ArchiveIcon size={12} className="text-slate-400 dark:text-slate-500" />
                </div>
                <span className="font-medium text-sm truncate text-slate-600 dark:text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600">
                    {todo.title}
                </span>
            </div>

            {/* Project */}
            <div className="w-28 flex justify-center">
                {project ? (
                    <span
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium max-w-full"
                        style={{
                            backgroundColor: project.color + "15",
                            color: project.color,
                        }}
                    >
                        <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: project.color }}
                        />
                        <span className="truncate">{project.name}</span>
                    </span>
                ) : (
                    <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>
                )}
            </div>

            {/* Due Date */}
            <div className="w-24 flex justify-center">
                {todo.end_date ? (
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
                        {formatDate(todo.end_date)}
                    </span>
                ) : (
                    <Calendar size={16} className="text-slate-300 dark:text-slate-600" />
                )}
            </div>

            {/* Stage */}
            <div className="w-24 flex justify-center">
                <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${stage.bg} ${stage.text}`}>
                    {stage.label}
                </span>
            </div>

            {/* Priority */}
            <div className="w-16 flex justify-center">
                <Flag
                    size={16}
                    className={
                        todo.priority === "high"
                            ? "text-red-500"
                            : todo.priority === "medium"
                                ? "text-amber-500"
                                : "text-slate-400 dark:text-slate-600"
                    }
                />
            </div>

            {/* Actions */}
            <div className="w-24 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onRestore(todo.id)}
                    className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 cursor-pointer transition-colors"
                    title="Restore to list"
                >
                    <RotateCcw size={14} />
                </button>
                <button
                    onClick={() => onDelete(todo.id)}
                    className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer transition-colors"
                    title="Delete permanently"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
}
