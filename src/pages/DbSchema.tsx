import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus,
    Database as DatabaseIcon,
    Search,
    Trash2,
    ChevronLeft,
    Save,
    Layout,
    Calendar,
    Layers
} from 'lucide-react';
import {
    useNodesState,
    useEdgesState,
    addEdge,
    ReactFlowProvider,
    type Connection,
    type Edge,
    type Node,
    MarkerType
} from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

import { api } from '../api';
import { DbSchema, DbSchemaData, Table, Column, Relationship } from '../types/schema';
import SchemaCanvas from '../components/schema/SchemaCanvas';
import DesignerSidebar from '../components/schema/DesignerSidebar';
import TableModal from '../components/schema/TableModal';
import MainLayout from '../components/layout/MainLayout';

export default function DbSchemaPage() {
    // Navigation state
    const [view, setView] = useState<'list' | 'designer'>('list');
    const [currentSchema, setCurrentSchema] = useState<DbSchema | null>(null);

    // Data state
    const [schemas, setSchemas] = useState<DbSchema[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Designer state
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // Modals state
    const [tableModal, setTableModal] = useState<{ isOpen: boolean, mode: 'create' | 'edit', tableId?: string }>({ isOpen: false, mode: 'create' });

    // Load schemas on mount
    useEffect(() => {
        loadSchemas();
    }, []);

    const loadSchemas = async () => {
        try {
            setIsLoading(true);
            const data = await api.getDbSchemas();
            setSchemas(data);
        } catch (err) {
            toast.error('Failed to load schemas');
        } finally {
            setIsLoading(false);
        }
    };

    // ==================== List View Actions ====================

    const handleCreateSchema = async () => {
        const name = `New Schema ${schemas.length + 1}`;
        try {
            const defaultData: DbSchemaData = { tables: [], relationships: [] };
            const newSchema = await api.createDbSchema(name, '', JSON.stringify(defaultData));
            setSchemas([newSchema, ...schemas]);
            openDesigner(newSchema);
            toast.success('Schema created');
        } catch (err) {
            toast.error('Failed to create schema');
        }
    };

    const handleDeleteSchema = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this schema?')) return;
        try {
            await api.deleteDbSchema(id);
            setSchemas(schemas.filter(s => s.id !== id));
            toast.success('Schema deleted');
        } catch (err) {
            toast.error('Failed to delete schema');
        }
    };

    const openDesigner = (schema: DbSchema) => {
        setCurrentSchema(schema);

        // Parse schema data and populate React Flow
        let schemaData: DbSchemaData = { tables: [], relationships: [] };
        if (schema.data) {
            try {
                schemaData = JSON.parse(schema.data);
            } catch (e) {
                console.error('Failed to parse schema data', e);
            }
        }

        // Map tables to nodes
        const initialNodes: Node[] = schemaData.tables.map(table => ({
            id: table.id,
            type: 'tableNode',
            position: table.position,
            data: { table }
        }));

        // Map relationships to edges
        const initialEdges: Edge[] = schemaData.relationships.map(rel => ({
            id: rel.id,
            source: rel.sourceTableId,
            target: rel.targetTableId,
            sourceHandle: `${rel.sourceColumnId}-source`,
            targetHandle: `${rel.targetColumnId}-target`,
            type: 'relationshipEdge',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
        }));

        setNodes(initialNodes);
        setEdges(initialEdges);
        setView('designer');
    };

    const closeDesigner = () => {
        setCurrentSchema(null);
        setNodes([]);
        setEdges([]);
        setView('list');
    };

    // ==================== Designer Actions ====================

    const handleSaveDesigner = async () => {
        if (!currentSchema) return;

        const tables: Table[] = nodes.map(node => ({
            ...(node.data.table as Table),
            position: node.position
        }));

        const relationships: Relationship[] = edges.map((edge: Edge) => ({
            id: edge.id,
            type: 'ONE_TO_MANY', // Default for now
            sourceTableId: edge.source,
            sourceColumnId: edge.sourceHandle?.split('-')[0] || '',
            targetTableId: edge.target,
            targetColumnId: edge.targetHandle?.split('-')[0] || '',
        }));

        const data: DbSchemaData = { tables, relationships };

        try {
            const updatedSchema = await api.updateDbSchema(currentSchema.id, currentSchema.name, currentSchema.description, JSON.stringify(data));
            setSchemas(schemas.map(s => s.id === updatedSchema.id ? updatedSchema : s));
            setCurrentSchema(updatedSchema);
            toast.success('Schema saved');
        } catch (err) {
            toast.error('Failed to save schema');
        }
    };

    const handleRearrange = useCallback(() => {
        const tableCount = nodes.length;
        if (tableCount === 0) return;

        const columnCount = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(tableCount))));
        const columnWidth = 300;
        const horizontalGap = 100;
        const verticalGap = 80;
        const startX = 50;
        const startY = 50;

        const columnHeights = Array(columnCount).fill(startY);
        const columnXPositions = Array(columnCount).fill(0).map((_, i) => startX + i * (columnWidth + horizontalGap));

        const rearrangedNodes = nodes.map((node) => {
            const minHeight = Math.min(...columnHeights);
            const columnIndex = columnHeights.indexOf(minHeight);

            const x = columnXPositions[columnIndex];
            const y = columnHeights[columnIndex];

            // Estimate height based on columns
            const table = node.data.table as Table;
            const estimatedHeight = 60 + (table.columns.length * 40) + 20;

            columnHeights[columnIndex] += estimatedHeight + verticalGap;

            return { ...node, position: { x, y } };
        });

        setNodes(rearrangedNodes);
    }, [nodes, setNodes]);

    const onConnect = useCallback((params: Connection) => {
        const newEdge: Edge = {
            ...params,
            id: uuidv4(),
            type: 'relationshipEdge',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
        };
        setEdges((eds) => addEdge(newEdge, eds));
    }, [setEdges]);

    // --- Table CRUD ---

    const handleAddNewTable = () => setTableModal({ isOpen: true, mode: 'create' });

    const handleEditTable = (tableId: string) => {
        setTableModal({ isOpen: true, mode: 'edit', tableId });
    };

    const handleSaveTable = (name: string, color?: string) => {
        if (tableModal.mode === 'create') {
            const newTable: Table = {
                id: uuidv4(),
                name,
                color,
                columns: [
                    { id: uuidv4(), name: 'id', dataType: 'INTEGER', primaryKey: true, unique: true, nullable: false }
                ],
                position: { x: 100, y: 100 }
            };
            setNodes([...nodes, {
                id: newTable.id,
                type: 'tableNode',
                position: newTable.position,
                data: { table: newTable }
            }]);
        } else if (tableModal.tableId) {
            setNodes((nodes: Node[]) => nodes.map((node: Node) => {
                if (node.id === tableModal.tableId) {
                    const updatedTable = { ...node.data.table as Table, name, color };
                    return { ...node, data: { ...node.data, table: updatedTable } };
                }
                return node;
            }));
        }
    };

    const handleDeleteTable = (tableId: string) => {
        if (!confirm('Delete this table and all its relationships?')) return;
        setNodes(nodes.filter(n => n.id !== tableId));
        setEdges(edges.filter(e => e.source !== tableId && e.target !== tableId));
    };

    // --- Column CRUD ---

    const handleAddNewColumnInline = (tableId: string, name: string) => {
        setNodes(nodes => nodes.map(node => {
            if (node.id === tableId) {
                const table = node.data.table as Table;
                const newCol: Column = {
                    id: uuidv4(),
                    name,
                    dataType: 'VARCHAR',
                    nullable: true,
                    primaryKey: false,
                    unique: false,
                };
                return { ...node, data: { ...node.data, table: { ...table, columns: [...table.columns, newCol] } } };
            }
            return node;
        }));
    };

    const handleUpdateColumnInline = (tableId: string, columnId: string, data: Partial<Column>) => {
        setNodes(nodes => nodes.map(node => {
            if (node.id === tableId) {
                const table = node.data.table as Table;
                const updatedColumns = table.columns.map(c => c.id === columnId ? { ...c, ...data } as Column : c);
                return { ...node, data: { ...node.data, table: { ...table, columns: updatedColumns } } };
            }
            return node;
        }));
    };

    const handleDeleteColumn = (tableId: string, columnId: string) => {
        setNodes(nodes.map(node => {
            if (node.id === tableId) {
                const table = node.data.table as Table;
                return { ...node, data: { ...node.data, table: { ...table, columns: table.columns.filter(c => c.id !== columnId) } } };
            }
            return node;
        }));
        // Also cleanup edges pointing to this column
        setEdges(edges.filter(e =>
            !(e.source === tableId && e.sourceHandle === `${columnId}-source`) &&
            !(e.target === tableId && e.targetHandle === `${columnId}-target`)
        ));
    };

    // ==================== Render Helpers ====================

    const filteredSchemas = schemas.filter((s: DbSchema) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const currentTables = nodes.map((n: Node) => n.data.table as Table);

    if (view === 'designer' && currentSchema) {
        return (
            <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-slate-900">
                {/* Designer Header */}
                <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={closeDesigner}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{currentSchema.name}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Database Schema</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSaveDesigner}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all shadow-sm"
                        >
                            <Save size={16} /> Save Changes
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    <DesignerSidebar
                        tables={currentTables}
                        onAddTable={handleAddNewTable}
                        onEditTable={handleEditTable}
                        onDeleteTable={handleDeleteTable}
                        onAddColumn={handleAddNewColumnInline}
                        onUpdateColumn={handleUpdateColumnInline}
                        onDeleteColumn={handleDeleteColumn}
                    />
                    <ReactFlowProvider>
                        <SchemaCanvas
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onTableEdit={handleEditTable}
                            onTableDelete={handleDeleteTable}
                            onColumnClick={() => { }} // Modal-less workflow
                            onRearrange={handleRearrange}
                        />
                    </ReactFlowProvider>
                </div>

                <TableModal
                    isOpen={tableModal.isOpen}
                    mode={tableModal.mode}
                    initialName={tableModal.tableId ? currentTables.find(t => t.id === tableModal.tableId)?.name : ''}
                    initialColor={tableModal.tableId ? currentTables.find(t => t.id === tableModal.tableId)?.color : '#3b82f6'}
                    onClose={() => setTableModal({ ...tableModal, isOpen: false })}
                    onSave={handleSaveTable}
                />
            </div>
        );
    }

    return (
        <MainLayout>
            <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 p-6 overflow-y-auto custom-scrollbar">
                <div className="max-w-6xl mx-auto w-full space-y-8">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
                                    <DatabaseIcon size={28} />
                                </div>
                                DB Schema Designer
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Design and manage your database visual models efficiently.</p>
                        </div>
                        <button
                            onClick={handleCreateSchema}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-xl shadow-blue-500/20 group"
                        >
                            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                            New Schema
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search schemas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                        />
                    </div>

                    {/* Grid */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                            <Layers className="text-slate-300 dark:text-slate-700 mb-4" size={64} />
                            <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded-full" />
                        </div>
                    ) : filteredSchemas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
                            <Layout className="text-slate-300 dark:text-slate-800 mb-4" size={80} />
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">No schemas found</h3>
                            <p className="text-slate-500 dark:text-slate-500 mt-1">Get started by creating your first database model.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
                            {filteredSchemas.map(schema => (
                                <div
                                    key={schema.id}
                                    onClick={() => openDesigner(schema)}
                                    className="group relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 overflow-hidden"
                                >
                                    {/* Decorative background element */}
                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors" />

                                    <div className="relative flex flex-col h-full gap-4">
                                        <div className="flex items-start justify-between">
                                            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-500">
                                                <DatabaseIcon size={24} />
                                            </div>
                                            <button
                                                onClick={(e) => handleDeleteSchema(schema.id, e)}
                                                className="p-2 text-slate-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-blue-600 transition-colors">{schema.name}</h3>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 line-clamp-2 min-h-[2.5rem]">
                                                {schema.description || 'No description provided for this schema.'}
                                            </p>
                                        </div>

                                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800/50">
                                            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
                                                <Calendar size={14} />
                                                {new Date(schema.created_at.toString()).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                Open <ChevronLeft size={16} className="rotate-180" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
