import type { ParameterChangeRecord, ParameterConfig, SystemType } from "@/lib/types";

/**
 * The spec's suggested default parameter set for a newly-created system —
 * seeded once at creation time, then fully editable/deactivatable/
 * addable by the admin like any other parameter. IDs are deterministic
 * (not random) so the visit forms can find "the PID-after-converter
 * reading for this system" reliably even after an admin renames it —
 * see SveVisitForm.tsx / BioVentingVisitForm.tsx.
 *
 * SVE's suggested list explicitly names the converter's *pressure* but
 * not its temperature — the original fixed schema tracked both. Only
 * pressure is seeded here to match the document exactly; an admin who
 * wants the temperature reading too can still add it manually via
 * "+ פרמטר חדש", since the parameter engine is generic.
 *
 * Bio-venting's O2/CO2 defaults here are system-level (e.g. exhaust
 * composition at the blower) — a different measurement from the
 * per-monitoring-point, per-depth O2/CO2 already tracked in
 * BioVentingSystemVisit.monitoringPoints, not a duplicate of it.
 */
export function defaultParametersFor(systemId: string, systemType: SystemType, createdBy: string): ParameterConfig[] {
  const history: ParameterChangeRecord[] = [{ changedBy: createdBy, changedAt: new Date().toISOString(), action: "created" }];
  const common = {
    systemId,
    active: true,
    required: false,
    monotonicIncreasing: false,
    criticalDirection: "none",
    criticalValue: null,
    criticalMessage: "",
    history,
  } as const;

  if (systemType === "SVE") {
    return [
      {
        ...common,
        id: `${systemId}__${SVE_PARAMETER_KEYS.vacuumManifold}`,
        label: "וואקום סעפת",
        unit: "kPa",
        minValue: 1,
        maxValue: 8,
        order: 1,
        helpText: "וואקום כללי של המערכת",
        invertSign: true,
      },
      {
        ...common,
        id: `${systemId}__${SVE_PARAMETER_KEYS.moistureSeparatorVacuum}`,
        label: "לחץ מפריד לחות",
        unit: "אינץ' מים",
        minValue: null,
        maxValue: null,
        order: 2,
        helpText: "",
        invertSign: true,
      },
      {
        ...common,
        id: `${systemId}__${SVE_PARAMETER_KEYS.vcv}`,
        label: "VCV",
        unit: "",
        minValue: 1,
        maxValue: 5,
        order: 3,
        helpText: "1=אטמוספרה בלבד, 5=קידוחים בלבד",
        invertSign: false,
      },
      {
        ...common,
        id: `${systemId}__${SVE_PARAMETER_KEYS.catalyticConverterPressure}`,
        label: "לחץ כניסה לממיר קטליטי",
        unit: "kPa",
        minValue: null,
        maxValue: null,
        order: 4,
        helpText: "",
        invertSign: false,
      },
      {
        ...common,
        id: `${systemId}__${SVE_PARAMETER_KEYS.pidBeforeConverter}`,
        label: "PID לפני ממיר",
        unit: "ppm",
        minValue: 0,
        maxValue: 5000,
        order: 5,
        helpText: "",
        invertSign: false,
      },
      {
        ...common,
        id: `${systemId}__${SVE_PARAMETER_KEYS.pidAfterConverter}`,
        label: "PID אחרי ממיר",
        unit: "ppm",
        minValue: 0,
        maxValue: 50,
        order: 6,
        helpText: "",
        invertSign: false,
        criticalDirection: "above",
        criticalValue: 50,
        criticalMessage: "יש להתקשר מיידית למפקח — יש להוריד מתחת ל-50 ppm או לכבות את המערכת",
      },
      {
        ...common,
        id: `${systemId}__${SVE_PARAMETER_KEYS.operatingHours}`,
        label: "שעות עבודה",
        unit: "שע'",
        minValue: null,
        maxValue: null,
        order: 7,
        helpText: "מצטבר, לא יכול לרדת מהקריאה הקודמת",
        invertSign: false,
        monotonicIncreasing: true,
      },
    ];
  }

  return [
    {
      ...common,
      id: `${systemId}__${BIO_VENTING_PARAMETER_KEYS.vacuumIntakeLine}`,
      label: "וואקום קו יניקה",
      unit: "kPa",
      minValue: 0.5,
      maxValue: 4,
      order: 1,
      helpText: "",
      invertSign: true,
    },
    {
      ...common,
      id: `${systemId}__${BIO_VENTING_PARAMETER_KEYS.o2}`,
      label: "O2",
      unit: "%",
      minValue: 0,
      maxValue: 21,
      order: 2,
      helpText: "",
      invertSign: false,
    },
    {
      ...common,
      id: `${systemId}__${BIO_VENTING_PARAMETER_KEYS.co2}`,
      label: "CO2",
      unit: "%",
      minValue: 0,
      maxValue: 20,
      order: 3,
      helpText: "",
      invertSign: false,
    },
  ];
}

/** Deterministic id suffixes — combine with `${systemId}__` to look up a specific seeded parameter. */
export const SVE_PARAMETER_KEYS = {
  vacuumManifold: "vacuumManifold",
  moistureSeparatorVacuum: "moistureSeparatorVacuum",
  vcv: "vcv",
  catalyticConverterPressure: "catalyticConverterPressure",
  pidBeforeConverter: "pidBeforeConverter",
  pidAfterConverter: "pidAfterConverter",
  operatingHours: "operatingHours",
} as const;

export const BIO_VENTING_PARAMETER_KEYS = {
  vacuumIntakeLine: "vacuumIntakeLine",
  o2: "o2",
  co2: "co2",
} as const;
