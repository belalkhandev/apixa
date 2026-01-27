import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Edit2, ChevronDown, ChevronRight } from 'lucide-react';
import { Table, Column } from '../../types/schema';

interface DesignerSidebarProps {
    tables: Table[];
    onAddTable: () => void;
    onEditTable: (tableId: string) => void;
    onDeleteTable: (tableId: string) => void;
    onAddColumn: (tableId: string, name: string) => void;
    onUpdateColumn: (tableId: string, columnId: string, data: Partial<Column>) => void;
    onDeleteColumn: (tableId: string, columnId: string) => void;
}

export default function DesignerSidebar({
    tables,
    onAddTable,
    onEditTable,
    onDeleteTable,
    onAddColumn,
    onUpdateColumn,
    onDeleteColumn,
}: DesignerSidebarProps) {
    const [expandedTables, setExpandedTables] = useState<string[]>([]);
    const [editingColumn, setEditingColumn] = useState<{ tableId: string, columnId: string, name: string } | null>(null);
    const [newColumnInputs, setNewColumnInputs] = useState<Record<string, string>>({});

    const ghostInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const editInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingColumn && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingColumn]);

    const toggleTable = (tableId: string) => {
        setExpandedTables(prev =>
            prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]
        );
    };

    const handleNewColumnSubmit = (tableId: string) => {
        const name = newColumnInputs[tableId]?.trim();
        if (name) {
            onAddColumn(tableId, name);
            setNewColumnInputs(prev => ({ ...prev, [tableId]: '' }));
            // Keep focus for next column
            setTimeout(() => ghostInputRefs.current[tableId]?.focus(), 0);
        }
    };

    const handleEditSubmit = () => {
        if (editingColumn && editingColumn.name.trim()) {
            onUpdateColumn(editingColumn.tableId, editingColumn.columnId, { name: editingColumn.name.trim() });
            setEditingColumn(null);
        }
    };

    return (
        <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full shrink-0">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight font-mono">Tables</h3>
                <button
                    onClick={onAddTable}
                    className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer shadow-sm"
                >
                    <Plus size={14} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {tables.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">No tables yet. Build your first one by clicking the button above.</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {tables.map(table => {
                            const isExpanded = expandedTables.includes(table.id);
                            return (
                                <div key={table.id} className="group">
                                    <div
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${isExpanded ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                                        onClick={() => toggleTable(table.id)}
                                    >
                                        <div className="flex-shrink-0 text-slate-400">
                                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </div>
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: table.color || '#3b82f6' }}></div>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate flex-1">{table.name}</span>

                                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEditTable(table.id); }}
                                                className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeleteTable(table.id); }}
                                                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-slate-100 dark:border-slate-800/50 pl-3 pb-2">
                                            {table.columns.map(column => (
                                                <div
                                                    key={column.id}
                                                    className="flex items-center justify-between group/col px-2 py-1 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-default"
                                                >
                                                    {editingColumn?.columnId === column.id ? (
                                                        <div className="flex-1 flex items-center gap-1">
                                                            <input
                                                                ref={editInputRef}
                                                                value={editingColumn.name}
                                                                onChange={(e) => setEditingColumn({ ...editingColumn, name: e.target.value })}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleEditSubmit()}
                                                                onBlur={handleEditSubmit}
                                                                className="flex-1 bg-white dark:bg-slate-700 border border-blue-500 rounded px-1 text-[11px] focus:outline-none shadow-sm h-6"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingColumn({ tableId: table.id, columnId: column.id, name: column.name });
                                                                }}
                                                                className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate flex-1 hover:text-blue-600 dark:hover:text-blue-400 cursor-text transition-colors"
                                                            >
                                                                {column.name} {column.primaryKey && <span className="ml-1 opacity-70">🔑</span>}
                                                            </span>
                                                            <div className="opacity-0 group-col/col-hover:opacity-100 flex items-center gap-1 transition-opacity ml-1">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onDeleteColumn(table.id, column.id);
                                                                    }}
                                                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                                >
                                                                    <Trash2 size={10} />
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}

                                            {/* Ghost Input for New Column */}
                                            <div className="px-2 pt-1">
                                                <div className="flex items-center gap-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-md bg-slate-50/30 dark:bg-slate-900/30 overflow-hidden focus-within:border-blue-500 transition-all">
                                                    <div className="pl-2 text-slate-300">
                                                        <Plus size={10} />
                                                    </div>
                                                    <input
                                                        ref={el => { ghostInputRefs.current[table.id] = el; }}
                                                        placeholder="Add column..."
                                                        value={newColumnInputs[table.id] || ''}
                                                        onChange={(e) => setNewColumnInputs(prev => ({ ...prev, [table.id]: e.target.value }))}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleNewColumnSubmit(table.id)}
                                                        className="flex-1 bg-transparent py-1 text-[11px] text-slate-600 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
