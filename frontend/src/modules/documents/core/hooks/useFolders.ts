/**
 * useFolders Hook
 * 
 * TanStack Query hooks for folder CRUD operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getAuthToken } from '@/api/client';
import type { 
  Folder, 
  FolderTreeNode, 
  CreateFolderRequest, 
  UpdateFolderRequest, 
  MoveFolderRequest 
} from '../types/folder.types';

const API_BASE = '/api/v1/documents/folders';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// =============================================================================
// Query Keys
// =============================================================================

export const folderKeys = {
  all: ['folders'] as const,
  tree: () => [...folderKeys.all, 'tree'] as const,
  flat: () => [...folderKeys.all, 'flat'] as const,
  subtree: (parentId: number | null) => [...folderKeys.all, 'subtree', parentId] as const,
  detail: (id: number) => [...folderKeys.all, 'detail', id] as const,
};

// =============================================================================
// API Functions
// =============================================================================

async function fetchFolderTree(): Promise<FolderTreeNode[]> {
  const { data } = await axios.get<FolderTreeNode[]>(API_BASE, {
    headers: getAuthHeaders(),
  });
  return data;
}

async function fetchFoldersFlat(): Promise<Folder[]> {
  const { data } = await axios.get<Folder[]>(`${API_BASE}?flat=true`, {
    headers: getAuthHeaders(),
  });
  return data;
}

// Fetch direct children of a folder (for explorer view)
async function fetchFolderSubtree(parentId: number | null): Promise<FolderTreeNode[]> {
  // Use the tree endpoint but filter client-side or assume backend supports query param?
  // Current backend returns full tree. For now, let's fetch full tree and filter.
  // Ideally backend should support GET /folders?parent_id=X
  const { data } = await axios.get<FolderTreeNode[]>(API_BASE, {
    headers: getAuthHeaders(),
  });
  
  const findChildren = (nodes: FolderTreeNode[], pid: number | null): FolderTreeNode[] => {
    if (pid === null) {
      // Root level folders
      return nodes.filter(n => n.parent_id === null);
    }
    
    for (const node of nodes) {
      if (node.id === pid) return node.children || [];
      if (node.children) {
        const found = findChildren(node.children, pid);
        if (found.length > 0) return found;
      }
    }
    return [];
  };

  return findChildren(data, parentId);
}

async function createFolder(request: CreateFolderRequest): Promise<Folder> {
  const { data } = await axios.post<Folder>(API_BASE, request, {
    headers: getAuthHeaders(),
  });
  return data;
}

async function updateFolder(id: number, request: UpdateFolderRequest): Promise<Folder> {
  const { data } = await axios.patch<Folder>(`${API_BASE}/${id}`, request, {
    headers: getAuthHeaders(),
  });
  return data;
}

async function moveFolder(id: number, request: MoveFolderRequest): Promise<Folder> {
  const { data } = await axios.post<Folder>(`${API_BASE}/${id}/move`, request, {
    headers: getAuthHeaders(),
  });
  return data;
}

async function deleteFolder(id: number, strategy: 'promote' | 'inbox' = 'promote'): Promise<void> {
  await axios.delete(`${API_BASE}/${id}?strategy=${strategy}`, {
    headers: getAuthHeaders(),
  });
}

async function seedDefaultFolders(): Promise<Folder[]> {
  const { data } = await axios.post<Folder[]>(`${API_BASE}/seed-defaults`, {}, {
    headers: getAuthHeaders(),
  });
  return data;
}

// =============================================================================
// Query Hooks
// =============================================================================

export function useFolderTree() {
  return useQuery({
    queryKey: folderKeys.tree(),
    queryFn: fetchFolderTree,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useFoldersFlat() {
  return useQuery({
    queryKey: folderKeys.flat(),
    queryFn: fetchFoldersFlat,
    staleTime: 1000 * 60 * 5,
  });
}

export function useFolderSubtree(parentId: number | null) {
  return useQuery({
    queryKey: folderKeys.subtree(parentId),
    queryFn: () => fetchFolderSubtree(parentId),
    staleTime: 1000 * 60 * 1, // 1 minute
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

export function useCreateFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...request }: UpdateFolderRequest & { id: number }) => 
      updateFolder(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
    },
  });
}

export function useMoveFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...request }: MoveFolderRequest & { id: number }) => 
      moveFolder(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, strategy }: { id: number; strategy?: 'promote' | 'inbox' }) =>
      deleteFolder(id, strategy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
    },
  });
}

export function useSeedDefaultFolders() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: seedDefaultFolders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.all });
    },
  });
}
