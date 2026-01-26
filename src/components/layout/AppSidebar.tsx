import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  Zap,
  FolderOpen,
  FileText,
  CheckSquare,
  Activity,
  ChevronDown,
  ChevronRight,
  Home,
  Plus,
  Gauge,
  Sun,
  Moon,
  Monitor,
  FileJson
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

interface AppSidebarProps {
  onNewRequest: () => void;
  onSelectRunner: () => void;
}

interface SidebarSectionProps {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function SidebarSection({ label, icon, children, defaultOpen = true }: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
      >
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        {isOpen ? (
          <ChevronDown size={14} className="text-slate-300 dark:text-slate-500" />
        ) : (
          <ChevronRight size={14} className="text-slate-300 dark:text-slate-500" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SidebarItemProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
  badge?: string | number;
}

function SidebarItem({ label, icon, onClick, isActive, badge }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl mx-2 transition-all cursor-pointer ${isActive
        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800"
        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white border border-transparent"
        }`}
      style={{ width: "calc(100% - 16px)" }}
    >
      <span className={isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isActive ? "bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
          }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

export default function AppSidebar({ onNewRequest, onSelectRunner }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const isActive = (path: string) => location.pathname === path;

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const getThemeIcon = () => {
    if (theme === "light") return <Sun size={16} />;
    if (theme === "dark") return <Moon size={16} />;
    return <Monitor size={16} />;
  };

  const getThemeLabel = () => {
    if (theme === "light") return "Light";
    if (theme === "dark") return "Dark";
    return "System";
  };

  return (
    <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 flex flex-col h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-600 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
              <Terminal size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Apixa</span>
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        <div className="px-2 mb-4">
          <SidebarItem
            label="Dashboard"
            icon={<Home size={18} />}
            onClick={() => navigate("/")}
            isActive={isActive("/")}
          />
        </div>

        <SidebarSection label="API Client" icon={<Zap size={14} />}>
          <div className="space-y-1 pb-2">
            <SidebarItem
              label="New Request"
              icon={<Plus size={18} />}
              onClick={onNewRequest}
            />
            <SidebarItem
              label="Collections"
              icon={<FolderOpen size={18} />}
              onClick={() => navigate("/collections")}
              isActive={isActive("/collections") || location.pathname.startsWith("/collection/")}
            />
          </div>
        </SidebarSection>

        <SidebarSection label="Productivity" icon={<FileText size={14} />}>
          <div className="space-y-1 pb-2">
            <SidebarItem
              label="Notes"
              icon={<FileText size={18} />}
              onClick={() => navigate("/notes")}
              isActive={isActive("/notes")}
            />
            <SidebarItem
              label="Todo List"
              icon={<CheckSquare size={18} />}
              onClick={() => navigate("/todos")}
              isActive={isActive("/todos")}
            />
            <SidebarItem
              label="JSON Prettier"
              icon={<FileJson size={18} />}
              onClick={() => navigate("/json-prettier")}
              isActive={isActive("/json-prettier")}
            />
          </div>
        </SidebarSection>

        <SidebarSection label="Performance" icon={<Activity size={14} />}>
          <div className="space-y-1 pb-2">
            <SidebarItem
              label="Load Runner"
              icon={<Gauge size={18} />}
              onClick={onSelectRunner}
              isActive={location.pathname.startsWith("/runner")}
            />
          </div>
        </SidebarSection>
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">Workspace</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Developer Mode</p>
            </div>
          </div>
          <button
            onClick={cycleTheme}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title={`Theme: ${getThemeLabel()}`}
          >
            {getThemeIcon()}
          </button>
        </div>
      </div>
    </aside>
  );
}
