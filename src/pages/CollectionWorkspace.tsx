import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus,
  ChevronDown,
  X,
  MoreHorizontal,
  Send,
  Loader2,
  Columns,
  Rows,
  GripVertical,
  GripHorizontal,
  Home,
} from "lucide-react";
import EnvironmentManager from "../components/EnvironmentManager";
import ResponseViewer from "../components/request/ResponseViewer";
import RequestConfigTabs, { BodyType, ExtractRule } from "../components/request/RequestConfigTabs";
import { AuthType } from "../components/shared/AuthEditor";
import { Param } from "../components/shared/ParamsEditor";
import { api, Collection, TreeItem, Request as ApiRequest, ResponseData } from "../api";
import CollectionSidebar from "../components/workspace/CollectionSidebar";
import SaveToCollectionModal from "../components/SaveToCollectionModal";
import { methodTextColors } from "../constants";
import VariableInput from "../components/shared/VariableInput";
import { useEnvironment } from "../hooks";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface TabState {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  isNew?: boolean;
  body: string;
  bodyType: BodyType;
  headers: { key: string; value: string; enabled: boolean }[];
  params: Param[];
  authType: AuthType;
  authData: Record<string, string>;
  extractRules: ExtractRule[];
  response: ResponseData | null;
  error: string | null;
  isLoading: boolean;
}

const createDefaultTabState = (id: string, name: string = "New Request", method: HttpMethod = "GET", url: string = "", isNew: boolean = false): TabState => ({
  id,
  name,
  method,
  url,
  isNew,
  body: "",
  bodyType: "json",
  headers: [{ key: "", value: "", enabled: true }],
  params: [{ key: "", value: "", param_type: "query", description: "", enabled: true }],
  authType: "none",
  authData: {},
  extractRules: [{ variable: "", path: "", enabled: true }],
  response: null,
  error: null,
  isLoading: false,
});

interface FolderOpenState {
  [key: string]: boolean;
}





