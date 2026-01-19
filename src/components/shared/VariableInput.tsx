import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Environment } from "../../api";

interface VariableInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    environments: Environment[];
    selectedEnvId: string | null;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    autoFocus?: boolean;
    list?: string;
    onUpdateVariable?: (name: string, newValue: string) => void;
}

interface Segment {
    text: string;
    isVariable: boolean;
    isValid: boolean;
    variableName?: string;
    value?: string;
}

interface TooltipPosition {
    x: number;
    y: number;
    placement: "bottom" | "top";
    align: "left" | "right" | "center";
}

const TOOLTIP_WIDTH = 220;
const TOOLTIP_HEIGHT = 100;
const HOVER_DELAY = 1000; // 1 second delay
const SCREEN_PADDING = 10;

const VariableInput: React.FC<VariableInputProps> = ({
    value,
    onChange,
    placeholder,
    className = "",
    environments,
    selectedEnvId,
    onKeyDown,
    autoFocus,
    list,
    onUpdateVariable,
}) => {
    const backdropRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [hoveredVariable, setHoveredVariable] = useState<Segment | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
    const [editValue, setEditValue] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const hoverDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const closeDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync scroll from input to backdrop
    const handleScroll = useCallback(() => {
        if (backdropRef.current && inputRef.current) {
            backdropRef.current.scrollLeft = inputRef.current.scrollLeft;
        }
    }, []);

    // Resolve variable value from environment
    const getVariableValue = useCallback((key: string) => {
        if (!selectedEnvId) return null;
        const env = environments.find((e) => e.id === selectedEnvId);
        if (!env) return null;
        const variable = env.variables.find((v) => v.key === key && v.enabled);
        return variable ? variable.value : null;
    }, [selectedEnvId, environments]);

    // Calculate smart tooltip position based on screen boundaries
    const calculateTooltipPosition = useCallback((rect: DOMRect): TooltipPosition => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let x = rect.left;
        let y = rect.bottom + 6;
        let placement: "bottom" | "top" = "bottom";
        let align: "left" | "right" | "center" = "left";

        // Check if tooltip would go below viewport
        if (rect.bottom + TOOLTIP_HEIGHT + SCREEN_PADDING > viewportHeight) {
            // Place above the element
            y = rect.top - TOOLTIP_HEIGHT - 6;
            placement = "top";
        }

        // Check horizontal positioning
        if (x + TOOLTIP_WIDTH > viewportWidth - SCREEN_PADDING) {
            // Align to the right edge of the variable
            x = rect.right - TOOLTIP_WIDTH;
            align = "right";

            // If still overflowing, align to right edge of screen
            if (x < SCREEN_PADDING) {
                x = viewportWidth - TOOLTIP_WIDTH - SCREEN_PADDING;
                align = "center";
            }
        }

        // If positioned too far left
        if (x < SCREEN_PADDING) {
            x = SCREEN_PADDING;
            align = "left";
        }

        return { x, y, placement, align };
    }, []);

    // Parse value into segments (text, variable)
    const segments = useMemo(() => {
        const parts: Segment[] = [];
        const safeValue = value ?? "";

        if (!safeValue) {
            return [{ text: "", isVariable: false, isValid: true }];
        }

        const regex = /\{\{([^}]+)\}\}/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(safeValue)) !== null) {
            // Add text before variable
            if (match.index > lastIndex) {
                parts.push({
                    text: safeValue.slice(lastIndex, match.index),
                    isVariable: false,
                    isValid: true,
                });
            }

            const varName = match[1];
            const varValue = getVariableValue(varName);

            parts.push({
                text: match[0],
                isVariable: true,
                isValid: varValue !== null,
                variableName: varName,
                value: varValue ?? undefined,
            });

            lastIndex = regex.lastIndex;
        }

        // Add remaining text
        if (lastIndex < safeValue.length) {
            parts.push({
                text: safeValue.slice(lastIndex),
                isVariable: false,
                isValid: true,
            });
        }

        // If empty, add a placeholder segment to maintain structure
        if (parts.length === 0) {
            parts.push({ text: "", isVariable: false, isValid: true });
        }

        return parts;
    }, [value, getVariableValue]);

    const handleMouseEnter = useCallback((e: React.MouseEvent, segment: Segment) => {
        if (!segment.isVariable || isEditing) return;

        // Clear any pending close timeout
        if (closeDelayRef.current) {
            clearTimeout(closeDelayRef.current);
            closeDelayRef.current = null;
        }

        // Clear any pending hover timeout
        if (hoverDelayRef.current) {
            clearTimeout(hoverDelayRef.current);
        }

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

        // Set 1 second delay before showing tooltip
        hoverDelayRef.current = setTimeout(() => {
            const position = calculateTooltipPosition(rect);
            setTooltipPosition(position);
            setHoveredVariable(segment);
            setEditValue(segment.value || "");
            setIsCreatingNew(!segment.isValid);
        }, HOVER_DELAY);
    }, [isEditing, calculateTooltipPosition]);

    const closeTooltip = useCallback(() => {
        if (!isEditing) {
            setHoveredVariable(null);
            setTooltipPosition(null);
            setIsCreatingNew(false);
        }
    }, [isEditing]);

    const handleMouseLeave = useCallback((e: React.MouseEvent) => {
        // Clear hover delay if leaving before tooltip shows
        if (hoverDelayRef.current) {
            clearTimeout(hoverDelayRef.current);
            hoverDelayRef.current = null;
        }

        // Check if moving to tooltip
        const related = e.relatedTarget as HTMLElement;
        if (tooltipRef.current?.contains(related)) return;

        // Delay closing to allow moving to tooltip
        closeDelayRef.current = setTimeout(closeTooltip, 150);
    }, [closeTooltip]);

    const handleTooltipMouseEnter = useCallback(() => {
        if (closeDelayRef.current) {
            clearTimeout(closeDelayRef.current);
            closeDelayRef.current = null;
        }
    }, []);

    const handleTooltipMouseLeave = useCallback(() => {
        closeDelayRef.current = setTimeout(closeTooltip, 150);
    }, [closeTooltip]);

    const handleUpdateVar = useCallback(() => {
        if (hoveredVariable?.variableName && onUpdateVariable) {
            onUpdateVariable(hoveredVariable.variableName, editValue);
        }
        setIsEditing(false);
        setIsCreatingNew(false);
        setHoveredVariable(null);
        setTooltipPosition(null);
    }, [hoveredVariable, editValue, onUpdateVariable]);

    const handleCancelEdit = useCallback(() => {
        setIsEditing(false);
        setIsCreatingNew(false);
        setHoveredVariable(null);
        setTooltipPosition(null);
    }, []);

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (hoverDelayRef.current) clearTimeout(hoverDelayRef.current);
            if (closeDelayRef.current) clearTimeout(closeDelayRef.current);
        };
    }, []);

    // Close tooltip when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                tooltipRef.current &&
                !tooltipRef.current.contains(e.target as Node) &&
                (isEditing || isCreatingNew)
            ) {
                handleCancelEdit();
            }
        };

        if (isEditing || isCreatingNew) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isEditing, isCreatingNew, handleCancelEdit]);

    // Determine padding from className
    const hasPadding = className.includes("px-");
    const paddingClass = hasPadding ? "" : "px-2";

    return (
        <div className={`relative ${className}`}>
            {/* Interactive Tooltip */}
            {hoveredVariable && tooltipPosition && (
                <div
                    ref={tooltipRef}
                    className="fixed z-[9999] bg-white text-slate-800 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-slate-200 overflow-hidden"
                    style={{
                        top: tooltipPosition.y,
                        left: tooltipPosition.x,
                        width: TOOLTIP_WIDTH,
                    }}
                    onMouseEnter={handleTooltipMouseEnter}
                    onMouseLeave={handleTooltipMouseLeave}
                >
                    {/* Header */}
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span
                                className={`w-2 h-2 rounded-full ${
                                    hoveredVariable.isValid ? "bg-emerald-500" : "bg-red-500"
                                }`}
                            />
                            <span className="font-mono text-xs font-semibold text-slate-700">
                                {hoveredVariable.variableName}
                            </span>
                        </div>
                        {!isEditing && !isCreatingNew && (
                            <button
                                onClick={() => {
                                    setIsEditing(true);
                                    if (!hoveredVariable.isValid) setIsCreatingNew(true);
                                }}
                                className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
                            >
                                {hoveredVariable.isValid ? "Edit" : "Create"}
                            </button>
                        )}
                    </div>

                    {/* Content */}
                    <div className="px-3 py-2">
                        {isEditing || isCreatingNew ? (
                            <div className="space-y-2">
                                <div>
                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                                        {isCreatingNew ? "Set Value" : "Value"}
                                    </label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleUpdateVar();
                                            if (e.key === "Escape") handleCancelEdit();
                                        }}
                                        placeholder={isCreatingNew ? "Enter value..." : ""}
                                        className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-200 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 bg-white text-slate-700"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={handleCancelEdit}
                                        className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUpdateVar}
                                        className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
                                    >
                                        {isCreatingNew ? "Create" : "Save"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">
                                    Current Value
                                </div>
                                {hoveredVariable.isValid ? (
                                    <div className="text-sm text-slate-700 font-medium break-all">
                                        {hoveredVariable.value || (
                                            <span className="italic text-slate-400">Empty string</span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-sm text-red-500 font-medium">
                                        Variable not defined
                                        {!selectedEnvId && (
                                            <span className="block text-[10px] text-slate-400 font-normal mt-1">
                                                Select an environment first
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Arrow indicator */}
                    <div
                        className={`absolute w-2 h-2 bg-white border-slate-200 transform rotate-45 ${
                            tooltipPosition.placement === "bottom"
                                ? "-top-1 border-l border-t"
                                : "-bottom-1 border-r border-b"
                        }`}
                        style={{
                            left: tooltipPosition.align === "left" ? 16 : tooltipPosition.align === "right" ? TOOLTIP_WIDTH - 24 : TOOLTIP_WIDTH / 2 - 4,
                        }}
                    />
                </div>
            )}

            <div className="relative w-full h-full flex items-center">
                {/* Input Layer - Actual editable input (bottom layer) */}
                <input
                    ref={inputRef}
                    type="text"
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    onScroll={handleScroll}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    list={list}
                    className={`w-full h-full bg-transparent placeholder:text-slate-400 focus:outline-none text-sm ${paddingClass}`}
                    style={{
                        color: "transparent",
                        caretColor: "#1e293b",
                    }}
                    spellCheck={false}
                    autoComplete="off"
                />

                {/* Display Layer - Shows text with highlighting (middle layer, no pointer events) */}
                <div
                    ref={backdropRef}
                    aria-hidden="true"
                    className={`absolute inset-0 flex items-center overflow-hidden pointer-events-none ${paddingClass}`}
                    style={{ whiteSpace: "pre" }}
                >
                    <span className="text-sm">
                        {segments.map((segment, i) => (
                            <span
                                key={i}
                                className={
                                    segment.isVariable
                                        ? segment.isValid
                                            ? "text-emerald-600 bg-emerald-100/80 rounded-sm border-b border-emerald-400"
                                            : "text-red-600 bg-red-100/80 rounded-sm border-b border-red-400"
                                        : "text-slate-700"
                                }
                            >
                                {segment.text}
                            </span>
                        ))}
                    </span>
                </div>

                {/* Interactive Layer - Invisible layer for hover detection (top layer) */}
                <div
                    className={`absolute inset-0 flex items-center overflow-hidden pointer-events-none ${paddingClass}`}
                    style={{ whiteSpace: "pre" }}
                >
                    <span className="text-sm">
                        {segments.map((segment, i) => (
                            <span
                                key={i}
                                onMouseEnter={(e) => handleMouseEnter(e, segment)}
                                onMouseLeave={handleMouseLeave}
                                style={{
                                    color: "transparent",
                                    pointerEvents: segment.isVariable ? "auto" : "none",
                                    cursor: segment.isVariable ? "help" : "text",
                                }}
                            >
                                {segment.text}
                            </span>
                        ))}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default VariableInput;
