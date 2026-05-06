import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";

// Global cache to store watchlist status and prevent duplicate requests
const watchlistCache = new Map<string, boolean>();
const pendingRequests = new Map<string, Promise<boolean>>();

// Batch request queue for efficient bulk loading
let batchQueue: string[] = [];
let batchTimeout: ReturnType<typeof setTimeout> | null = null;
const batchCallbacks = new Map<string, ((inList: boolean) => void)[]>();

async function fetchBatch(subjectIds: string[]): Promise<Map<string, boolean>> {
  // For now, we'll fetch individually but deduplicate
  // In a real implementation, the API would support batch endpoints
  const results = new Map<string, boolean>();
  
  await Promise.allSettled(
    subjectIds.map(async (id) => {
      try {
        const response = await apiGet(`user/watchlist/${id}`);
        const data = await response.json() as { inWatchlist: boolean };
        results.set(id, data.inWatchlist);
        watchlistCache.set(id, data.inWatchlist);
      } catch {
        results.set(id, false);
      }
    })
  );
  
  return results;
}

function queueBatchRequest(subjectId: string, callback: (inList: boolean) => void) {
  // Add to queue
  if (!batchQueue.includes(subjectId)) {
    batchQueue.push(subjectId);
  }
  
  // Add callback
  const callbacks = batchCallbacks.get(subjectId) ?? [];
  callbacks.push(callback);
  batchCallbacks.set(subjectId, callbacks);
  
  // Clear existing timeout and set a new one
  if (batchTimeout) clearTimeout(batchTimeout);
  
  batchTimeout = setTimeout(async () => {
    const idsToFetch = [...batchQueue];
    batchQueue = [];
    
    const results = await fetchBatch(idsToFetch);
    
    // Call all callbacks with results
    for (const id of idsToFetch) {
      const inList = results.get(id) ?? false;
      const cbs = batchCallbacks.get(id) ?? [];
      cbs.forEach(cb => cb(inList));
      batchCallbacks.delete(id);
    }
  }, 50); // Batch requests within 50ms window
}

export function useWatchlistStatus(subjectId: string) {
  const { user } = useAuth();
  const [inList, setInList] = useState(() => watchlistCache.get(subjectId) ?? false);

  useEffect(() => {
    if (!user || !subjectId) {
      setInList(false);
      return;
    }

    // Check cache first
    if (watchlistCache.has(subjectId)) {
      setInList(watchlistCache.get(subjectId)!);
      return;
    }

    // Check if there's already a pending request
    const pending = pendingRequests.get(subjectId);
    if (pending) {
      pending.then(result => setInList(result));
      return;
    }

    // Queue batch request
    queueBatchRequest(subjectId, (result) => {
      setInList(result);
    });
  }, [user, subjectId]);

  // Update cache when status changes
  const updateInList = useCallback((value: boolean) => {
    watchlistCache.set(subjectId, value);
    setInList(value);
  }, [subjectId]);

  return { inList, setInList: updateInList };
}

// Clear cache (useful for logout)
export function clearWatchlistCache() {
  watchlistCache.clear();
  pendingRequests.clear();
}
