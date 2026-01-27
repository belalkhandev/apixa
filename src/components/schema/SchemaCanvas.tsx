import { useMemo } from 'react';
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    ConnectionMode,
    Panel,
    useReactFlow,
    type Node,
    type Edge,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect,
    type NodeTypes,
    type EdgeTypes,
} from '@xyflow/react';
import { ZoomIn, ZoomOut, Maximize, Layout as LayoutIcon } from 'lucide-react';
import '@xyflow/react/dist/style.css';

import TableNode from './TableNode';
import RelationshipEdge from './RelationshipEdge';

const nodeTypes: NodeTypes = {
    tableNode: TableNode as any,
};

const edgeTypes: EdgeTypes = {
    relationshipEdge: RelationshipEdge as any,
};

interface SchemaCanvasProps {
    nodes: Node[];
    edges: Edge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    onTableEdit: (tableId: string) => void;
    onTableDelete: (tableId: string) => void;
    onColumnClick: (tableId: string, columnId: string) => void;
    onRearrange: () => void;
}

export default function SchemaCanvas({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onTableEdit,
    onTableDelete,
    onColumnClick,
    onRearrange,
}: SchemaCanvasProps) {
    const { zoomIn, zoomOut, fitView } = useReactFlow();

    // Inject event handlers into node data
    const processedNodes = useMemo(() => {
        return nodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                onEdit: onTableEdit,
                onDelete: onTableDelete,
                onColumnClick: onColumnClick,
            }
        }));
    }, [nodes, onTableEdit, onTableDelete, onColumnClick]);

    return (
        <div className="flex-1 h-full relative bg-slate-50 dark:bg-slate-900">
            <ReactFlow
                nodes={processedNodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                connectionMode={ConnectionMode.Loose}
                fitView
            >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} />

                <Panel position="top-left" className="flex flex-col gap-2">
                    <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-md border border-slate-200 dark:border-slate-700 backdrop-blur-sm shadow-sm">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Designer</div>
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={onRearrange}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-600 dark:text-slate-300 flex items-center gap-2 text-xs font-bold"
                                title="Auto-arrange Tables"
                            >
                                <LayoutIcon size={14} /> Rearrange
                            </button>
                        </div>
                    </div>

                    <div className="bg-white/80 dark:bg-slate-800/80 p-1 rounded-md border border-slate-200 dark:border-slate-700 backdrop-blur-sm shadow-sm flex flex-col gap-1">
                        <button onClick={() => zoomIn()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-600 dark:text-slate-300" title="Zoom In">
                            <ZoomIn size={16} />
                        </button>
                        <button onClick={() => zoomOut()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-600 dark:text-slate-300" title="Zoom Out">
                            <ZoomOut size={16} />
                        </button>
                        <button onClick={() => fitView()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-600 dark:text-slate-300" title="Fit View">
                            <Maximize size={16} />
                        </button>
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
}
