"use client";

/* eslint-disable react-hooks/exhaustive-deps */

 

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

// IndexedDB database name and version
const DB_NAME = "medicforge_offline";
const DB_VERSION = 1;

// Store names
const STORES = {
  PATIENT_CONTACTS: "patient_contacts",
  CLINICAL_LOGS: "clinical_logs",
  SKILL_ATTEMPTS: "skill_attempts",
  SYNC_QUEUE: "sync_queue",
} as const;

export type SyncStatus = "pending" | "syncing" | "synced" | "failed";

export interface OfflineRecord {
  id: string;
  localId: string;
  type: keyof typeof STORES;
  data: Record<string, any>;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
  errorMessage: string | null;
  retryCount: number;
}

export interface SyncQueueItem {
  id: string;
  operation: "create" | "update" | "delete";
  table: string;
  recordId: string;
  localId: string;
  data: Record<string, any>;
  createdAt: string;
  status: SyncStatus;
  retryCount: number;
  errorMessage: string | null;
}

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Patient contacts store
      if (!db.objectStoreNames.contains(STORES.PATIENT_CONTACTS)) {
        const store = db.createObjectStore(STORES.PATIENT_CONTACTS, { keyPath: "localId" });
        store.createIndex("syncStatus", "syncStatus", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Clinical logs store
      if (!db.objectStoreNames.contains(STORES.CLINICAL_LOGS)) {
        const store = db.createObjectStore(STORES.CLINICAL_LOGS, { keyPath: "localId" });
        store.createIndex("syncStatus", "syncStatus", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Skill attempts store
      if (!db.objectStoreNames.contains(STORES.SKILL_ATTEMPTS)) {
        const store = db.createObjectStore(STORES.SKILL_ATTEMPTS, { keyPath: "localId" });
        store.createIndex("syncStatus", "syncStatus", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Sync queue store
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const store = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
};

// Hook for offline sync management
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const dbRef = useRef<IDBDatabase | null>(null);
  const { profile } = useUser();
  const supabase = createClient();

  // Initialize DB and check online status
  useEffect(() => {
    const init = async () => {
      try {
        dbRef.current = await initDB();
        await updatePendingCount();
      } catch (err) {
        console.error("Failed to initialize IndexedDB:", err);
      }
    };

    init();

    // Online/offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Back online! Syncing data...");
      syncPendingRecords();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You are offline. Data will be saved locally.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    if (!dbRef.current) return;

    try {
      const tx = dbRef.current.transaction(STORES.SYNC_QUEUE, "readonly");
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      const index = store.index("status");
      const request = index.count(IDBKeyRange.only("pending"));

      request.onsuccess = () => {
        setPendingCount(request.result);
      };
    } catch (err) {
      console.error("Failed to get pending count:", err);
    }
  }, []);

  // Add item to sync queue
  const addToSyncQueue = async (
    operation: SyncQueueItem["operation"],
    table: string,
    localId: string,
    data: Record<string, any>,
    recordId?: string
  ): Promise<void> => {
    if (!dbRef.current) return;

    const item: SyncQueueItem = {
      id: crypto.randomUUID(),
      operation,
      table,
      recordId: recordId || "",
      localId,
      data,
      createdAt: new Date().toISOString(),
      status: "pending",
      retryCount: 0,
      errorMessage: null,
    };

    const tx = dbRef.current.transaction(STORES.SYNC_QUEUE, "readwrite");
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    store.add(item);

    await updatePendingCount();
  };

  // Sync pending records
  const syncPendingRecords = async (): Promise<{ synced: number; failed: number }> => {
    if (!dbRef.current || !isOnline || !profile?.tenant_id) {
      return { synced: 0, failed: 0 };
    }

    setIsSyncing(true);
    let synced = 0;
    let failed = 0;

    try {
      const tx = dbRef.current.transaction(STORES.SYNC_QUEUE, "readonly");
      const store = tx.objectStore(STORES.SYNC_QUEUE);
      const index = store.index("status");
      const request = index.getAll(IDBKeyRange.only("pending"));

      const items = await new Promise<SyncQueueItem[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      for (const item of items) {
        try {
          await syncSingleRecord(item);
          synced++;
        } catch {
          failed++;
        }
      }

      setLastSyncTime(new Date());
      await updatePendingCount();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setIsSyncing(false);
    }

    if (synced > 0) {
      toast.success(`Synced ${synced} record${synced > 1 ? "s" : ""}`);
    }
    if (failed > 0) {
      toast.error(`${failed} record${failed > 1 ? "s" : ""} failed to sync`);
    }

    return { synced, failed };
  };

  // Sync single record
  const syncSingleRecord = async (item: SyncQueueItem): Promise<void> => {
    if (!dbRef.current || !profile?.tenant_id) {
      throw new Error("Not ready to sync");
    }

    // Update status to syncing
    const updateTx = dbRef.current.transaction(STORES.SYNC_QUEUE, "readwrite");
    const updateStore = updateTx.objectStore(STORES.SYNC_QUEUE);
    updateStore.put({ ...item, status: "syncing" });

    try {
       
      let result: { error: Error | null };

      switch (item.operation) {
        case "create":
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result = await (supabase as any)
            .from(item.table)
            .insert({
              ...item.data,
              tenant_id: profile.tenant_id,
            });
          break;

        case "update":
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result = await (supabase as any)
            .from(item.table)
            .update(item.data)
            .eq("id", item.recordId);
          break;

        case "delete":
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result = await (supabase as any)
            .from(item.table)
            .delete()
            .eq("id", item.recordId);
          break;
      }

      if (result.error) throw result.error;

      // Mark as synced and remove from queue
      const deleteTx = dbRef.current.transaction(STORES.SYNC_QUEUE, "readwrite");
      const deleteStore = deleteTx.objectStore(STORES.SYNC_QUEUE);
      deleteStore.delete(item.id);

      // Update local store status
      const localStoreName = getStoreNameForTable(item.table);
      if (localStoreName) {
        const localTx = dbRef.current.transaction(localStoreName, "readwrite");
        const localStore = localTx.objectStore(localStoreName);
        const localRecord = await new Promise<OfflineRecord | undefined>((resolve) => {
          const req = localStore.get(item.localId);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(undefined);
        });

        if (localRecord) {
          localStore.put({
            ...localRecord,
            syncStatus: "synced",
            syncedAt: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      // Mark as failed
      const failTx = dbRef.current.transaction(STORES.SYNC_QUEUE, "readwrite");
      const failStore = failTx.objectStore(STORES.SYNC_QUEUE);
      failStore.put({
        ...item,
        status: "failed",
        retryCount: item.retryCount + 1,
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      });

      throw err;
    }
  };

  // Get store name for table
  const getStoreNameForTable = (table: string): keyof typeof STORES | null => {
    switch (table) {
      case "clinical_patient_contacts":
        return "PATIENT_CONTACTS";
      case "clinical_logs":
        return "CLINICAL_LOGS";
      case "skill_attempts":
        return "SKILL_ATTEMPTS";
      default:
        return null;
    }
  };

  // Retry failed syncs
  const retryFailedSyncs = async (): Promise<void> => {
    if (!dbRef.current) return;

    const tx = dbRef.current.transaction(STORES.SYNC_QUEUE, "readwrite");
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const index = store.index("status");
    const request = index.getAll(IDBKeyRange.only("failed"));

    const items = await new Promise<SyncQueueItem[]>((resolve) => {
      request.onsuccess = () => resolve(request.result);
    });

    for (const item of items) {
      if (item.retryCount < 3) {
        store.put({ ...item, status: "pending" });
      }
    }

    await updatePendingCount();
    await syncPendingRecords();
  };

  // Clear all offline data
  const clearOfflineData = async (): Promise<void> => {
    if (!dbRef.current) return;

    for (const storeName of Object.values(STORES)) {
      const tx = dbRef.current.transaction(storeName, "readwrite");
      tx.objectStore(storeName).clear();
    }

    await updatePendingCount();
    toast.success("Offline data cleared");
  };

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncPendingRecords,
    retryFailedSyncs,
    clearOfflineData,
    addToSyncQueue,
    db: dbRef.current,
  };
}

// Hook for offline patient contacts
export function useOfflinePatientContacts() {
  const [contacts, setContacts] = useState<OfflineRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isOnline, addToSyncQueue, db } = useOfflineSync();
  const { profile } = useUser();
  const supabase = createClient();

  // Load contacts from IndexedDB
  const loadLocalContacts = useCallback(async () => {
    if (!db) return;

    try {
      setIsLoading(true);
      const tx = db.transaction(STORES.PATIENT_CONTACTS, "readonly");
      const store = tx.objectStore(STORES.PATIENT_CONTACTS);
      const request = store.getAll();

      const localContacts = await new Promise<OfflineRecord[]>((resolve) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      });

      setContacts(localContacts.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (err) {
      console.error("Failed to load local contacts:", err);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    loadLocalContacts();
  }, [loadLocalContacts]);

  // Save contact (works offline)
  const saveContact = async (data: Record<string, any>): Promise<OfflineRecord | null> => {
    if (!db || !profile?.tenant_id || !profile?.id) {
      toast.error("Unable to save contact");
      return null;
    }

    const localId = crypto.randomUUID();
    const record: OfflineRecord = {
      id: "",
      localId,
      type: "PATIENT_CONTACTS",
      data: {
        ...data,
        student_id: profile.id,
        tenant_id: profile.tenant_id,
      },
      syncStatus: isOnline ? "pending" : "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncedAt: null,
      errorMessage: null,
      retryCount: 0,
    };

    try {
      // Save to IndexedDB
      const tx = db.transaction(STORES.PATIENT_CONTACTS, "readwrite");
      const store = tx.objectStore(STORES.PATIENT_CONTACTS);
      store.add(record);

      // Add to sync queue
      await addToSyncQueue("create", "clinical_patient_contacts", localId, data);

      setContacts((prev) => [record, ...prev]);

      if (isOnline) {
        toast.success("Patient contact saved and syncing...");
      } else {
        toast.success("Patient contact saved locally. Will sync when online.");
      }

      return record;
    } catch (err) {
      console.error("Failed to save contact:", err);
      toast.error("Failed to save contact");
      return null;
    }
  };

  // Update contact
  const updateContact = async (
    localId: string,
    updates: Record<string, any>
  ): Promise<boolean> => {
    if (!db) return false;

    try {
      const tx = db.transaction(STORES.PATIENT_CONTACTS, "readwrite");
      const store = tx.objectStore(STORES.PATIENT_CONTACTS);
      const existing = await new Promise<OfflineRecord | undefined>((resolve) => {
        const req = store.get(localId);
        req.onsuccess = () => resolve(req.result);
      });

      if (!existing) return false;

      const updated: OfflineRecord = {
        ...existing,
        data: { ...existing.data, ...updates },
        updatedAt: new Date().toISOString(),
        syncStatus: "pending",
      };

      store.put(updated);

      // Add to sync queue if we have a server ID
      if (existing.id) {
        await addToSyncQueue("update", "clinical_patient_contacts", localId, updates, existing.id);
      }

      setContacts((prev) => prev.map((c) => (c.localId === localId ? updated : c)));
      toast.success("Contact updated");
      return true;
    } catch (err) {
      toast.error("Failed to update contact");
      return false;
    }
  };

  // Delete contact
  const deleteContact = async (localId: string): Promise<boolean> => {
    if (!db) return false;

    try {
      const tx = db.transaction(STORES.PATIENT_CONTACTS, "readwrite");
      const store = tx.objectStore(STORES.PATIENT_CONTACTS);
      const existing = await new Promise<OfflineRecord | undefined>((resolve) => {
        const req = store.get(localId);
        req.onsuccess = () => resolve(req.result);
      });

      store.delete(localId);

      // Add to sync queue if synced to server
      if (existing?.id) {
        await addToSyncQueue("delete", "clinical_patient_contacts", localId, {}, existing.id);
      }

      setContacts((prev) => prev.filter((c) => c.localId !== localId));
      toast.success("Contact deleted");
      return true;
    } catch (err) {
      toast.error("Failed to delete contact");
      return false;
    }
  };

  // Sync contacts from server
  const syncFromServer = async (): Promise<void> => {
    if (!isOnline || !profile?.tenant_id || !profile?.id || !db) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("clinical_patient_contacts")
        .select("*")
        .eq("student_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Merge with local data
      const tx = db.transaction(STORES.PATIENT_CONTACTS, "readwrite");
      const store = tx.objectStore(STORES.PATIENT_CONTACTS);

      for (const serverRecord of data || []) {
        // Check if exists locally
        const localRecord = contacts.find((c) => c.id === serverRecord.id);

        if (!localRecord) {
          // Add server record to local
          const record: OfflineRecord = {
            id: serverRecord.id,
            localId: serverRecord.id,
            type: "PATIENT_CONTACTS",
            data: serverRecord,
            syncStatus: "synced",
            createdAt: serverRecord.created_at,
            updatedAt: serverRecord.updated_at || serverRecord.created_at,
            syncedAt: new Date().toISOString(),
            errorMessage: null,
            retryCount: 0,
          };
          store.put(record);
        }
      }

      await loadLocalContacts();
    } catch (err) {
      console.error("Failed to sync from server:", err);
    }
  };

  // Stats
  const pendingContacts = contacts.filter((c) => c.syncStatus === "pending");
  const syncedContacts = contacts.filter((c) => c.syncStatus === "synced");
  const failedContacts = contacts.filter((c) => c.syncStatus === "failed");

  return {
    contacts,
    pendingContacts,
    syncedContacts,
    failedContacts,
    isLoading,
    saveContact,
    updateContact,
    deleteContact,
    syncFromServer,
    refetch: loadLocalContacts,
  };
}

// Hook for checking offline capability
export function useOfflineCapability() {
  const [isSupported, setIsSupported] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState<{
    usage: number;
    quota: number;
    percentage: number;
  } | null>(null);

  useEffect(() => {
    // Check IndexedDB support
    setIsSupported("indexedDB" in window);

    // Get storage estimate
    const getStorageEstimate = async () => {
      if ("storage" in navigator && "estimate" in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        setStorageEstimate({
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          percentage: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0,
        });
      }
    };

    getStorageEstimate();
  }, []);

  // Request persistent storage
  const requestPersistentStorage = async (): Promise<boolean> => {
    if ("storage" in navigator && "persist" in navigator.storage) {
      const isPersisted = await navigator.storage.persist();
      if (isPersisted) {
        toast.success("Persistent storage enabled");
      }
      return isPersisted;
    }
    return false;
  };

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return {
    isSupported,
    storageEstimate,
    storageUsed: storageEstimate ? formatBytes(storageEstimate.usage) : null,
    storageQuota: storageEstimate ? formatBytes(storageEstimate.quota) : null,
    requestPersistentStorage,
  };
}
