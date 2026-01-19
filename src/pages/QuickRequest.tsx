import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, Environment } from "../api";
import SaveToCollectionModal from "../components/SaveToCollectionModal";
import RequestHeader from "../components/request/RequestHeader";
import RequestUrlBar from "../components/request/RequestUrlBar";
import RequestConfigTabs from "../components/request/RequestConfigTabs";
import ResponseViewer from "../components/request/ResponseViewer";
import { Header } from "../components/shared/HeadersEditor";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ResponseData {
  status: number;
  statusText: string;
  time: number;
  size: string;
  headers: Record<string, string>;
  body: string;
}

function QuickRequest() {
  const navigate = useNavigate();

  // Request state
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("");
  const [requestName, setRequestName] = useState("New Request");
  const [requestBody, setRequestBody] = useState("");
  const [headers, setHeaders] = useState<Header[]>([{ key: "", value: "", enabled: true }]);

  // Response state
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBeautified, setIsBeautified] = useState(true);

  // Modal state
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Environment state
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);

  useEffect(() => {
    loadEnvironments();
  }, []);

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

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleSendRequest = async () => {
    if (!url) {
      setError("Please enter a URL");
      return;
    }

    setIsSending(true);
    setError(null);
    setResponse(null);

    const startTime = performance.now();

    try {
      // Apply environment variables
      const processedUrl = replaceEnvVariables(url);
      const processedBody = replaceEnvVariables(requestBody);

      const requestHeaders: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.key && h.value && h.enabled) {
          requestHeaders[replaceEnvVariables(h.key)] = replaceEnvVariables(h.value);
        }
      });

      const fetchOptions: RequestInit = {
        method,
        headers: requestHeaders,
      };

      if (method !== "GET" && method !== "DELETE" && processedBody) {
        fetchOptions.body = processedBody;
        if (!requestHeaders["Content-Type"]) {
          requestHeaders["Content-Type"] = "application/json";
        }
      }

      const res = await fetch(processedUrl, fetchOptions);
      const endTime = performance.now();

      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const bodyText = await res.text();

      setResponse({
        status: res.status,
        statusText: res.statusText,
        time: Math.round(endTime - startTime),
        size: formatBytes(new Blob([bodyText]).size),
        headers: responseHeaders,
        body: bodyText,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveToCollection = async (collectionId: string) => {
    try {
      const name = requestName || "New Request";
      const newRequest = await api.createRequest(collectionId, name, method, url);

      const filteredHeaders = headers.filter((h) => h.key.trim() !== "");
      if (requestBody || filteredHeaders.length > 0) {
        await api.updateRequest(
          newRequest.id,
          name,
          method,
          url,
          requestBody || null,
          filteredHeaders.map((h) => ({ key: h.key, value: h.value, enabled: h.enabled })),
          []
        );
      }

      setShowSaveModal(false);
      navigate(`/collection/${collectionId}`);
    } catch (err) {
      console.error("Failed to save request:", err);
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <RequestHeader
        requestName={requestName}
        onRequestNameChange={setRequestName}
        environments={environments}
        selectedEnvId={selectedEnvId}
        onSelectEnv={setSelectedEnvId}
        onCreateEnv={handleCreateEnv}
        onUpdateEnv={handleUpdateEnv}
        onDeleteEnv={handleDeleteEnv}
        onSave={() => setShowSaveModal(true)}
        onBack={() => navigate("/")}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6">
          {/* URL Bar */}
          <RequestUrlBar
            method={method}
            url={url}
            onMethodChange={setMethod}
            onUrlChange={setUrl}
            onSend={handleSendRequest}
            isSending={isSending}
          />

          {/* Request Config */}
          <RequestConfigTabs
            body={requestBody}
            onBodyChange={setRequestBody}
            headers={headers}
            onHeadersChange={setHeaders}
          />

          {/* Response */}
          <ResponseViewer
            response={response}
            error={error}
            isBeautified={isBeautified}
            onToggleBeautify={() => setIsBeautified(!isBeautified)}
          />
        </div>
      </div>

      {/* Save to Collection Modal */}
      <SaveToCollectionModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveToCollection}
        requestName={requestName}
      />
    </div>
  );
}

export default QuickRequest;
