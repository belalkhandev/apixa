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
}

export interface RequestParam {
  id: string;
  request_id: string;
  key: string;
  value: string;
  param_type: string;
  description: string | null;
  enabled: boolean;
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
    headers: { key: string; value: string; enabled: boolean }[],
    params: { key: string; value: string; param_type: string; description: string | null; enabled: boolean }[]
  ) =>
    invoke<Request>("update_request", {
      input: { id, name, method, url, body, headers, params },
    }),

  deleteRequest: (id: string) =>
    invoke<void>("delete_request", { id }),

  moveRequest: (requestId: string, targetFolderId?: string, targetCollectionId?: string) =>
    invoke<void>("move_request", {
      requestId,
      targetFolderId: targetFolderId || null,
      targetCollectionId: targetCollectionId || null,
    }),

  moveFolder: (folderId: string, targetParentId?: string) =>
    invoke<void>("move_folder", {
      folderId,
      targetParentId: targetParentId || null,
    }),

  sendRequest: (request: { method: string; url: string; headers: Record<string, string>; body: string | null }) =>
    invoke<ResponseData>("send_http_request", { request }),
};
