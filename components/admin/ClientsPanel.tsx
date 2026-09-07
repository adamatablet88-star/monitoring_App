"use client";

import { useState } from "react";
import type { Client, ClientContact, FrequencyValue, ProtocolType } from "@/lib/types";
import { FREQUENCY_LABELS } from "@/lib/types";
import { newId, useCollection } from "@/lib/rtdb-collection";

const PROTOCOL_LABELS: Record<ProtocolType, string> = {
  fuelLens: "עדשת דלק",
  SVE: "SVE",
  bioVenting: "Bio-venting",
  groundwater: "דיגום מי תהום",
};

interface ContactDraft {
  name: string;
  phone: string;
  email: string;
  role: string;
}

const emptyContactDraft: ContactDraft = { name: "", phone: "", email: "", role: "" };

interface ClientsPanelProps {
  selectedClientId: string | null;
  onSelect: (clientId: string) => void;
}

export function ClientsPanel({ selectedClientId, onSelect }: ClientsPanelProps) {
  const { items: clients, save, remove } = useCollection<Client>("clients");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [relevantProtocolTypes, setRelevantProtocolTypes] = useState<ProtocolType[]>([]);
  const [defaultFrequency, setDefaultFrequency] = useState<FrequencyValue>("annual");
  const [reportNotes, setReportNotes] = useState("");
  const [contacts, setContacts] = useState<ContactDraft[]>([]);
  const [contactDraft, setContactDraft] = useState<ContactDraft>(emptyContactDraft);

  function toggleProtocol(type: ProtocolType) {
    setRelevantProtocolTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  function addContact() {
    if (!contactDraft.name.trim()) return;
    setContacts((prev) => [...prev, contactDraft]);
    setContactDraft(emptyContactDraft);
  }

  function removeContact(index: number) {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const now = Date.now();
    const savedContacts: ClientContact[] = contacts.map((c) => ({
      id: newId(),
      name: c.name.trim(),
      phone: c.phone.trim() || undefined,
      email: c.email.trim() || undefined,
      role: c.role.trim() || undefined,
    }));
    await save({
      id: newId(),
      name: name.trim(),
      contacts: savedContacts,
      relevantProtocolTypes,
      defaultFrequency,
      reportNotes: reportNotes.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
    setName("");
    setRelevantProtocolTypes([]);
    setDefaultFrequency("annual");
    setReportNotes("");
    setContacts([]);
    setContactDraft(emptyContactDraft);
    setShowForm(false);
  }

  return (
    <section className="panel">
      <h2>לקוחות</h2>
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
        <form onSubmit={handleSubmit} className="inline-form stacked">
          <label>
            שם הלקוח
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם הלקוח" autoFocus required />
          </label>

          <fieldset>
            <legend>אנשי קשר</legend>
            {contacts.map((c, i) => (
              <div className="field-row" key={i}>
                <span>
                  {c.name}
                  {c.role && ` (${c.role})`}
                  {c.phone && ` · ${c.phone}`}
                  {c.email && ` · ${c.email}`}
                </span>
                <button type="button" className="danger-link" onClick={() => removeContact(i)}>
                  הסר
                </button>
              </div>
            ))}
            <div className="field-row">
              <input placeholder="שם" value={contactDraft.name} onChange={(e) => setContactDraft((d) => ({ ...d, name: e.target.value }))} />
              <input placeholder="תפקיד" value={contactDraft.role} onChange={(e) => setContactDraft((d) => ({ ...d, role: e.target.value }))} />
              <input placeholder="טלפון" value={contactDraft.phone} onChange={(e) => setContactDraft((d) => ({ ...d, phone: e.target.value }))} />
              <input placeholder="דוא&quot;ל" value={contactDraft.email} onChange={(e) => setContactDraft((d) => ({ ...d, email: e.target.value }))} />
              <button type="button" onClick={addContact}>
                + הוסף איש קשר
              </button>
            </div>
          </fieldset>

          <fieldset>
            <legend>פרוטוקולי ניטור רלוונטיים לפי חוזה</legend>
            {(Object.keys(PROTOCOL_LABELS) as ProtocolType[]).map((type) => (
              <label key={type} className="checkbox-label">
                <input type="checkbox" checked={relevantProtocolTypes.includes(type)} onChange={() => toggleProtocol(type)} />
                {PROTOCOL_LABELS[type]}
              </label>
            ))}
          </fieldset>

          <label>
            תדירות ברירת מחדל לפי חוזה
            <select value={defaultFrequency} onChange={(e) => setDefaultFrequency(e.target.value as FrequencyValue)}>
              {(Object.keys(FREQUENCY_LABELS) as FrequencyValue[]).map((f) => (
                <option key={f} value={f}>
                  {FREQUENCY_LABELS[f]}
                </option>
              ))}
            </select>
          </label>

          <label>
            הגדרות/הערות דוחות
            <textarea value={reportNotes} onChange={(e) => setReportNotes(e.target.value)} placeholder="נמענים, פורמט, דרישות מיוחדות..." />
          </label>

          <div>
            <button type="submit">שמור</button>
            <button type="button" onClick={() => setShowForm(false)}>
              ביטול
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setShowForm(true)}>
          + לקוח חדש
        </button>
      )}
    </section>
  );
}
