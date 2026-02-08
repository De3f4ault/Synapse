/**
 * Artifacts API Hooks
 *
 * React Query hooks for artifacts CRUD operations.
 * 
 * INVARIANT: All API calls require authentication.
 * INVARIANT: Optimistic updates for better UX.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { request } from '@/api/generated/core/request';
import { OpenAPI } from '@/api/generated/core/OpenAPI';
import type { ArtifactBlock } from '@/shared/rendering/schema';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ArtifactResponse {
    id: string;
    slug: string;
    session_id: number | null;
    message_id: number | null;
    type: string;
    title: string;
    content: string;
    language: string | null;
    filename: string | null;
    version: number;
    state: string;
    created_at: string;
    updated_at: string;
}

export interface CreateArtifactRequest {
    session_id?: number;
    message_id?: number;
    type: string;
    title: string;
    content: string;
    language?: string;
    filename?: string;
}

export interface UpdateArtifactRequest {
    title?: string;
    content?: string;
}

export interface StorageItem {
    key: string;
    value: string | null;
    shared: boolean;
}

// -----------------------------------------------------------------------------
// Query Keys
// -----------------------------------------------------------------------------

export const artifactKeys = {
    all: ['artifacts'] as const,
    lists: () => [...artifactKeys.all, 'list'] as const,
    list: (sessionId?: number) => [...artifactKeys.lists(), { sessionId }] as const,
    details: () => [...artifactKeys.all, 'detail'] as const,
    detail: (id: string) => [...artifactKeys.details(), id] as const,
    versions: (id: string) => [...artifactKeys.detail(id), 'versions'] as const,
    storage: (id: string, key: string) => [...artifactKeys.detail(id), 'storage', key] as const,
};

// -----------------------------------------------------------------------------
// Hooks
// -----------------------------------------------------------------------------

/**
 * List artifacts, optionally filtered by session.
 */
export function useArtifacts(sessionId?: number) {
    return useQuery({
        queryKey: artifactKeys.list(sessionId),
        queryFn: () => request<ArtifactResponse[]>(OpenAPI, {
            method: 'GET',
            url: '/api/v1/artifacts',
            query: sessionId ? { session_id: sessionId } : undefined,
        }),
    });
}

/**
 * Get a single artifact by ID.
 */
export function useArtifact(id: string) {
    return useQuery({
        queryKey: artifactKeys.detail(id),
        queryFn: () => request<ArtifactResponse>(OpenAPI, {
            method: 'GET',
            url: '/api/v1/artifacts/{artifact_id}',
            path: { artifact_id: id },
        }),
        enabled: !!id,
    });
}

/**
 * Create a new artifact.
 */
export function useCreateArtifact() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (data: CreateArtifactRequest) => request<ArtifactResponse>(OpenAPI, {
            method: 'POST',
            url: '/api/v1/artifacts',
            body: data,
        }),
        onSuccess: (newArtifact) => {
            queryClient.invalidateQueries({ queryKey: artifactKeys.lists() });
            queryClient.setQueryData(artifactKeys.detail(newArtifact.id), newArtifact);
        },
    });
}

/**
 * Update an artifact.
 */
export function useUpdateArtifact() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateArtifactRequest }) => 
            request<ArtifactResponse>(OpenAPI, {
                method: 'PATCH',
                url: '/api/v1/artifacts/{artifact_id}',
                path: { artifact_id: id },
                body: data,
            }),
        onSuccess: (updatedArtifact) => {
            queryClient.setQueryData(artifactKeys.detail(updatedArtifact.id), updatedArtifact);
            queryClient.invalidateQueries({ queryKey: artifactKeys.lists() });
        },
    });
}

/**
 * Delete an artifact.
 */
export function useDeleteArtifact() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (id: string) => request<void>(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/artifacts/{artifact_id}',
            path: { artifact_id: id },
        }),
        onSuccess: (_, deletedId) => {
            queryClient.removeQueries({ queryKey: artifactKeys.detail(deletedId) });
            queryClient.invalidateQueries({ queryKey: artifactKeys.lists() });
        },
    });
}

/**
 * Get artifact version history.
 */
export function useArtifactVersions(artifactId: string) {
    return useQuery({
        queryKey: artifactKeys.versions(artifactId),
        queryFn: () => request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/artifacts/{artifact_id}/versions',
            path: { artifact_id: artifactId },
        }),
        enabled: !!artifactId,
    });
}

/**
 * Get a storage value for an artifact.
 */
export function useArtifactStorage(artifactId: string, key: string, shared = false) {
    return useQuery({
        queryKey: artifactKeys.storage(artifactId, key),
        queryFn: () => request<StorageItem>(OpenAPI, {
            method: 'GET',
            url: '/api/v1/artifacts/{artifact_id}/storage/{key}',
            path: { artifact_id: artifactId, key },
            query: { shared },
        }),
        enabled: !!artifactId && !!key,
    });
}

/**
 * Set a storage value for an artifact.
 */
export function useSetArtifactStorage() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({
            artifactId,
            key,
            value,
            shared = false,
        }: {
            artifactId: string;
            key: string;
            value: string;
            shared?: boolean;
        }) => request<StorageItem>(OpenAPI, {
            method: 'POST',
            url: '/api/v1/artifacts/{artifact_id}/storage',
            path: { artifact_id: artifactId },
            body: { key, value, shared },
        }),
        onSuccess: (data, variables) => {
            queryClient.setQueryData(
                artifactKeys.storage(variables.artifactId, variables.key),
                data
            );
        },
    });
}

/**
 * Convert an ArtifactBlock (frontend) to CreateArtifactRequest (backend).
 */
export function artifactBlockToRequest(
    block: ArtifactBlock,
    sessionId?: number,
    messageId?: number
): CreateArtifactRequest {
    return {
        session_id: sessionId,
        message_id: messageId,
        type: block.artifactType,
        title: block.title,
        content: block.content,
        language: block.language,
        filename: block.filename,
    };
}