function CollectionWorkspace() {
  const { collectionId } = useParams();
  const navigate = useNavigate();

  // Environment hook
  const {
    environments,
    selectedEnvId,
    setSelectedEnvId,
    handleCreateEnv,
    handleUpdateEnv,
    handleDeleteEnv,
    handleUpdateVariable,
    replaceEnvVariables,
  } = useEnvironment();

  // Data state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [treeItems, setTreeItems] = useState<TreeItem[]>([]);
  const [currentRequest, setCurrentRequest] = useState<ApiRequest | null>(null);

  // UI state
  const [folderOpenState, setFolderOpenState] = useState<FolderOpenState>({ endpoints: true });
  const [openTabs, setOpenTabs] = useState<TabState[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isBeautified, setIsBeautified] = useState(true);

  // Get active tab helper
  const activeTab = openTabs.find(t => t.id === activeTabId);

  // Helper to update active tab state
  const updateActiveTab = (updates: Partial<TabState>) => {
    if (!activeTabId) return;
    setOpenTabs(tabs => tabs.map(tab =>
      tab.id === activeTabId ? { ...tab, ...updates } : tab
    ));
  };

  // UI state
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [showNewFolderInput, setShowNewFolderInput] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [isEditingCollectionName, setIsEditingCollectionName] = useState(false);
  const [editedCollectionName, setEditedCollectionName] = useState("");

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [draggedItemType, setDraggedItemType] = useState<"request" | "folder" | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Layout state
  const [layout, setLayout] = useState<"vertical" | "horizontal">("vertical");
  const [splitPos, setSplitPos] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      let newSplitPos = 50;

      if (layout === "horizontal") {
        newSplitPos = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      } else {
        newSplitPos = ((e.clientY - containerRect.top) / containerRect.height) * 100;
      }

      setSplitPos(Math.min(80, Math.max(20, newSplitPos)));
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleResizeMove);
      document.addEventListener("mouseup", handleResizeEnd);
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
      document.body.style.userSelect = "";
    };
  }, [isResizing, layout]);

  const currentCollection = collections.find((c) => c.id === collectionId);

  // Load collections on mount
  useEffect(() => {
    loadCollections();
  }, []);

  // Load collection tree when collectionId changes
  useEffect(() => {
    if (collectionId) {
      loadCollectionTree();
    }
  }, [collectionId]);

  // Auto-create new tab in quick-request mode
  useEffect(() => {
    if (!collectionId && openTabs.length === 0) {
      const tempId = `temp-${Date.now()}`;
      const newTab = createDefaultTabState(tempId, "New Request", "GET", "", true);
      setOpenTabs([newTab]);
      setActiveTabId(tempId);
    }
  }, [collectionId]);

  const loadCollections = async () => {
    try {
      const data = await api.getCollections();
      setCollections(data);
    } catch (err) {
      console.error("Failed to load collections:", err);
    }
  };

  const loadCollectionTree = async () => {
    if (!collectionId) return;
    setIsDataLoading(true);
    try {
      const tree = await api.getCollectionTree(collectionId);
      setTreeItems(tree);
    } catch (err) {
      console.error("Failed to load collection tree:", err);
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleUpdateCollectionName = async () => {
    if (!collectionId || !editedCollectionName.trim()) return;

    try {
      const updated = await api.updateCollection(
        collectionId,
        editedCollectionName.trim(),
        currentCollection?.description || undefined
      );
      setCollections(collections.map((c) => (c.id === updated.id ? updated : c)));
      setIsEditingCollectionName(false);
    } catch (err) {
      console.error("Failed to update collection:", err);
    }
  };

  const handleDeleteCollection = async () => {
    if (!collectionId) return;

    try {
      await api.deleteCollection(collectionId);
      navigate("/");
    } catch (err) {
      console.error("Failed to delete collection:", err);
    }
  };

  const handleToggleFolder = (folderId: string) => {
    setFolderOpenState((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: string, type: "request" | "folder") => {
    setDraggedItemId(itemId);
    setDraggedItemType(type);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.setData("application/x-item-type", type);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDraggedItemType(null);
    setDragOverFolderId(null);
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain");
    const itemType = e.dataTransfer.getData("application/x-item-type") || draggedItemType;

    if (itemId && itemId !== targetFolderId) {
      try {
        if (itemType === "folder") {
          await api.moveFolder(itemId, targetFolderId || undefined);
        } else {
          await api.moveRequest(itemId, targetFolderId || undefined);
        }
        await loadCollectionTree();
      } catch (err) {
        console.error(`Failed to move ${itemType}:`, err);
      }
    }

    setDraggedItemId(null);
    setDraggedItemType(null);
    setDragOverFolderId(null);
  };

  const handleRequestClick = async (requestId: string, requestName: string, requestMethod: string, requestUrl: string) => {
    const existingTab = openTabs.find((t) => t.id === requestId);

    if (existingTab) {
      // Tab already open, just switch to it
      setActiveTabId(requestId);
      setCurrentRequest(null);
      // Load current request for saving purposes
      try {
        const fullRequest = await api.getRequest(requestId);
        setCurrentRequest(fullRequest);
      } catch (err) {
        console.error("Failed to load request:", err);
      }
      return;
    }

    // Load full request details and create new tab
    try {
      const fullRequest = await api.getRequest(requestId);
      setCurrentRequest(fullRequest);

      const newTab = createDefaultTabState(requestId, requestName, requestMethod as HttpMethod, requestUrl);
      newTab.body = fullRequest.body || "";
      newTab.headers = fullRequest.headers.length > 0
        ? fullRequest.headers.map(h => ({ key: h.key, value: h.value, enabled: h.enabled }))
        : [{ key: "", value: "", enabled: true }];
      newTab.params = fullRequest.params.map(p => ({
        key: p.key,
        value: p.value,
        param_type: p.param_type,
        description: p.description || "",
        enabled: p.enabled
      }));

      setOpenTabs([...openTabs, newTab]);
      setActiveTabId(requestId);
    } catch (err) {
      console.error("Failed to load request:", err);
    }
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = openTabs.filter((t) => t.id !== tabId);
    setOpenTabs(newTabs);
    if (activeTabId === tabId) {
      const newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
      setActiveTabId(newActiveId);
      if (!newActiveId) {
        setCurrentRequest(null);
      }
    }
  };

  const handleNewRequest = () => {
    const tempId = `temp-${Date.now()}`;
    const newTab = createDefaultTabState(tempId, "New Request", "GET", "", true);
    setOpenTabs([...openTabs, newTab]);
    setActiveTabId(tempId);
    setCurrentRequest(null);
  };

  const handleCreateFolder = async (parentId?: string) => {
    if (!collectionId || !newFolderName.trim()) return;

    try {
      await api.createFolder(collectionId, newFolderName.trim(), parentId);
      await loadCollectionTree();
      setNewFolderName("");
      setShowNewFolderInput(null);
    } catch (err) {
      console.error("Failed to create folder:", err);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await api.deleteFolder(folderId);
      await loadCollectionTree();
    } catch (err) {
      console.error("Failed to delete folder:", err);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      await api.deleteRequest(requestId);
      await loadCollectionTree();

      // Close tab if open
      const newTabs = openTabs.filter((t) => t.id !== requestId);
      setOpenTabs(newTabs);
      if (activeTabId === requestId) {
        setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
        setCurrentRequest(null);
      }
    } catch (err) {
      console.error("Failed to delete request:", err);
    }
  };

  const handleSaveRequest = async () => {
    if (!activeTab || !activeTab.url.trim()) {
      updateActiveTab({ error: "Please enter a URL before saving" });
      return;
    }

    try {
      let savedRequest: ApiRequest | null = null;

      // Prepare data from active tab
      const headersList = activeTab.headers.filter(h => h.key.trim() !== "").map(h => ({
        key: h.key,
        value: h.value,
        enabled: h.enabled
      }));

      const paramsList = activeTab.params.filter(p => p.key.trim() !== "").map(p => ({
        key: p.key,
        value: p.value,
        param_type: p.param_type || "query",
        description: p.description || null,
        enabled: p.enabled
      }));

      // If currentRequest exists, it's an update
      if (currentRequest) {
        savedRequest = await api.updateRequest(
          currentRequest.id,
          activeTab.name,
          activeTab.method,
          activeTab.url,
          activeTab.body || null,
          headersList,
          paramsList
        );
      } else if (collectionId) {
        // Create new request
        savedRequest = await api.createRequest(
          collectionId,
          activeTab.name,
          activeTab.method,
          activeTab.url,
          undefined
        );

        if (savedRequest) {
          savedRequest = await api.updateRequest(
            savedRequest.id,
            activeTab.name,
            activeTab.method,
            activeTab.url,
            activeTab.body || null,
            headersList,
            paramsList
          );
        }
      }

      if (savedRequest) {
        setCurrentRequest(savedRequest);
        await loadCollectionTree();

        // Update active tab ID if it was temporary
        if (activeTabId && activeTabId.startsWith("temp-")) {
          const tempId = activeTabId;
          setOpenTabs(openTabs.map(t =>
            t.id === tempId
              ? { ...t, id: savedRequest!.id, isNew: false }
              : t
          ));
          setActiveTabId(savedRequest.id);
        }
      }
    } catch (err) {
      console.error("Failed to save request:", err);
      updateActiveTab({ error: "Failed to save request" });
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const extractValueFromPath = (obj: unknown, path: string): string | null => {
    const parts = path.split(".");
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return null;
      if (typeof current !== "object") return null;

      const index = parseInt(part, 10);
      if (!isNaN(index) && Array.isArray(current)) {
        current = current[index];
      } else {
        current = (current as Record<string, unknown>)[part];
      }
    }

    if (current === null || current === undefined) return null;
    if (typeof current === "object") return JSON.stringify(current);
    return String(current);
  };

  const handleSendRequest = async () => {
    if (!activeTab || !activeTab.url) {
      updateActiveTab({ error: "Please enter a URL" });
      return;
    }

    updateActiveTab({ isLoading: true, error: null, response: null });

    try {
      // 1. Resolve basic URL variables
      let resolvedUrl = replaceEnvVariables(activeTab.url);

      // 2. Append Query Params
      const tabParams = activeTab.params.filter(p => p.enabled && p.key.trim() !== "");
      if (tabParams.length > 0) {
        const urlObj = new URL(resolvedUrl.startsWith("http") ? resolvedUrl : `http://${resolvedUrl}`);
        tabParams.forEach(p => {
          const key = replaceEnvVariables(p.key);
          const value = replaceEnvVariables(p.value);
          urlObj.searchParams.append(key, value);
        });

        if (resolvedUrl.startsWith("http")) {
          resolvedUrl = urlObj.toString();
        } else {
          const queryString = tabParams.map(p =>
            `${encodeURIComponent(replaceEnvVariables(p.key))}=${encodeURIComponent(replaceEnvVariables(p.value))}`
          ).join("&");
          resolvedUrl = `${resolvedUrl}${resolvedUrl.includes('?') ? '&' : '?'}${queryString}`;
        }
      }

      let resolvedBody = replaceEnvVariables(activeTab.body);

      const requestHeaders: Record<string, string> = {};
      activeTab.headers.forEach((h) => {
        if (h.key && h.value) {
          requestHeaders[replaceEnvVariables(h.key)] = replaceEnvVariables(h.value);
        }
      });

      // Apply authentication
      if (activeTab.authType === "bearer" && activeTab.authData.token) {
        const token = replaceEnvVariables(activeTab.authData.token);
        requestHeaders["Authorization"] = `Bearer ${token}`;
      } else if (activeTab.authType === "basic" && activeTab.authData.username) {
        const username = replaceEnvVariables(activeTab.authData.username || "");
        const password = replaceEnvVariables(activeTab.authData.password || "");
        const credentials = btoa(`${username}:${password}`);
        requestHeaders["Authorization"] = `Basic ${credentials}`;
      } else if (activeTab.authType === "api-key" && activeTab.authData.key && activeTab.authData.value) {
        const key = replaceEnvVariables(activeTab.authData.key);
        const value = replaceEnvVariables(activeTab.authData.value);
        if (activeTab.authData.addTo === "query") {
          const separator = resolvedUrl.includes("?") ? "&" : "?";
          resolvedUrl = `${resolvedUrl}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        } else {
          requestHeaders[key] = value;
        }
      }

      // Handle body and Content-Type based on bodyType
      if (activeTab.method !== "GET" && activeTab.method !== "DELETE" && resolvedBody) {
        if (!requestHeaders["Content-Type"]) {
          if (activeTab.bodyType === "formdata") {
            try {
              const parsed = JSON.parse(resolvedBody);
              if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
                resolvedBody = Object.entries(parsed)
                  .map(([key, value]) => {
                    const strValue = typeof value === "object" ? JSON.stringify(value) : String(value);
                    return `${encodeURIComponent(key)}=${encodeURIComponent(strValue)}`;
                  })
                  .join("&");
              }
            } catch {
              // If not valid JSON, send as-is
            }
            requestHeaders["Content-Type"] = "application/x-www-form-urlencoded";
          } else if (activeTab.bodyType === "text") {
            requestHeaders["Content-Type"] = "text/plain";
          } else {
            requestHeaders["Content-Type"] = "application/json";
          }
        }
      }

      const res = await api.sendRequest({
        method: activeTab.method,
        url: resolvedUrl,
        headers: requestHeaders,
        body: (activeTab.method !== "GET" && activeTab.method !== "DELETE") ? resolvedBody : null
      });

      const responseData = {
        status: res.status,
        statusText: res.statusText,
        time: res.time,
        size: formatBytes(typeof res.size === 'number' ? res.size : parseInt(res.size)),
        headers: res.headers,
        body: res.body,
      };

      updateActiveTab({
        isLoading: false,
        response: responseData
      });

      if (activeTab.extractRules && activeTab.extractRules.length > 0 && selectedEnvId) {
        try {
          const jsonBody = JSON.parse(res.body);
          for (const rule of activeTab.extractRules) {
            if (rule.enabled && rule.variable.trim() && rule.path.trim()) {
              const extractedValue = extractValueFromPath(jsonBody, rule.path);
              if (extractedValue !== null) {
                handleUpdateVariable(rule.variable, extractedValue);
              }
            }
          }
        } catch {
        }
      }
    } catch (err) {
      console.log(err);
      updateActiveTab({
        isLoading: false,
        error: err instanceof Error ? err.message : "Request failed"
      });
    }
  };

  const handleSaveToCollection = async (targetCollectionId: string) => {
    if (!activeTab || !activeTab.url.trim()) return;

    try {
      const headersList = activeTab.headers.filter(h => h.key.trim() !== "").map(h => ({
        key: h.key,
        value: h.value,
        enabled: h.enabled
      }));

      const paramsList = activeTab.params.filter(p => p.key.trim() !== "").map(p => ({
        key: p.key,
        value: p.value,
        param_type: p.param_type || "query",
        description: p.description || null,
        enabled: p.enabled
      }));

      let savedRequest = await api.createRequest(
        targetCollectionId,
        activeTab.name,
        activeTab.method,
        activeTab.url,
        undefined
      );

      if (savedRequest) {
        savedRequest = await api.updateRequest(
          savedRequest.id,
          activeTab.name,
          activeTab.method,
          activeTab.url,
          activeTab.body || null,
          headersList,
          paramsList
        );
      }

      setShowSaveModal(false);
      navigate(`/collection/${targetCollectionId}`);
    } catch (err) {
      console.error("Failed to save to collection:", err);
    }
  };




  return (
    <div className="h-screen bg-slate-50 flex">
      {collectionId && (
        <CollectionSidebar
          collection={currentCollection || null}
          collections={collections}
          treeItems={treeItems}
          isLoading={isDataLoading}
          activeTabId={activeTabId}
          folderOpenState={folderOpenState}
          draggedItemId={draggedItemId}
          draggedItemType={draggedItemType}
          dragOverFolderId={dragOverFolderId}
          showNewFolderInput={showNewFolderInput}
          newFolderName={newFolderName}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleFolder={handleToggleFolder}
          onRequestClick={handleRequestClick}
          onNewRequest={handleNewRequest}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
          onDeleteRequest={handleDeleteRequest}
          onShowNewFolderInput={setShowNewFolderInput}
          onSetNewFolderName={setNewFolderName}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onHomeClick={() => navigate('/')}
          onSwitchCollection={(id) => navigate(`/collection/${id}`)}
          isEditingCollectionName={isEditingCollectionName}
          editedCollectionName={editedCollectionName}
          onSetEditedCollectionName={setEditedCollectionName}
          onSaveCollectionName={handleUpdateCollectionName}
          onCancelEditCollectionName={() => setIsEditingCollectionName(false)}
          onRenameCollectionStart={() => {
            setEditedCollectionName(currentCollection?.name || "");
            setIsEditingCollectionName(true);
          }}
          onDeleteCollection={handleDeleteCollection}
        />
      )}

      <main className="flex-1 flex flex-col bg-slate-50">
        <div className="bg-white border-b border-slate-200">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-1 flex-1 overflow-x-auto">
              {!collectionId && (
                <button
                  onClick={() => navigate('/')}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors mr-1"
                  title="Back to Home"
                >
                  <Home size={16} />
                </button>
              )}
              {openTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex items-center gap-2 px-3 py-2 text-sm border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTabId === tab.id
                    ? "border-blue-500 text-slate-800"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                >
                  <div
                    className="flex items-center gap-2"
                    onClick={() => setActiveTabId(tab.id)}
                  >
                    <span className={`text-[10px] font-bold ${methodTextColors[tab.method] || "text-slate-600"}`}>
                      {tab.method}
                    </span>
                    <span>{tab.name}</span>
                  </div>
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="p-0.5 hover:bg-slate-200 rounded transition-colors"
                  >
                    <X size={12} className="text-slate-400" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleNewRequest()}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Plus size={16} />
              </button>
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <MoreHorizontal size={16} />
              </button>
            </div>

            <div className="ml-4">
              <EnvironmentManager
                environments={environments}
                selectedEnvId={selectedEnvId}
                onSelectEnv={setSelectedEnvId}
                onCreateEnv={handleCreateEnv}
                onUpdateEnv={handleUpdateEnv}
                onDeleteEnv={handleDeleteEnv}
              />
            </div>
          </div>
        </div>

        {activeTab ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-white px-4 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={activeTab.name}
                  onChange={(e) => updateActiveTab({ name: e.target.value })}
                  placeholder="Request name"
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400"
                />
                {(currentRequest || (activeTabId && activeTabId.startsWith("temp-"))) && (
                  <button
                    onClick={collectionId ? handleSaveRequest : () => setShowSaveModal(true)}
                    disabled={!activeTab.url.trim()}
                    className={`px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium transition-colors ${activeTab.url.trim()
                      ? "text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100"
                      : "text-slate-400 cursor-not-allowed bg-slate-50"
                      }`}
                  >
                    {collectionId ? "Save" : "Save to Collection"}
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <select
                    value={activeTab.method}
                    onChange={(e) => updateActiveTab({ method: e.target.value as HttpMethod })}
                    className={`appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-blue-400 ${methodTextColors[activeTab.method] || "text-slate-600"}`}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <div className="flex-1 border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-400 focus-within:border-transparent transition-all h-[42px]">
                  <VariableInput
                    value={activeTab.url}
                    onChange={(url) => updateActiveTab({ url })}
                    placeholder="Enter request URL (e.g., https://api.example.com/users)"
                    className="px-4 h-full"
                    environments={environments}
                    selectedEnvId={selectedEnvId}
                    onUpdateVariable={handleUpdateVariable}
                  />
                </div>

                <button
                  onClick={handleSendRequest}
                  disabled={activeTab.isLoading}
                  className="px-5 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {activeTab.isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Send
                </button>

                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 ml-2">
                  <button
                    onClick={() => setLayout("vertical")}
                    className={`p-1.5 rounded transition-colors ${layout === "vertical" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                    title="Vertical Split"
                  >
                    <Rows size={14} />
                  </button>
                  <button
                    onClick={() => setLayout("horizontal")}
                    className={`p-1.5 rounded transition-colors ${layout === "horizontal" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                    title="Horizontal Split"
                  >
                    <Columns size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div
              ref={containerRef}
              className={`flex-1 flex ${layout === "vertical" ? "flex-col" : "flex-row"} overflow-hidden bg-slate-50 relative`}
            >
              <div
                style={{ flexBasis: `${splitPos}%` }}
                className="flex flex-col min-w-0 min-h-0 relative"
              >

                <div className="flex-1 flex flex-col min-h-0 p-4">
                  <RequestConfigTabs
                    body={activeTab.body}
                    onBodyChange={(body) => updateActiveTab({ body })}
                    headers={activeTab.headers}
                    onHeadersChange={(headers) => updateActiveTab({ headers })}
                    params={activeTab.params}
                    onParamsChange={(params) => updateActiveTab({ params })}
                    method={activeTab.method}
                    environments={environments}
                    selectedEnvId={selectedEnvId}
                    onUpdateVariable={handleUpdateVariable}
                    onBodyTypeChange={(bodyType) => updateActiveTab({ bodyType })}
                    authType={activeTab.authType}
                    authData={activeTab.authData}
                    onAuthChange={(authType, authData) => {
                      updateActiveTab({ authType, authData });
                    }}
                    extractRules={activeTab.extractRules}
                    onExtractRulesChange={(extractRules) => updateActiveTab({ extractRules })}
                    variant="compact"
                  />
                </div>
              </div>

              <div
                className={`z-20 flex items-center justify-center shrink-0 hover:bg-blue-400 bg-slate-200 transition-colors
                    ${layout === "vertical" ? "h-1.5 w-full cursor-row-resize" : "w-1.5 h-full cursor-col-resize"}
                `}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
                }}
              >
                {layout === "vertical"
                  ? <GripHorizontal size={12} className="text-slate-400" />
                  : <GripVertical size={12} className="text-slate-400" />
                }
              </div>

              <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative">
                <div className="flex-1 overflow-hidden p-4 pt-2 h-full">
                  <ResponseViewer
                    response={activeTab.response}
                    error={activeTab.error}
                    isBeautified={isBeautified}
                    onToggleBeautify={() => setIsBeautified(!isBeautified)}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <button
                onClick={() => handleNewRequest()}
                className="flex flex-col items-center gap-3 px-8 py-6 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-white transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Plus size={24} className="text-blue-500" />
                </div>
                <span className="text-sm font-medium text-slate-600">New Request</span>
              </button>
            </motion.div>
          </div>
        )}
      </main>

      <SaveToCollectionModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveToCollection}
        requestName={activeTab?.name}
      />
    </div>
  );
}

export default CollectionWorkspace;
