"use client";

import { useEffect, useState } from "react";
import { onValue, ref, remove as removeRef, set } from "firebase/database";
import { getFirebaseDb } from "./firebase";

/**
 * Reactive CRUD over one Realtime Database collection path, the
 * Firebase-backed analog of the original project's useLocalCollection
 * (which routed through a Dexie outbox for offline-first sync). There's
 * no outbox here — RTDB's own client SDK queues writes made while
 * offline in memory and flushes them on reconnect, but unlike the
 * original app's Dexie-backed outbox, that queue does not survive an
 * app restart while offline. A real, documented trade-off of this
 * stack, not an oversight.
 */
export function useCollection<T extends { id: string }>(path: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const collectionRef = ref(getFirebaseDb(), path);
    const unsubscribe = onValue(
      collectionRef,
      (snapshot) => {
        const value = snapshot.val() as Record<string, T> | null;
        setItems(value ? Object.values(value) : []);
        setLoading(false);
      },
      (error) => {
        console.error(`RTDB read failed for ${path}`, error);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [path]);

  async function save(entity: T): Promise<void> {
    // RTDB's set() throws on a literal `undefined` anywhere in the value
    // (e.g. an optional field like Well.tankId left unset) — round-tripping
    // through JSON drops those keys the same way JSON.stringify always has.
    const sanitized = JSON.parse(JSON.stringify(entity)) as T;
    await set(ref(getFirebaseDb(), `${path}/${entity.id}`), sanitized);
  }

  async function remove(entity: T): Promise<void> {
    await removeRef(ref(getFirebaseDb(), `${path}/${entity.id}`));
  }

  return { items, loading, save, remove };
}

export function newId(): string {
  return crypto.randomUUID();
}
