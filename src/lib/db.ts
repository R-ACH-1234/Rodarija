/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { HistoryItem } from '../types';

interface VlogDB extends DBSchema {
  history: {
    key: string;
    value: HistoryItem & { audioBlob?: Blob };
    indexes: { 'by-date': number };
  };
}

const DB_NAME = 'darija-vlog-studio';
const STORE_NAME = 'history';

let dbPromise: Promise<IDBPDatabase<VlogDB>> | null = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<VlogDB>(DB_NAME, 1, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
        });
        store.createIndex('by-date', 'timestamp');
      },
    });
  }
  return dbPromise;
};

export async function saveHistoryItem(item: HistoryItem, blob?: Blob) {
  const db = await getDB();
  // We store the blob directly for efficiency
  return db.put(STORE_NAME, { ...item, audioBlob: blob });
}

export async function getAllHistoryItems() {
  const db = await getDB();
  return db.getAllFromIndex(STORE_NAME, 'by-date');
}

export async function deleteHistoryItem(id: string) {
  const db = await getDB();
  return db.delete(STORE_NAME, id);
}

export async function clearAllHistoryItems() {
  const db = await getDB();
  return db.clear(STORE_NAME);
}

export async function clearOldItems(limit: number = 20) {
  const db = await getDB();
  const items = await db.getAllFromIndex(STORE_NAME, 'by-date');
  if (items.length > limit) {
    const toDelete = items.slice(0, items.length - limit);
    for (const item of toDelete) {
      await db.delete(STORE_NAME, item.id);
    }
  }
}
