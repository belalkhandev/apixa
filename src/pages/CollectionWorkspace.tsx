import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  ChevronRight,
  ChevronDown,
  Folder,
  Home as HomeIcon,
  X,
  MoreHorizontal,
  Send,
  Loader2,
  Trash2,
  Edit3,
  Check,
  Copy,
  WrapText,
  FolderPlus,
  FileJson,
  Columns,
  Rows,
  GripVertical,
  GripHorizontal,
} from "lucide-react";
import EnvironmentManager from "../components/EnvironmentManager";
import BodyEditor from "../components/shared/BodyEditor";
import ResponseViewer from "../components/request/ResponseViewer";
import HeadersEditor from "../components/shared/HeadersEditor";
import AuthEditor, { AuthType } from "../components/shared/AuthEditor";
import { api, Collection, TreeItem, Environment, Request as ApiRequest, ResponseData } from "../api";
import CollectionSidebar from "../components/workspace/CollectionSidebar";
import { methodTextColors } from "../constants";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface OpenTab {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  isNew?: boolean;
}



interface FolderOpenState {
  [key: string]: boolean;
}

const statusColors: Record<string, string> = {
  "2": "text-emerald-600 bg-emerald-50",
  "3": "text-blue-600 bg-blue-50",
  "4": "text-amber-600 bg-amber-50",
  "5": "text-red-600 bg-red-50",
};



