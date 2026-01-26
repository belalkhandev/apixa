import { invoke } from "@tauri-apps/api/core";

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
  created_at: string;
  updated_at: string;
}

export interface EnvironmentVariable {
  id: string;
  environment_id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface Folder {
  id: string;
  collection_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Request {
  id: string;
  collection_id: string;
  folder_id: string | null;
  name: string;
  method: string;
  url: string;
  body: string | null;
  body_type: string | null;
  auth_type: string | null;
  auth_data: string | null;
  extract_rules: string | null;
  headers: RequestHeader[];
  params: RequestParam[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RequestHeader {
  id: string;
  request_id: string;
  key: string;
  value: string;
  enabled: boolean;
  carry_forward: boolean;
}

export interface RequestParam {
  id: string;
  request_id: string;
  key: string;
  value: string;
  param_type: string;
  description: string | null;
  enabled: boolean;
  carry_forward: boolean;
}

export interface FolderWithItems {
  id: string;
  name: string;
  sort_order: number;
  items: TreeItem[];
}

export interface RequestSummary {
  id: string;
  name: string;
  method: string;
  url: string;
  sort_order: number;
}

export interface ResponseData {
  status: number;
  statusText: string;
  time: number;
  size: string;
  headers: Record<string, string>;
  body: string;
}

export type TreeItem =
  | { type: "Folder" } & FolderWithItems
  | { type: "Request" } & RequestSummary;

export const api = {
  getCollections: () => invoke<Collection[]>("get_collections"),

  createCollection: (name: string, description?: string) =>
    invoke<Collection>("create_collection", {
      input: { name, description: description || null },
    }),

  updateCollection: (id: string, name: string, description?: string) =>
    invoke<Collection>("update_collection", {
      input: { id, name, description: description || null },
    }),

  deleteCollection: (id: string) =>
    invoke<void>("delete_collection", { id }),

  getEnvironments: () => invoke<Environment[]>("get_environments"),

  createEnvironment: (name: string, variables: { key: string; value: string; enabled: boolean }[]) =>
    invoke<Environment>("create_environment", {
      input: { name, variables },
    }),

  updateEnvironment: (id: string, name: string, variables: { key: string; value: string; enabled: boolean }[]) =>
    invoke<Environment>("update_environment", {
      input: { id, name, variables },
    }),

  deleteEnvironment: (id: string) =>
    invoke<void>("delete_environment", { id }),

  getCollectionTree: (collectionId: string) =>
    invoke<TreeItem[]>("get_collection_tree", { collectionId }),

  createFolder: (collectionId: string, name: string, parentId?: string) =>
    invoke<Folder>("create_folder", {
      input: { collection_id: collectionId, parent_id: parentId || null, name },
    }),

  deleteFolder: (id: string) =>
    invoke<void>("delete_folder", { id }),

  createRequest: (collectionId: string, name: string, method: string, url: string, folderId?: string) =>
    invoke<Request>("create_request", {
      input: {
        collection_id: collectionId,
        folder_id: folderId || null,
        name,
        method,
        url,
      },
    }),

  getRequest: (id: string) => invoke<Request>("get_request", { id }),

  updateRequest: (
    id: string,
    name: string,
    method: string,
    url: string,
    body: string | null,
    body_type: string | null,
    auth_type: string | null,
    auth_data: string | null,
    extract_rules: string | null,
    headers: { key: string; value: string; enabled: boolean; carry_forward: boolean }[],
    params: { key: string; value: string; param_type: string; description: string | null; enabled: boolean; carry_forward: boolean }[]
  ) =>
    invoke<Request>("update_request", {
      input: {
        id,
        name,
        method,
        url,
        body,
        body_type,
        auth_type,
        auth_data,
        extract_rules,
        headers,
        params,
      },
    }),

  deleteRequest: (id: string) =>
    invoke<void>("delete_request", { id }),

  moveRequest: (requestId: string, targetFolderId?: string, targetCollectionId?: string, beforeId?: string, afterId?: string) =>
    invoke<void>("move_request", {
      requestId,
      targetFolderId: targetFolderId || null,
      targetCollectionId: targetCollectionId || null,
      beforeId: beforeId || null,
      afterId: afterId || null,
    }),

  moveFolder: (folderId: string, targetParentId?: string, beforeId?: string, afterId?: string) =>
    invoke<void>("move_folder", {
      folderId,
      targetParentId: targetParentId || null,
      beforeId: beforeId || null,
      afterId: afterId || null,
    }),

  sendRequest: (request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: string | null;
    body_type: string | null;
    form_data: { key: string; value: string; type: "text" | "file"; enabled: boolean }[] | null;
  }) =>
    invoke<ResponseData>("send_http_request", { request }),

  startLoadTest: (config: LoadTestConfig) =>
    invoke<void>("start_load_test", { config }),

  stopLoadTest: () =>
    invoke<void>("stop_load_test"),

  exportCollection: (collectionId: string) =>
    invoke<string>("export_collection", { collectionId }),

  exportAllCollections: () =>
    invoke<string>("export_all_collections"),

  // ==================== Notes ====================

  getNotes: () => invoke<Note[]>("get_notes"),

  createNote: (title: string, content?: string) =>
    invoke<Note>("create_note", {
      input: { title, content: content || null },
    }),

  updateNote: (id: string, title: string, content?: string) =>
    invoke<Note>("update_note", {
      input: { id, title, content: content || null },
    }),

  deleteNote: (id: string) =>
    invoke<void>("delete_note", { id }),

  toggleNotePin: (id: string, isPinned: boolean) =>
    invoke<Note>("toggle_note_pin", { id, isPinned }),

  // ==================== Projects ====================

  getProjects: () => invoke<Project[]>("get_projects"),

  createProject: (name: string, color?: string) =>
    invoke<Project>("create_project", {
      input: { name, color: color || null },
    }),

  updateProject: (id: string, name: string, color: string) =>
    invoke<Project>("update_project", {
      input: { id, name, color },
    }),

  deleteProject: (id: string) =>
    invoke<void>("delete_project", { id }),

  // ==================== Todos ====================

  getTodos: () => invoke<Todo[]>("get_todos"),

  createTodo: (input: {
    title: string;
    priority: string;
    description?: string;
    dueDate?: string;
    projectId?: string;
    startDate?: string;
    endDate?: string;
    isChallenge?: boolean;
    challengeDurationMinutes?: number;
  }) =>
    invoke<Todo>("create_todo", {
      input: {
        title: input.title,
        description: input.description || null,
        priority: input.priority,
        due_date: input.dueDate || null,
        project_id: input.projectId || null,
        start_date: input.startDate || null,
        end_date: input.endDate || null,
        is_challenge: input.isChallenge || null,
        challenge_duration_minutes: input.challengeDurationMinutes || null,
      },
    }),

  updateTodo: (input: {
    id: string;
    title: string;
    status: string;
    priority: string;
    description?: string;
    dueDate?: string;
    projectId?: string;
    startDate?: string;
    endDate?: string;
    isChallenge?: boolean;
    challengeDurationMinutes?: number;
  }) =>
    invoke<Todo>("update_todo", {
      input: {
        id: input.id,
        title: input.title,
        description: input.description || null,
        status: input.status,
        priority: input.priority,
        due_date: input.dueDate || null,
        project_id: input.projectId || null,
        start_date: input.startDate || null,
        end_date: input.endDate || null,
        is_challenge: input.isChallenge || null,
        challenge_duration_minutes: input.challengeDurationMinutes || null,
      },
    }),

  deleteTodo: (id: string) =>
    invoke<void>("delete_todo", { id }),

  updateTodoStatus: (id: string, status: string) =>
    invoke<Todo>("update_todo_status", { id, status }),

  updateChallengeTimer: (
    id: string,
    challengeElapsedSeconds: number,
    challengeStartedAt: string | null,
    challengeIsPaused: boolean
  ) =>
    invoke<Todo>("update_challenge_timer", {
      input: {
        id,
        challenge_elapsed_seconds: challengeElapsedSeconds,
        challenge_started_at: challengeStartedAt,
        challenge_is_paused: challengeIsPaused,
      },
    }),

  reorderTodos: (todoId: string, targetStatus: string, newOrder: string[]) =>
    invoke<void>("reorder_todos", {
      input: {
        todo_id: todoId,
        target_status: targetStatus,
        new_order: newOrder,
      },
    }),
};

export interface LoadTestConfig {
  collection_id: string;
  environment_id: string | null;
  concurrent_users: number;
  duration_seconds: number | null;
  loop_count: number | null;
  delay_ms: number;
}

export interface RecordedRequest {
  name: string;
  method: string;
  url: string;
  status: number;
  latency_ms: number;
  error: string | null;
  error_category: string | null;
  bytes_sent: number;
  bytes_received: number;
}

export interface HistogramBucket {
  range_start: number;
  range_end: number;
  count: number;
}

export interface LoadTestProgress {
  elapsed_seconds: number;
  completed_requests: number;
  successful_requests: number;
  failed_requests: number;
  current_rps: number;
  avg_latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;
  p50_latency_ms: number;
  p90_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  bytes_sent: number;
  bytes_received: number;
  error_categories: Record<string, number>;
  latency_histogram: HistogramBucket[];
  is_finished: boolean;
  recent_results: RecordedRequest[];
}

// ==================== Notes ====================

export interface Note {
  id: string;
  title: string;
  content: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

// ==================== Projects ====================

export interface Project {
  id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

// ==================== Todos ====================

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  project_id: string | null;
  start_date: string | null;
  end_date: string | null;
  is_challenge: boolean;
  challenge_duration_minutes: number | null;
  challenge_elapsed_seconds: number;
  challenge_started_at: string | null;
  challenge_is_paused: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
