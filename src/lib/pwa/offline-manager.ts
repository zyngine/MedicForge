"use client";

import * as React from "react";

// Offline data store using IndexedDB
const DB_NAME = "medicforge-offline";
const DB_VERSION = 1;

interface OfflineStore {
  submissions: Array<{
    id: string;
    assignmentId: string;
    content: unknown;
    timestamp: number;
    synced: boolean;
  }>;
  patientContacts: Array<{
    id: string;
    data: unknown;
    timestamp: number;
    synced: boolean;
  }>;
  lessonProgress: Array<{
    lessonId: string;
    progress: number;
    timestamp: number;
    synced: boolean;
  }>;
}

// Initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object stores
      if (!db.objectStoreNames.contains("submissions")) {
        const store = db.createObjectStore("submissions", { keyPath: "id" });
        store.createIndex("synced", "synced", { unique: false });
      }

      if (!db.objectStoreNames.contains("patientContacts")) {
        const store = db.createObjectStore("patientContacts", { keyPath: "id" });
        store.createIndex("synced", "synced", { unique: false });
      }

      if (!db.objectStoreNames.contains("lessonProgress")) {
        const store = db.createObjectStore("lessonProgress", { keyPath: "lessonId" });
        store.createIndex("synced", "synced", { unique: false });
      }

      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache", { keyPath: "key" });
      }
    };
  });
}

// Generic store operations
async function addToStore<T>(storeName: string, data: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put(data);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function getFromStore<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getUnsyncedFromStore<T extends { synced: boolean }>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const results = request.result as T[];
      resolve(results.filter((item) => !item.synced));
    };
  });
}

async function markAsSynced(storeName: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const data = getRequest.result;
      if (data) {
        data.synced = true;
        const putRequest = store.put(data);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      } else {
        resolve();
      }
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

async function deleteFromStore(storeName: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Submission offline storage
export const offlineSubmissions = {
  async save(assignmentId: string, content: unknown): Promise<string> {
    const id = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await addToStore("submissions", {
      id,
      assignmentId,
      content,
      timestamp: Date.now(),
      synced: false,
    });
    return id;
  },

  async getUnsynced() {
    return getUnsyncedFromStore<{
      id: string;
      assignmentId: string;
      content: unknown;
      timestamp: number;
      synced: boolean;
    }>("submissions");
  },

  async markSynced(id: string) {
    return markAsSynced("submissions", id);
  },

  async delete(id: string) {
    return deleteFromStore("submissions", id);
  },
};

// Patient contact offline storage
export const offlinePatientContacts = {
  async save(data: unknown): Promise<string> {
    const id = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await addToStore("patientContacts", {
      id,
      data,
      timestamp: Date.now(),
      synced: false,
    });
    return id;
  },

  async getUnsynced() {
    return getUnsyncedFromStore<{
      id: string;
      data: unknown;
      timestamp: number;
      synced: boolean;
    }>("patientContacts");
  },

  async markSynced(id: string) {
    return markAsSynced("patientContacts", id);
  },

  async delete(id: string) {
    return deleteFromStore("patientContacts", id);
  },
};

// Lesson progress offline storage
export const offlineLessonProgress = {
  async save(lessonId: string, progress: number): Promise<void> {
    await addToStore("lessonProgress", {
      lessonId,
      progress,
      timestamp: Date.now(),
      synced: false,
    });
  },

  async get(lessonId: string) {
    return getFromStore<{
      lessonId: string;
      progress: number;
      timestamp: number;
      synced: boolean;
    }>("lessonProgress", lessonId);
  },

  async getUnsynced() {
    return getUnsyncedFromStore<{
      lessonId: string;
      progress: number;
      timestamp: number;
      synced: boolean;
    }>("lessonProgress");
  },

  async markSynced(lessonId: string) {
    return markAsSynced("lessonProgress", lessonId);
  },
};

// Generic cache for offline data
export const offlineCache = {
  async set(key: string, data: unknown, ttl?: number): Promise<void> {
    await addToStore("cache", {
      key,
      data,
      timestamp: Date.now(),
      expires: ttl ? Date.now() + ttl : null,
    });
  },

  async get<T>(key: string): Promise<T | null> {
    const cached = await getFromStore<{
      key: string;
      data: T;
      timestamp: number;
      expires: number | null;
    }>("cache", key);

    if (!cached) return null;

    // Check if expired
    if (cached.expires && cached.expires < Date.now()) {
      await deleteFromStore("cache", key);
      return null;
    }

    return cached.data;
  },

  async delete(key: string): Promise<void> {
    return deleteFromStore("cache", key);
  },

  async clear(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("cache", "readwrite");
      const store = transaction.objectStore("cache");
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  },
};

// Sync manager
export async function syncOfflineData(
  syncSubmission: (data: { assignmentId: string; content: unknown }) => Promise<void>,
  syncPatientContact: (data: unknown) => Promise<void>,
  syncLessonProgress: (lessonId: string, progress: number) => Promise<void>
): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;

  // Sync submissions
  const unsyncedSubmissions = await offlineSubmissions.getUnsynced();
  for (const submission of unsyncedSubmissions) {
    try {
      await syncSubmission({
        assignmentId: submission.assignmentId,
        content: submission.content,
      });
      await offlineSubmissions.markSynced(submission.id);
      synced++;
    } catch (error) {
      console.error("Failed to sync submission:", error);
      failed++;
    }
  }

  // Sync patient contacts
  const unsyncedContacts = await offlinePatientContacts.getUnsynced();
  for (const contact of unsyncedContacts) {
    try {
      await syncPatientContact(contact.data);
      await offlinePatientContacts.markSynced(contact.id);
      synced++;
    } catch (error) {
      console.error("Failed to sync patient contact:", error);
      failed++;
    }
  }

  // Sync lesson progress
  const unsyncedProgress = await offlineLessonProgress.getUnsynced();
  for (const progress of unsyncedProgress) {
    try {
      await syncLessonProgress(progress.lessonId, progress.progress);
      await offlineLessonProgress.markSynced(progress.lessonId);
      synced++;
    } catch (error) {
      console.error("Failed to sync lesson progress:", error);
      failed++;
    }
  }

  return { synced, failed };
}

// Hook for offline status
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

// Hook for pending sync count
export function usePendingSyncCount() {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    async function updateCount() {
      try {
        const submissions = await offlineSubmissions.getUnsynced();
        const contacts = await offlinePatientContacts.getUnsynced();
        const progress = await offlineLessonProgress.getUnsynced();
        setCount(submissions.length + contacts.length + progress.length);
      } catch (error) {
        console.error("Failed to get pending sync count:", error);
      }
    }

    updateCount();
    const interval = setInterval(updateCount, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return count;
}
