import { useState, memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Trash2, Edit, ChevronDown, ChevronUp, Key } from 'lucide-react';
import { Table } from '../../types/schema';

type TableNodeData = {
    table: Table;
    onEdit: (tableId: string) => void;
    onDelete: (tableId: string) => void;
    onColumnClick: (tableId: string, columnId: string) => void;
};

type CustomNode = Node<TableNodeData, 'tableNode'>;

const TableNode = ({ data, selected }: NodeProps<CustomNode>) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const { table, onEdit, onDelete, onColumnClick } = data;

    return (
        <div
            className={`bg-white dark:bg-slate-800 rounded-lg shadow-lg border-2 transition-all ${selected ? 'border-blue-500 shadow-xl' : 'border-slate-200 dark:border-slate-700'
                }`}
            style={{
                width: '280px',
            }}
        >
            {/* Table Header */}
            <div
                className="px-3 py-2 rounded-t-lg flex items-center justify-between cursor-move"
                style={{ backgroundColor: table.color || '#3b82f6' }}
            >
                <h3
                    className="font-bold text-white text-sm truncate flex-1 mr-2"
                    title={table.name}
                >
                    {table.name}
                </h3>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(table.id);
                        }}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                        title="Edit Table"
                    >
                        <Edit size={14} className="text-white" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(table.id);
                        }}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                        title="Delete Table"
                    >
                        <Trash2 size={14} className="text-white" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                    >
                        {isExpanded ? (
                            <ChevronUp size={14} className="text-white" />
                        ) : (
                            <ChevronDown size={14} className="text-white" />
                        )}
                    </button>
                </div>
            </div>

            {/* Columns */}
            {isExpanded && (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {table.columns.map((column) => {
                        const isPrimaryKey = column.primaryKey;
                        const isUnique = column.unique;

                        return (
                            <div
                                key={column.id}
                                className="relative px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onColumnClick(table.id, column.id);
                                }}
                            >
                                {/* Handles */}
                                <Handle
                                    type="target"
                                    position={Position.Left}
                                    id={`${column.id}-target`}
                                    className="!w-2 !h-2 !bg-slate-400 !border !border-white"
                                />
                                <Handle
                                    type="source"
                                    position={Position.Right}
                                    id={`${column.id}-source`}
                                    className="!w-2 !h-2 !bg-slate-400 !border !border-white"
                                />

                                <div className="flex items-center justify-between gap-2 overflow-hidden">
                                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                        <div className="flex-shrink-0">
                                            {isPrimaryKey ? (
                                                <Key size={12} className="text-yellow-500" />
                                            ) : isUnique ? (
                                                <div className="w-3 h-3 flex items-center justify-center text-[8px] font-bold text-blue-600 border border-blue-600 rounded-sm">U</div>
                                            ) : (
                                                <div className="w-3" />
                                            )}
                                        </div>
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{column.name}</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-400 uppercase">{column.dataType}{column.length ? `(${column.length})` : ''}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Footer */}
            {!isExpanded && (
                <div className="px-3 py-1.5 text-[10px] text-slate-500 text-center bg-slate-50 dark:bg-slate-900/50">
                    {table.columns.length} columns
                </div>
            )}
        </div>
    );
};

export default memo(TableNode);
