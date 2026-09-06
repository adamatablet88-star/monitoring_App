"use client";

import { useState } from "react";
import type { Client } from "@/lib/types";
import { newId, useCollection } from "@/lib/rtdb-collection";

interface ClientsPanelProps {
  selectedClientId: string | null;
  onSelect: (clientId: string) => void;
}

export function ClientsPanel({ selectedClientId, onSelect }: ClientsPanelProps) {
  const { items: clients, save, remove } = useCollection<Client>("clients");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await save({ id: newId(), name: name.trim() });
    setName("");
    setShowForm(false);
  }

  return (
    <section className="panel">
      <h2>לקוחות (חברות דלק)</h2>
      <ul className="entity-list">
        {clients.map((client) => (
          <li key={client.id}>
            <button
              type="button"
              className={client.id === selectedClientId ? "entity-row selected" : "entity-row"}
              onClick={() => onSelect(client.id)}
            >
              {client.name}
            </button>
            <button type="button" className="danger-link" onClick={() => remove(client)}>
              מחק
            </button>
          </li>
        ))}
        {clients.length === 0 && <li className="empty-hint">אין עדיין לקוחות</li>}
      </ul>

      {showForm ? (
        <form onSubmit={handleSubmit} className="inline-form">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="שם הלקוח"
            autoFocus
            required
          />
          <button type="submit">שמור</button>
          <button type="button" onClick={() => setShowForm(false)}>
            ביטול
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setShowForm(true)}>
          + לקוח חדש
        </button>
      )}
    </section>
  );
}
