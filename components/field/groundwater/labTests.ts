/**
 * Common lab tests and their fixed sampling container/preservative — shown
 * automatically to the technician, never entered as input. The list of
 * tests itself is not fixed (a technician can add a custom one), only the
 * container mapping per known test is.
 */
export const COMMON_LAB_TESTS = ["VOC", "מתכות", "TPH", "PFAS", "אניונים"] as const;

export const LAB_TEST_CONTAINERS: Record<string, string> = {
  VOC: 'בקבוקון זכוכית 40 מ"ל, ללא חלל אוויר, משמר HCl',
  מתכות: "בקבוק פוליאתילן, משמר HNO3",
  TPH: "בקבוק זכוכית אמבר, ללא משמר",
  PFAS: "בקבוק פוליפרופילן (ללא PTFE), ללא משמר",
  אניונים: "בקבוק פוליאתילן, ללא משמר, בקירור",
};

export function containerFor(labTest: string): string {
  return LAB_TEST_CONTAINERS[labTest] ?? "יש להתייעץ עם המעבדה לגבי כלי הדיגום המתאים";
}
