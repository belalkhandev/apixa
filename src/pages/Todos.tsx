import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare,
  Plus,
  Circle,
  CheckCircle2,
  Clock,
  Calendar,
  Trash2,
  Edit3,
  Loader2,
  Timer,
  Play,
  Pause,
  Flag,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  AlertCircle
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
    color: "red",
    icon: Circle,
    bgClass: "bg-red-50",
    borderClass: "border-red-200",
    headerBg: "bg-red-100",
    textClass: "text-red-600",
    dotClass: "bg-red-500",
  },
  in_progress: {
    label: "IN PROGRESS",
    color: "amber",
    icon: Clock,
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200",
    headerBg: "bg-amber-100",
    textClass: "text-amber-600",
    dotClass: "bg-amber-500",
  },
  completed: {
    label: "DONE",
    color: "green",
    icon: CheckCircle2,
    bgClass: "bg-green-50",
    borderClass: "border-green-200",
    headerBg: "bg-green-100",
    textClass: "text-green-600",
    dotClass: "bg-green-500",
  },
};

const priorityConfig = {
  low: { label: "Low", color: "bg-slate-100 text-slate-600", dotColor: "bg-slate-400" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700", dotColor: "bg-amber-400" },
  high: { label: "High", color: "bg-red-100 text-red-600", dotColor: "bg-red-500" },
};

export default function Todos() {
  const navigate = useNavigate();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [deleteTodoId, setDeleteTodoId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [todosData, projectsData] = await Promise.all([
        api.getTodos(),
        api.getProjects(),
      ]);
      setTodos(todosData);
      setProjects(projectsData);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load todos");
    } finally {
      setIsLoading(false);
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
      setTodos(todos.map((t) => (t.id === id ? updated : t)));
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

  const toggleSection = (status: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  };

  const pendingTodos = todos.filter((t) => t.status === "pending");
  const inProgressTodos = todos.filter((t) => t.status === "in_progress");
  const completedTodos = todos.filter((t) => t.status === "completed");

  const stats = {
    total: todos.length,
    pending: pendingTodos.length,
    inProgress: inProgressTodos.length,
    completed: completedTodos.length,
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
              title="Back to Home"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Tasks</h1>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Manage your tasks with challenge timers</p>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
            title="Back to Home"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Tasks</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Manage your tasks with challenge timers</p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingTodo(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors text-sm cursor-pointer"
        >
          <Plus size={16} />
          New Task
        </button>
      </header>

      <main className="flex-1 p-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 gap-4 mb-6"
        >
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Total</p>
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-red-100 p-4">
            <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-1">Todo</p>
            <p className="text-2xl font-bold text-red-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-100 p-4">
            <p className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-1">In Progress</p>
            <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
          </div>
          <div className="bg-white rounded-xl border border-green-100 p-4">
            <p className="text-xs font-medium text-green-400 uppercase tracking-wider mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </div>
        </motion.div>

        {todos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <CheckSquare size={28} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No tasks yet</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
              Start organizing your work by creating tasks. Set challenge timers to boost productivity.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus size={18} />
              Create your first task
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <StatusSection
              status="pending"
              todos={pendingTodos}
              projects={projects}
              config={statusConfig.pending}
              collapsed={collapsedSections.pending}
              onToggle={() => toggleSection("pending")}
              onStatusChange={handleStatusChange}
              onEdit={(todo) => {
                setEditingTodo(todo);
                setIsModalOpen(true);
              }}
              onDelete={(id) => setDeleteTodoId(id)}
              onTimerUpdate={handleTimerUpdate}
            />
            <StatusSection
              status="in_progress"
              todos={inProgressTodos}
              projects={projects}
              config={statusConfig.in_progress}
              collapsed={collapsedSections.in_progress}
              onToggle={() => toggleSection("in_progress")}
              onStatusChange={handleStatusChange}
              onEdit={(todo) => {
                setEditingTodo(todo);
                setIsModalOpen(true);
              }}
              onDelete={(id) => setDeleteTodoId(id)}
              onTimerUpdate={handleTimerUpdate}
            />
            <StatusSection
              status="completed"
              todos={completedTodos}
              projects={projects}
              config={statusConfig.completed}
              collapsed={collapsedSections.completed}
              onToggle={() => toggleSection("completed")}
              onStatusChange={handleStatusChange}
              onEdit={(todo) => {
                setEditingTodo(todo);
                setIsModalOpen(true);
              }}
              onDelete={(id) => setDeleteTodoId(id)}
              onTimerUpdate={handleTimerUpdate}
            />
          </div>
        )}
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

interface StatusSectionProps {
  status: TodoStatus;
  todos: Todo[];
  projects: Project[];
  config: typeof statusConfig.pending;
  collapsed: boolean;
  onToggle: () => void;
  onStatusChange: (id: string, status: TodoStatus) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onTimerUpdate: (todo: Todo, elapsedSeconds: number, isPaused: boolean) => void;
}

function StatusSection({
  status,
  todos,
  projects,
  config,
  collapsed,
  onToggle,
  onStatusChange,
  onEdit,
  onDelete,
  onTimerUpdate,
}: StatusSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border overflow-hidden ${config.borderClass}`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 py-3 ${config.headerBg} cursor-pointer`}
      >
        {collapsed ? (
          <ChevronRight size={18} className={config.textClass} />
        ) : (
          <ChevronDown size={18} className={config.textClass} />
        )}
        <span className={`w-2.5 h-2.5 rounded-full ${config.dotClass}`} />
        <span className={`font-semibold text-sm ${config.textClass}`}>
          {config.label}
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${config.bgClass} ${config.textClass}`}>
          {todos.length}
        </span>
      </button>

      {/* Content */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className={`${config.bgClass}`}>
              {todos.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No tasks
                </div>
              ) : (
                <div className="divide-y divide-slate-200/50">
                  {todos.map((todo) => (
                    <TaskRow
                      key={todo.id}
                      todo={todo}
                      project={projects.find((p) => p.id === todo.project_id)}
                      onStatusChange={onStatusChange}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onTimerUpdate={onTimerUpdate}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface TaskRowProps {
  todo: Todo;
  project?: Project;
  onStatusChange: (id: string, status: TodoStatus) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onTimerUpdate: (todo: Todo, elapsedSeconds: number, isPaused: boolean) => void;
}

function TaskRow({
  todo,
  project,
  onStatusChange,
  onEdit,
  onDelete,
  onTimerUpdate,
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

  const priorityCfg = priorityConfig[todo.priority as TodoPriority];

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors group">
      {/* Priority dot */}
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityCfg.dotColor}`} />

      {/* Checkbox */}
      <button
        onClick={() => onStatusChange(todo.id, nextStatus())}
        className="flex-shrink-0 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
      >
        {todo.status === "completed" ? (
          <CheckCircle2 size={20} className="text-green-500" />
        ) : todo.status === "in_progress" ? (
          <Clock size={20} className="text-amber-500" />
        ) : (
          <Circle size={20} />
        )}
      </button>

      {/* Title & Description */}
      <div className="flex-1 min-w-0">
        <h4
          className={`font-medium text-sm truncate ${
            todo.status === "completed" ? "text-slate-400 line-through" : "text-slate-800"
          }`}
        >
          {todo.title}
        </h4>
        {todo.description && (
          <p className="text-xs text-slate-400 truncate mt-0.5">
            {stripHtml(todo.description)}
          </p>
        )}
      </div>

      {/* Challenge Badge & Timer */}
      {todo.is_challenge && (
        <ChallengeTimer
          todo={todo}
          onTimerUpdate={onTimerUpdate}
        />
      )}

      {/* Project Badge */}
      {project && (
        <span
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0"
          style={{
            backgroundColor: project.color + "20",
            color: project.color,
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          {project.name}
        </span>
      )}

      {/* Date */}
      {(todo.start_date || todo.end_date) && (
        <span className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
          <Calendar size={12} />
          {formatDate(todo.end_date) || formatDate(todo.start_date)}
        </span>
      )}

      {/* Priority Flag */}
      <span className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold flex-shrink-0 ${priorityCfg.color}`}>
        <Flag size={10} />
        {priorityCfg.label}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => onEdit(todo)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
        >
          <Edit3 size={14} />
        </button>
        <button
          onClick={() => onDelete(todo.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
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
  const progress = totalSeconds > 0 ? Math.min(100, (elapsedSeconds / totalSeconds) * 100) : 0;

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
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg flex-shrink-0 ${
      isOvertime
        ? "bg-red-100"
        : "bg-gradient-to-r from-amber-50 to-orange-50"
    }`}>
      {/* Timer Icon & Badge */}
      <div className={`flex items-center gap-1.5 ${isOvertime ? "text-red-600" : "text-amber-600"}`}>
        <Timer size={14} />
        {isOvertime && <AlertCircle size={12} className="text-red-500" />}
      </div>

      {/* Progress Bar */}
      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${isOvertime ? "bg-red-500" : "bg-amber-500"}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Time Display */}
      <span className={`text-xs font-mono font-bold min-w-[50px] text-center ${
        isOvertime ? "text-red-600" : "text-amber-700"
      }`}>
        {isOvertime ? `+${formatTime(overtimeSeconds)}` : formatTime(remainingSeconds)}
      </span>

      {/* Play/Pause Button */}
      {canPlay && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePause();
          }}
          className={`p-1 rounded cursor-pointer transition-colors ${
            isOvertime
              ? "hover:bg-red-200 text-red-600"
              : "hover:bg-amber-200 text-amber-600"
          }`}
        >
          {isPaused ? <Play size={12} /> : <Pause size={12} />}
        </button>
      )}
    </div>
  );
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
}
