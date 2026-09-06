"use client";

import { useEffect, useState } from "react";
import { onValue, ref, remove as removeRef, runTransaction, set } from "firebase/database";
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

export class ConflictError extends Error {
  constructor() {
    super("מישהו אחר שינה רשומה זו בזמן שמילאת את הטופס — רענן את העמוד ובדוק את השינויים לפני שתשמור מחדש.");
    this.name = "ConflictError";
  }
}

/**
 * Optimistic-concurrency save for records two technicians might edit at
 * nearly the same moment — the "conflicting sync attempt on the same
 * site/well" scenario from the spec. There's no offline outbox here to
 * carry a full conflict-resolution UI (see docs/database-rules.md and
 * the surrounding design notes on this stack's offline trade-offs), but
 * a same-session, same-day double-edit is still worth catching: silently
 * overwriting a colleague's already-saved visit is worse than making the
 * second writer redo their entry.
 *
 * expectedUpdatedAt must be the `updatedAt` the form actually loaded
 * (null when creating a brand-new record). The transaction aborts —
 * throwing ConflictError instead of writing — if the record's live
 * updatedAt no longer matches, meaning someone else's write landed in
 * between.
 */
export async function saveWithConflictCheck<T extends { id: string; updatedAt: number }>(
  path: string,
  entity: T,
  expectedUpdatedAt: number | null,
): Promise<void> {
  const sanitized = JSON.parse(JSON.stringify(entity)) as T;
  const nodeRef = ref(getFirebaseDb(), `${path}/${entity.id}`);
  const result = await runTransaction(nodeRef, (current: T | null) => {
    const currentUpdatedAt = current?.updatedAt ?? null;
    if (currentUpdatedAt !== expectedUpdatedAt) {
      return undefined; // abort — the live record no longer matches what was loaded
    }
    return sanitized;
  });
  if (!result.committed) {
    throw new ConflictError();
  }
}
