import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckSquare,
  Plus,
  Clock,
  Calendar,
  Trash2,
  Edit3,
  Loader2,
  Play,
  Pause,
  Flag,
  ChevronLeft,
  AlertCircle,
  Archive,
  GripVertical
} from "lucide-react";
import { api, Todo, Project } from "../api";
import ConfirmModal from "../components/ConfirmModal";
import TaskModal from "../components/TaskModal";
import { toast } from "sonner";

export type TodoStatus = "pending" | "in_progress" | "completed";
export type TodoPriority = "low" | "medium" | "high";

const statusConfig = {
  pending: {
    label: "TODO",
    bgColor: "bg-red-500",
    textColor: "text-white",
  },
  in_progress: {
    label: "IN PROGRESS",
    bgColor: "bg-amber-400",
    textColor: "text-amber-900",
  },
  completed: {
    label: "COMPLETED",
    bgColor: "bg-slate-700",
    textColor: "text-white",
  },
};

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

// Sort todos by sort_order (from backend)
const sortTodosByOrder = (todos: Todo[]): Todo[] => {
  return [...todos].sort((a, b) => a.sort_order - b.sort_order);
};

export default function Todos() {
  const navigate = useNavigate();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [deleteTodoId, setDeleteTodoId] = useState<string | null>(null);
  const [draggedTodo, setDraggedTodo] = useState<Todo | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TodoStatus | null>(null);
  const [dragOverTodoId, setDragOverTodoId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [todosData, projectsData] = await Promise.all([
        api.getTodos(),
        api.getProjects(),
      ]);

      // Filter out archived todos
      const archivedIds = JSON.parse(localStorage.getItem("apixa_archived_todos") || "[]");
      const activeTodos = todosData.filter((t) => !archivedIds.includes(t.id));

      setTodos(activeTodos);
      setProjects(projectsData);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load todos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveTodo = (id: string) => {
    try {
      const archivedIds = JSON.parse(localStorage.getItem("apixa_archived_todos") || "[]");
      if (!archivedIds.includes(id)) {
        archivedIds.push(id);
        localStorage.setItem("apixa_archived_todos", JSON.stringify(archivedIds));
      }
      setTodos(todos.filter((t) => t.id !== id));
      toast.success("Task moved to archive");
    } catch (error) {
      console.error("Failed to archive todo:", error);
      toast.error("Failed to archive task");
    }
  };

  const handleSaveTodo = (todo: Todo) => {
    if (editingTodo) {
      setTodos(todos.map((t) => (t.id === todo.id ? todo : t)));
    } else {
      setTodos([todo, ...todos]);
    }
    setEditingTodo(null);
    setIsModalOpen(false);
  };

  const handleDeleteTodo = async () => {
    if (!deleteTodoId) return;

    try {
      await api.deleteTodo(deleteTodoId);
      setTodos(todos.filter((t) => t.id !== deleteTodoId));
      toast.success("Task deleted");
    } catch (error) {
      console.error("Failed to delete todo:", error);
      toast.error("Failed to delete task");
    } finally {
      setDeleteTodoId(null);
    }
  };

  const handleStatusChange = async (id: string, status: TodoStatus) => {
    try {
      const updated = await api.updateTodoStatus(id, status);
      setTodos((prevTodos) => prevTodos.map((t) => (t.id === id ? updated : t)));
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleTimerUpdate = async (todo: Todo, elapsedSeconds: number, isPaused: boolean) => {
    try {
      const startedAt = isPaused ? todo.challenge_started_at : new Date().toISOString();
      const updated = await api.updateChallengeTimer(
        todo.id,
        elapsedSeconds,
        startedAt,
        isPaused
      );
      setTodos(todos.map((t) => (t.id === todo.id ? updated : t)));
    } catch (error) {
      console.error("Failed to update timer:", error);
    }
  };

  const handleProjectCreate = (project: Project) => {
    setProjects([...projects, project]);
  };

  const handleDragStart = (e: React.DragEvent, todo: Todo) => {
    setDraggedTodo(todo);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", todo.id);
  };

  const handleDragEnd = () => {
    setDraggedTodo(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (e: React.DragEvent, status: TodoStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;
    if (!currentTarget.contains(relatedTarget)) {
      setDragOverStatus(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TodoStatus, targetTodoId?: string) => {
    e.preventDefault();
    e.stopPropagation();

    const todoId = e.dataTransfer.getData("text/plain");
    const droppedTodo = draggedTodo || todos.find(t => t.id === todoId);

    if (!droppedTodo) {
      setDraggedTodo(null);
      setDragOverStatus(null);
      setDragOverTodoId(null);
      return;
    }

    try {
      // Get current todos for the target status
      const targetStatusTodos = sortTodosByOrder(
        todos.filter(t => t.status === targetStatus && t.id !== droppedTodo.id)
      );

      // Build the new order array
      let newOrder: string[];

      if (targetTodoId) {
        // Insert at specific position (before the target todo)
        const targetIndex = targetStatusTodos.findIndex(t => t.id === targetTodoId);
        if (targetIndex !== -1) {
          const orderIds = targetStatusTodos.map(t => t.id);
          orderIds.splice(targetIndex, 0, droppedTodo.id);
          newOrder = orderIds;
        } else {
          // Target not found, add at the beginning
          newOrder = [droppedTodo.id, ...targetStatusTodos.map(t => t.id)];
        }
      } else {
        // No specific target, add at the end
        newOrder = [...targetStatusTodos.map(t => t.id), droppedTodo.id];
      }

      // Call the API to reorder
      await api.reorderTodos(droppedTodo.id, targetStatus, newOrder);

      // Reload data to get the updated sort orders
      await loadData();
    } catch (error) {
      console.error("Failed to reorder todos:", error);
      toast.error("Failed to reorder tasks");
    }

    setDraggedTodo(null);
    setDragOverStatus(null);
    setDragOverTodoId(null);
  };

  const pendingTodos = sortTodosByOrder(todos.filter((t) => t.status === "pending"));
  const inProgressTodos = sortTodosByOrder(todos.filter((t) => t.status === "in_progress"));
  const completedTodos = sortTodosByOrder(todos.filter((t) => t.status === "completed"));

  const stats = {
    total: todos.length,
    pending: pendingTodos.length,
    inProgress: inProgressTodos.length,
    completed: completedTodos.length,
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full min-h-0 bg-slate-50 dark:bg-slate-900">
        <Header navigate={navigate} onNewTask={() => setIsModalOpen(true)} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 dark:bg-slate-900">
      <Header navigate={navigate} onNewTask={() => {
        setEditingTodo(null);
        setIsModalOpen(true);
      }} />

      <main className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
        <div className="px-6 py-6 pb-12">
          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-4 gap-4 mb-8"
          >
            <StatCard label="Total" value={stats.total} color="slate" />
            <StatCard label="Todo" value={stats.pending} color="red" />
            <StatCard label="In Progress" value={stats.inProgress} color="amber" />
            <StatCard label="Completed" value={stats.completed} color="green" />
          </motion.div>

          {todos.length === 0 ? (
            <EmptyState onNewTask={() => setIsModalOpen(true)} />
          ) : (
            <div className="space-y-8">
              {/* Column Headers */}
              <div className="flex items-center text-xs font-medium text-slate-400 uppercase tracking-wider px-4">
                <div className="flex-1">Task</div>
                <div className="w-24 text-center">Tracked</div>
                <div className="w-28 text-center">Project</div>
                <div className="w-24 text-center">Due Date</div>
                <div className="w-24 text-center">Stage</div>
                <div className="w-16 text-center">Priority</div>
                <div className="w-20"></div>
              </div>

              {/* Todo Section */}
              <TaskGroup
                status="pending"
                todos={pendingTodos}
                projects={projects}
                onStatusChange={handleStatusChange}
                onEdit={(todo) => {
                  setEditingTodo(todo);
                  setIsModalOpen(true);
                }}
                onDelete={(id) => setDeleteTodoId(id)}
                onTimerUpdate={handleTimerUpdate}
                onArchive={handleArchiveTodo}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragOverTodo={setDragOverTodoId}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                isDragOver={dragOverStatus === "pending"}
                draggedTodo={draggedTodo}
                dragOverTodoId={dragOverTodoId}
              />

              {/* In Progress Section */}
              <TaskGroup
                status="in_progress"
                todos={inProgressTodos}
                projects={projects}
                onStatusChange={handleStatusChange}
                onEdit={(todo) => {
                  setEditingTodo(todo);
                  setIsModalOpen(true);
                }}
                onDelete={(id) => setDeleteTodoId(id)}
                onTimerUpdate={handleTimerUpdate}
                onArchive={handleArchiveTodo}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragOverTodo={setDragOverTodoId}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                isDragOver={dragOverStatus === "in_progress"}
                draggedTodo={draggedTodo}
                dragOverTodoId={dragOverTodoId}
              />

              {/* Completed Section */}
              <TaskGroup
                status="completed"
                todos={completedTodos}
                projects={projects}
                onStatusChange={handleStatusChange}
                onEdit={(todo) => {
                  setEditingTodo(todo);
                  setIsModalOpen(true);
                }}
                onDelete={(id) => setDeleteTodoId(id)}
                onTimerUpdate={handleTimerUpdate}
                onArchive={handleArchiveTodo}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragOverTodo={setDragOverTodoId}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                isDragOver={dragOverStatus === "completed"}
                draggedTodo={draggedTodo}
                dragOverTodoId={dragOverTodoId}
              />
            </div>
          )}
        </div>
      </main>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTodo(null);
        }}
        onSave={handleSaveTodo}
        todo={editingTodo}
        projects={projects}
        onProjectCreate={handleProjectCreate}
      />

      <ConfirmModal
        isOpen={deleteTodoId !== null}
        onClose={() => setDeleteTodoId(null)}
        onConfirm={handleDeleteTodo}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}

function Header({ navigate, onNewTask }: { navigate: (path: string) => void; onNewTask: () => void }) {
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
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Tasks</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Manage your tasks</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/todos/archive")}
          className="flex items-center gap-2 px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium cursor-pointer"
        >
          <Archive size={16} />
          Archive
        </button>
        <button
          onClick={onNewTask}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm cursor-pointer"
        >
          <Plus size={16} />
          New Task
        </button>
      </div>
    </header>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    slate: "border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200",
    red: "border-red-100 dark:border-red-900 text-red-600 dark:text-red-400",
    amber: "border-amber-100 dark:border-amber-900 text-amber-600 dark:text-amber-400",
    green: "border-green-100 dark:border-green-900 text-green-600 dark:text-green-400",
  };

  const labelColors: Record<string, string> = {
    slate: "text-slate-400 dark:text-slate-500",
    red: "text-red-400 dark:text-red-500",
    amber: "text-amber-400 dark:text-amber-500",
    green: "text-green-400 dark:text-green-500",
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border p-4 ${colorClasses[color]}`}>
      <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${labelColors[color]}`}>{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function EmptyState({ onNewTask }: { onNewTask: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <CheckSquare size={28} className="text-slate-300" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">No tasks yet</h3>
      <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
        Start organizing your work by creating tasks.
      </p>
      <button
        onClick={onNewTask}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors cursor-pointer"
      >
        <Plus size={18} />
        Create your first task
      </button>
    </motion.div>
  );
}

interface TaskGroupProps {
  status: TodoStatus;
  todos: Todo[];
  projects: Project[];
  onStatusChange: (id: string, status: TodoStatus) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onTimerUpdate: (todo: Todo, elapsedSeconds: number, isPaused: boolean) => void;
  onArchive: (id: string) => void;
  onDragStart: (e: React.DragEvent, todo: Todo) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, status: TodoStatus) => void;
  onDragOverTodo: (todoId: string | null) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: TodoStatus, targetTodoId?: string) => void;
  isDragOver: boolean;
  draggedTodo: Todo | null;
  dragOverTodoId: string | null;
}

function TaskGroup({
  status,
  todos,
  projects,
  onStatusChange,
  onEdit,
  onDelete,
  onTimerUpdate,
  onArchive,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragOverTodo,
  onDragLeave,
  onDrop,
  isDragOver,
  draggedTodo,
  dragOverTodoId,
}: TaskGroupProps) {
  const config = statusConfig[status];

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e, status);
        // Only reset dragOverTodoId if the event target is the container itself (empty space)
        if (e.target === e.currentTarget) {
          onDragOverTodo(null);
        }
      }}
      onDragLeave={(e) => onDragLeave(e)}
      onDrop={(e) => onDrop(e, status)}
      className={`rounded-xl transition-all p-2 ${isDragOver ? "bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-300 ring-inset" : ""}`}
    >
      <div className="mb-3">
        <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-xs font-bold ${config.bgColor} ${config.textColor}`}>
          {config.label}
        </span>
        <span className="ml-2 text-xs text-slate-400">{todos.length}</span>
      </div>

      <div className="space-y-1 min-h-[60px]">
        {todos.length === 0 && (
          <div className={`flex items-center justify-center h-14 border-2 border-dashed rounded-lg text-sm ${isDragOver ? "border-blue-300 text-blue-500 bg-blue-100 dark:bg-blue-900/30" : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500"
            }`}>
            {isDragOver ? "Drop here" : "No tasks"}
          </div>
        )}
        {todos.map((todo) => {
          const isDropTarget = dragOverTodoId === todo.id && draggedTodo?.id !== todo.id;
          return (
            <div
              key={todo.id}
              className="transition-transform duration-200 ease-out"
              style={{
                transform: isDropTarget ? 'translateY(4px)' : 'translateY(0)',
              }}
            >
              {/* Drop indicator - animated space */}
              <div
                className={`rounded-lg border-2 border-dashed transition-all duration-200 ease-out overflow-hidden ${
                  isDropTarget
                    ? "h-14 mb-1 border-blue-400 bg-blue-50/50 dark:bg-blue-900/20"
                    : "h-0 mb-0 border-transparent"
                }`}
              />
              <TaskRow
                todo={todo}
                project={projects.find((p) => p.id === todo.project_id)}
                onStatusChange={onStatusChange}
                onEdit={onEdit}
                onDelete={onDelete}
                onTimerUpdate={onTimerUpdate}
                onArchive={onArchive}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDragOverTodo(todo.id);
                }}
                onDrop={(e) => onDrop(e, status, todo.id)}
                isDragging={draggedTodo?.id === todo.id}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TaskRowProps {
  todo: Todo;
  project?: Project;
  onStatusChange: (id: string, status: TodoStatus) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onTimerUpdate: (todo: Todo, elapsedSeconds: number, isPaused: boolean) => void;
  onArchive: (id: string) => void;
  onDragStart: (e: React.DragEvent, todo: Todo) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragging: boolean;
}

function TaskRow({
  todo,
  project,
  onStatusChange,
  onEdit,
  onDelete,
  onTimerUpdate,
  onArchive,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging,
}: TaskRowProps) {
  const nextStatus = (): TodoStatus => {
    if (todo.status === "pending") return "in_progress";
    if (todo.status === "in_progress") return "completed";
    return "pending";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const stage = stageConfig[todo.status as TodoStatus];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, todo)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex items-center bg-white dark:bg-slate-800 rounded-lg px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group border cursor-grab active:cursor-grabbing ${
        isDragging
          ? "opacity-50 border-blue-300 bg-blue-50 dark:bg-blue-900/30"
          : "border-transparent hover:border-slate-200 dark:hover:border-slate-600"
      }`}
    >
      <GripVertical size={14} className="text-slate-300 dark:text-slate-600 mr-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex-1 flex items-center gap-3 min-w-0">
        <span className={`w-2 h-2 rounded-sm flex-shrink-0 ${priorityColors[todo.priority as TodoPriority]}`} />
        <button
          onClick={() => onStatusChange(todo.id, nextStatus())}
          className="flex-shrink-0 cursor-pointer"
        >
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${todo.status === "completed"
            ? "border-green-500 bg-green-500"
            : todo.status === "in_progress"
              ? "border-amber-500"
              : "border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500"
            }`}>
            {todo.status === "completed" && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </button>
        <span className={`font-medium text-sm truncate ${todo.status === "completed" ? "text-slate-400 dark:text-slate-500 line-through" : "text-slate-700 dark:text-slate-200"
          }`}>
          {todo.title}
        </span>
      </div>

      {/* Tracked */}
      <div className="w-24 flex justify-center">
        {todo.is_challenge ? (
          <ChallengeTimer todo={todo} onTimerUpdate={onTimerUpdate} />
        ) : (
          <Clock size={16} className="text-slate-300 dark:text-slate-600" />
        )}
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
      <div className="w-20 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(todo)}
          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer transition-colors"
        >
          <Edit3 size={14} />
        </button>
        <button
          onClick={() => onArchive(todo.id)}
          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
          title="Archive"
        >
          <Archive size={14} />
        </button>
        <button
          onClick={() => onDelete(todo.id)}
          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 cursor-pointer transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

interface ChallengeTimerProps {
  todo: Todo;
  onTimerUpdate: (todo: Todo, elapsedSeconds: number, isPaused: boolean) => void;
}

function ChallengeTimer({ todo, onTimerUpdate }: ChallengeTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(todo.challenge_elapsed_seconds);
  const [isPaused, setIsPaused] = useState(todo.challenge_is_paused);
  const intervalRef = useRef<number | null>(null);
  const lastSaveRef = useRef(todo.challenge_elapsed_seconds);

  const totalSeconds = (todo.challenge_duration_minutes || 0) * 60;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  const isOvertime = elapsedSeconds > totalSeconds;
  const overtimeSeconds = isOvertime ? elapsedSeconds - totalSeconds : 0;

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const saveTimer = useCallback(
    (seconds: number, paused: boolean) => {
      if (Math.abs(seconds - lastSaveRef.current) >= 5 || paused !== todo.challenge_is_paused) {
        lastSaveRef.current = seconds;
        onTimerUpdate(todo, seconds, paused);
      }
    },
    [todo, onTimerUpdate]
  );

  useEffect(() => {
    setElapsedSeconds(todo.challenge_elapsed_seconds);
    setIsPaused(todo.challenge_is_paused);
    lastSaveRef.current = todo.challenge_elapsed_seconds;
  }, [todo.challenge_elapsed_seconds, todo.challenge_is_paused]);

  useEffect(() => {
    if (!isPaused && todo.status === "in_progress") {
      intervalRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => {
          const newVal = prev + 1;
          if (newVal % 5 === 0) {
            saveTimer(newVal, false);
          }
          return newVal;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, todo.status, saveTimer]);

  const togglePause = () => {
    const newPaused = !isPaused;
    setIsPaused(newPaused);
    saveTimer(elapsedSeconds, newPaused);
  };

  const canPlay = todo.status === "in_progress";

  return (
    <div className={`flex items-center gap-1.5 ${isOvertime ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
      {isOvertime && <AlertCircle size={12} />}
      <span className="text-xs font-mono font-semibold">
        {isOvertime ? `+${formatTime(overtimeSeconds)}` : formatTime(remainingSeconds)}
      </span>
      {canPlay && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePause();
          }}
          className={`p-0.5 rounded cursor-pointer transition-colors ${isOvertime ? "hover:bg-red-100 dark:hover:bg-red-900/30" : "hover:bg-amber-100 dark:hover:bg-amber-900/30"
            }`}
        >
          {isPaused ? <Play size={12} /> : <Pause size={12} />}
        </button>
      )}
    </div>
  );
}
