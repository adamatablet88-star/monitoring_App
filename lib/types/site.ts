import type { FrequencyValue } from "./frequency";

/** Ported from field-monitoring-app/packages/shared/src/site.ts. */
export type ProtocolType = "fuelLens" | "SVE" | "bioVenting" | "groundwater";
export type SiteStatus = "active" | "inactive";

export interface ClientContact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
}

export interface Client {
  id: string;
  name: string;
  contacts: ClientContact[];
  /** פרוטוקולי ניטור רלוונטיים ללקוח לפי החוזה — לא בהכרח זהה ל-protocolTypes בפועל של כל אתר. */
  relevantProtocolTypes: ProtocolType[];
  /** תדירות ברירת מחדל לפי חוזה — נטענת כברירת מחדל בעת הגדרת תדירות ראשונה לאתר/מערכת תחת לקוח זה. */
  defaultFrequency: FrequencyValue;
  /** הערות/הגדרות חופשיות לדיווח דוחות רגולטוריים ללקוח זה (נמענים, פורמט, דרישות מיוחדות). */
  reportNotes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Site {
  id: string;
  clientId: string;
  name: string;
  /** כתובת חופשית להצגה/ניווט (וויז) — נפרדת מהקואורדינטות המרכזיות. */
  address: string;
  coordinates: { lat: number; lng: number };
  status: SiteStatus;
  notes?: string;
  /** A site can run several protocol types in parallel ("combined" site). */
  protocolTypes: ProtocolType[];
  createdAt: number;
  updatedAt: number;
}