function CollectionWorkspace() {
  const { collectionId } = useParams();
  const navigate = useNavigate();

  // Data state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [treeItems, setTreeItems] = useState<TreeItem[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [currentRequest, setCurrentRequest] = useState<ApiRequest | null>(null);

  // UI state
  const [folderOpenState, setFolderOpenState] = useState<FolderOpenState>({ endpoints: true });
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [activeRequestTab, setActiveRequestTab] = useState("Params");
  const [method, setMethod] = useState<HttpMethod>("GET");  // Request state
  const [requestUrl, setRequestUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [requestBody, setRequestBody] = useState("");
  const [headers, setHeaders] = useState<{ key: string; value: string; enabled: boolean }[]>([
    { key: "", value: "", enabled: true },
  ]);
  const [params, setParams] = useState<{ key: string; value: string; param_type: string; description: string | null; enabled: boolean }[]>([
    { key: "", value: "", param_type: "query", description: "", enabled: true },
  ]);
  // Auth state
  const [authType, setAuthType] = useState<AuthType>("none");
  const [authData, setAuthData] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBeautified, setIsBeautified] = useState(true);
  const [showNewFolderInput, setShowNewFolderInput] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [requestName, setRequestName] = useState("New Request");
  const [isEditingCollectionName, setIsEditingCollectionName] = useState(false);
  const [editedCollectionName, setEditedCollectionName] = useState("");
  const [showCollectionMenu, setShowCollectionMenu] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);


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
    loadEnvironments();
  }, []);

  // Load collection tree when collectionId changes
  useEffect(() => {
    if (collectionId) {
      loadCollectionTree();
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

  const loadEnvironments = async () => {
    try {
      const data = await api.getEnvironments();
      setEnvironments(data);
      if (data.length > 0 && !selectedEnvId) {
        setSelectedEnvId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load environments:", err);
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
  const handleDragStart = (e: React.DragEvent, requestId: string) => {
    setDraggedItemId(requestId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", requestId);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
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
    const requestId = e.dataTransfer.getData("text/plain");

    if (requestId && requestId !== targetFolderId) {
      try {
        await api.moveRequest(requestId, targetFolderId || undefined);
        await loadCollectionTree();
      } catch (err) {
        console.error("Failed to move request:", err);
      }
    }

    setDraggedItemId(null);
    setDragOverFolderId(null);
  };

  const handleRequestClick = async (requestId: string, requestName: string, requestMethod: string, requestUrl: string) => {
    const existingTab = openTabs.find((t) => t.id === requestId);
    if (!existingTab) {
      setOpenTabs([...openTabs, {
        id: requestId,
        name: requestName,
        method: requestMethod as HttpMethod,
        url: requestUrl
      }]);
    }
    setActiveTabId(requestId);
    setMethod(requestMethod as HttpMethod);
    setRequestUrl(requestUrl);
    setRequestName(requestName);
    setResponse(null);
    setError(null);

    // Load full request details
    try {
      const fullRequest = await api.getRequest(requestId);
      setCurrentRequest(fullRequest);
      setRequestBody(fullRequest.body || "");
      setHeaders(fullRequest.headers.length > 0
        ? fullRequest.headers.map(h => ({ key: h.key, value: h.value, enabled: h.enabled }))
        : [{ key: "", value: "", enabled: true }]);
      setParams(fullRequest.params.map(p => ({
        key: p.key,
        value: p.value,
        param_type: p.param_type,
        description: p.description || "",
        enabled: p.enabled
      })));
    } catch (err) {
      console.error("Failed to load request:", err);
    }
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = openTabs.filter((t) => t.id !== tabId);
    setOpenTabs(newTabs);
    if (activeTabId === tabId) {
      setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
      if (newTabs.length > 0) {
        const lastTab = newTabs[newTabs.length - 1];
        setMethod(lastTab.method);
        setRequestUrl(lastTab.url);
        setRequestName(lastTab.name);
      } else {
        setCurrentRequest(null);
        setRequestBody("");
        setHeaders([{ key: "", value: "", enabled: true }]);
        setParams([]);
      }
      setResponse(null);
      setError(null);
    }
  };

  const handleNewRequest = () => {
    // Determine a temporary ID
    const tempId = `temp-${Date.now()}`;

    const newTab: OpenTab = {
      id: tempId,
      name: "New Request",
      method: "GET",
      url: "",
      isNew: true,
    };

    setOpenTabs([...openTabs, newTab]);
    setActiveTabId(tempId);
    setCurrentRequest(null); // No backend request yet
    setMethod("GET");
    setRequestUrl("");
    setRequestName("New Request");
    setRequestBody("");
    setHeaders([{ key: "", value: "", enabled: true }]);
    setParams([{ key: "", value: "", param_type: "query", description: "", enabled: true }]);
    setResponse(null);
    setError(null);
    setAuthType("none");
    setAuthData({});
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
    if (!requestUrl.trim()) {
      setError("Please enter a URL before saving");
      return;
    }

    try {
      let savedRequest: ApiRequest | null = null;

      // Prepare data
      const headersList = headers.filter(h => h.key.trim() !== "").map(h => ({
        key: h.key,
        value: h.value,
        enabled: h.enabled
      }));

      const paramsList = params.filter(p => p.key.trim() !== "").map(p => ({
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
          requestName,
          method,
          requestUrl,
          requestBody || null,
          headersList,
          paramsList
        );
      } else if (collectionId) {
        // Create new request
        savedRequest = await api.createRequest(
          collectionId,
          requestName,
          method,
          requestUrl,
          undefined // folderId - would need to track this in state if needed
        );

        // We might also need to update headers/body for the newly created request
        // since createRequest signature might not accept everything.
        // Assuming createRequest only takes basic info based on previous signature.
        // If createRequest is minimal, we call updateRequest immediately.
        // Let's verify standard createRequest if possible, but based on prev code it was simple.
        // Actually, checking lines 292-298, createRequest takes (colId, name, method, url, folderId).
        // So we MUST update it immediately to save headers/body/params.
        if (savedRequest) {
          savedRequest = await api.updateRequest(
            savedRequest.id,
            requestName,
            method,
            requestUrl,
            requestBody || null,
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
              ? { ...t, id: savedRequest!.id, name: requestName, method, url: requestUrl, isNew: false }
              : t
          ));
          setActiveTabId(savedRequest.id);
        } else {
          // Update existing tab info
          setOpenTabs(openTabs.map(t =>
            t.id === savedRequest!.id
              ? { ...t, name: requestName, method, url: requestUrl }
              : t
          ));
        }
      }
    } catch (err) {
      console.error("Failed to save request:", err);
      setError("Failed to save request");
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleSendRequest = async () => {
    if (!requestUrl) {
      setError("Please enter a URL");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);



    try {
      const resolvedUrl = replaceEnvVariables(requestUrl);
      const resolvedBody = replaceEnvVariables(requestBody);

      const requestHeaders: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.key && h.value) {
          requestHeaders[replaceEnvVariables(h.key)] = replaceEnvVariables(h.value);
        }
      });



      if (method !== "GET" && method !== "DELETE" && resolvedBody) {
        if (!requestHeaders["Content-Type"]) {
          requestHeaders["Content-Type"] = "application/json";
        }
      }

      const res = await api.sendRequest({
        method,
        url: resolvedUrl,
        headers: requestHeaders,
        body: (method !== "GET" && method !== "DELETE") ? resolvedBody : null
      });

      setResponse({
        status: res.status,
        statusText: res.statusText,
        time: res.time,
        size: formatBytes(typeof res.size === 'number' ? res.size : parseInt(res.size)), // Handle number or string
        headers: res.headers,
        body: res.body,
      });
    } catch (err) {
      console.log(err);
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  };







  // Get tabs based on HTTP method
  const getTabsForMethod = (method: HttpMethod): string[] => {
    if (method === "GET") {
      return ["Params", "Headers", "Auth"];
    }
    return ["Params", "Body", "Headers", "Auth"];
  };

  const updateParam = (index: number, field: string, value: string | boolean) => {
    const newParams = [...params];
    newParams[index] = { ...newParams[index], [field]: value };

    // Auto-expand: if typing in the last row and it's not empty, add a new blank row
    const isLastRow = index === params.length - 1;
    const isTypingText = typeof value === "string" && value.length > 0;
    const lastRowHasContent = newParams[index].key || newParams[index].value;

    if (isLastRow && isTypingText && lastRowHasContent) {
      newParams.push({ key: "", value: "", param_type: "query", description: "", enabled: true });
    }

    setParams(newParams);
  };

  const removeParam = (index: number) => {
    // Always keep at least one row
    if (params.length > 1) {
      setParams(params.filter((_, i) => i !== index));
    } else {
      // If it's the only row, just clear it instead of removing
      setParams([{ key: "", value: "", param_type: "query", description: "", enabled: true }]);
    }
  };



  const activeTab = openTabs.find((t) => t.id === activeTabId);

  const handleCreateEnv = async (envData: { name: string; variables: { key: string; value: string; enabled: boolean }[] }) => {
    try {
      const newEnv = await api.createEnvironment(envData.name, envData.variables);
      setEnvironments([...environments, newEnv]);
      setSelectedEnvId(newEnv.id);
    } catch (err) {
      console.error("Failed to create environment:", err);
    }
  };

  const handleUpdateEnv = async (envData: { id: string; name: string; variables: { key: string; value: string; enabled: boolean }[] }) => {
    try {
      const updated = await api.updateEnvironment(envData.id, envData.name, envData.variables);
      setEnvironments(environments.map((e) => (e.id === updated.id ? updated : e)));
    } catch (err) {
      console.error("Failed to update environment:", err);
    }
  };

  const handleDeleteEnv = async (envId: string) => {
    try {
      await api.deleteEnvironment(envId);
      setEnvironments(environments.filter((e) => e.id !== envId));
      if (selectedEnvId === envId) {
        setSelectedEnvId(null);
      }
    } catch (err) {
      console.error("Failed to delete environment:", err);
    }
  };

  const replaceEnvVariables = (text: string): string => {
    if (!selectedEnvId) return text;
    const selectedEnv = environments.find((e) => e.id === selectedEnvId);
    if (!selectedEnv) return text;

    let result = text;
    selectedEnv.variables.forEach((v) => {
      if (v.enabled && v.key) {
        result = result.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, "g"), v.value);
      }
    });
    return result;
  };

  return (
    <div className="h-screen bg-slate-50 flex">
      <CollectionSidebar
        collection={currentCollection || null}
        treeItems={treeItems}
        isLoading={isDataLoading}
        activeTabId={activeTabId}
        folderOpenState={folderOpenState}
        draggedItemId={draggedItemId}
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

      <main className="flex-1 flex flex-col bg-slate-50">
        <div className="bg-white border-b border-slate-200">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-1 flex-1 overflow-x-auto">
              {openTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleRequestClick(tab.id, tab.name, tab.method, tab.url)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm border-b-2 transition-colors whitespace-nowrap ${activeTabId === tab.id
                    ? "border-blue-500 text-slate-800"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                >
                  <span className={`text-[10px] font-bold ${methodTextColors[tab.method] || "text-slate-600"}`}>
                    {tab.method}
                  </span>
                  <span>{tab.name}</span>
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="p-0.5 hover:bg-slate-200 rounded transition-colors"
                  >
                    <X size={12} className="text-slate-400" />
                  </button>
                </button>
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
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  placeholder="Request name"
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400"
                />
                {(currentRequest || (activeTabId && activeTabId.startsWith("temp-"))) && (
                  <button
                    onClick={handleSaveRequest}
                    disabled={!requestUrl.trim()}
                    className={`px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium transition-colors ${requestUrl.trim()
                      ? "text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100"
                      : "text-slate-400 cursor-not-allowed bg-slate-50"
                      }`}
                  >
                    Save
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as HttpMethod)}
                    className={`appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-blue-400 ${methodTextColors[method] || "text-slate-600"}`}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <input
                  type="text"
                  value={requestUrl}
                  onChange={(e) => setRequestUrl(e.target.value)}
                  placeholder="Enter request URL (e.g., https://api.example.com/users)"
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400"
                />

                <button
                  onClick={handleSendRequest}
                  disabled={isLoading}
                  className="px-5 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
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
                  <div className="bg-white border border-slate-200 rounded-lg flex flex-col flex-1 min-h-0 shadow-sm">
                    <div className="px-4 border-b border-slate-200 shrink-0">
                      <div className="flex gap-1">
                        {getTabsForMethod(method).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveRequestTab(tab)}
                            className={`px-3 py-2 text-sm transition-colors border-b-2 -mb-px ${activeRequestTab === tab
                              ? "text-blue-600 border-blue-500"
                              : "text-slate-500 border-transparent hover:text-slate-700"
                              }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col min-h-0 overflow-y-auto">
                      {activeRequestTab === "Params" && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-slate-700">Query Params</h4>
                          </div>
                          <div className="border border-slate-200 rounded-lg overflow-hidden shrink-0">
                            <div className="grid grid-cols-[1fr_1fr_1fr_40px] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
                              <span className="text-xs font-medium text-slate-600">Key</span>
                              <span className="text-xs font-medium text-slate-600">Value</span>
                              <span className="text-xs font-medium text-slate-600">Description</span>
                              <span></span>
                            </div>
                            {(params.length > 0 ? params : [{ key: "", value: "", param_type: "query", description: "", enabled: true }]).map((param, index) => (
                              <div key={index} className="grid grid-cols-[1fr_1fr_1fr_40px] gap-2 px-3 py-2 border-b border-slate-100 last:border-b-0">
                                <input
                                  type="text"
                                  value={param.key}
                                  onChange={(e) => updateParam(index, "key", e.target.value)}
                                  placeholder="key"
                                  className="text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
                                />
                                <input
                                  type="text"
                                  value={param.value}
                                  onChange={(e) => updateParam(index, "value", e.target.value)}
                                  placeholder="value"
                                  className="text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
                                />
                                <input
                                  type="text"
                                  value={param.description || ""}
                                  onChange={(e) => updateParam(index, "description", e.target.value)}
                                  placeholder="description"
                                  className="text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
                                />
                                <button
                                  onClick={() => removeParam(index)}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeRequestTab === "Body" && (
                        <div className="flex-1 flex flex-col min-h-0 h-full">
                          <BodyEditor
                            value={requestBody}
                            onChange={setRequestBody}
                          />
                        </div>
                      )}

                      {activeRequestTab === "Headers" && (
                        <HeadersEditor
                          headers={headers}
                          onChange={setHeaders}
                        />
                      )}

                      {activeRequestTab === "Auth" && (
                        <AuthEditor
                          authType={authType}
                          authData={authData}
                          onChange={(type, data) => {
                            setAuthType(type);
                            setAuthData(data);
                          }}
                        />
                      )}
                    </div>
                  </div>
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
                    response={response}
                    error={error}
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
    </div>
  );
}

export default CollectionWorkspace;
