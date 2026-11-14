import type { FlagId } from "./raceFlags";

export interface NoticeField {
  id: string;
  label: string;
  type: "text" | "textarea" | "number";
  placeholder?: string;
}

export interface NoticeVariant {
  id: string;
  label: string;
  flags: (extra: Record<string, string>) => FlagId[];
  defaultBody: (extra: Record<string, string>) => string;
  extraFields?: NoticeField[];
}

export interface NoticeType {
  id: string;
  title: string;
  variants: NoticeVariant[];
  /** Shown under the notice type, for rule context that doesn't belong in the body text. */
  note?: string;
}

// Data only, kept separate from the page so another notice type or variant
// can be added here without touching the UI.
export const NOTICE_TYPES: NoticeType[] = [
  {
    id: "postponement",
    title: "Postponement",
    note: "Rule 27.3: before the starting signal, the race committee may postpone for any reason.",
    variants: [
      {
        id: "AP",
        label: "AP",
        flags: () => ["AP"],
        defaultBody: () =>
          "Races not started are postponed. The warning signal will be made 1 minute after AP is removed, unless at that time the race is postponed again or abandoned.",
      },
      {
        id: "AP_H",
        label: "AP over H",
        flags: () => ["AP", "H"],
        defaultBody: () =>
          "Races not started are postponed. Further signals ashore.",
      },
      {
        id: "AP_A",
        label: "AP over A",
        flags: () => ["AP", "A"],
        defaultBody: () =>
          "Races not started are postponed. No more racing today.",
      },
      {
        id: "AP_NUM",
        label: "AP over a numeral pennant",
        flags: (extra) => ["AP", `NUM_${extra.hours || "1"}` as FlagId],
        defaultBody: (extra) =>
          `Postponement of ${extra.hours || "1"} hour${(extra.hours || "1") === "1" ? "" : "s"} from the scheduled starting time.`,
        extraFields: [{ id: "hours", label: "Hours (1-9)", type: "number" }],
      },
    ],
  },
  {
    id: "abandonment",
    title: "Abandonment",
    note: "Under RRS 2025-2028, rule 27.3 also lets the committee abandon with these flags before the starting signal, not only once a race is under way (rule 32).",
    variants: [
      {
        id: "N",
        label: "N",
        flags: () => ["N"],
        defaultBody: () =>
          "All races in progress are abandoned. Return to the starting area. The warning signal will be made 1 minute after N is removed, unless at that time the race is abandoned again or postponed.",
      },
      {
        id: "N_H",
        label: "N over H",
        flags: () => ["N", "H"],
        defaultBody: () =>
          "All races in progress are abandoned. Further signals ashore.",
      },
      {
        id: "N_A",
        label: "N over A",
        flags: () => ["N", "A"],
        defaultBody: () =>
          "All races in progress are abandoned. No more racing today.",
      },
    ],
  },
  {
    id: "general-recall",
    title: "General recall",
    variants: [
      {
        id: "FIRST_SUB",
        label: "First Substitute",
        flags: () => ["FIRST_SUB"],
        defaultBody: () =>
          "A general recall has been made. The warning signal for a new start will be made 1 minute after the First Substitute is removed, and the starts for any succeeding classes will follow the new start.",
      },
    ],
  },
  {
    id: "individual-recall",
    title: "Individual recall",
    variants: [
      {
        id: "X",
        label: "X",
        flags: () => ["X"],
        defaultBody: () =>
          "One or more boats were on the course side of the starting line, or were required to comply with rule 30.1, at the starting signal and did not start correctly.",
      },
    ],
  },
  {
    id: "si-amendment",
    title: "Amendment to Sailing Instructions",
    variants: [
      {
        id: "L",
        label: "L",
        flags: () => ["L"],
        defaultBody: (extra) =>
          `Sailing Instruction ${extra.siNumber || "[number]"} has been amended.\n\nOriginal text:\n${extra.original || "[original text]"}\n\nAmended text:\n${extra.amended || "[amended text]"}`,
        extraFields: [
          { id: "siNumber", label: "Sailing Instruction number", type: "text" },
          { id: "original", label: "Original text", type: "textarea" },
          { id: "amended", label: "Amended text", type: "textarea" },
        ],
      },
    ],
  },
  {
    id: "course-change",
    title: "Course change or shortened course",
    variants: [
      {
        id: "C",
        label: "C — course change",
        flags: () => ["C"],
        defaultBody: () => "The position of the next mark has been changed.",
      },
      {
        id: "S",
        label: "S — shortened course",
        flags: () => ["S"],
        defaultBody: () =>
          "The course has been shortened. Rule 32.2 is in effect.",
      },
    ],
  },
  {
    id: "general-notice",
    title: "General notice",
    variants: [
      {
        id: "L",
        label: "L",
        flags: () => ["L"],
        defaultBody: () =>
          "A notice to competitors has been posted. See below for details.",
      },
    ],
  },
];

export function findNoticeType(id: string): NoticeType {
  return NOTICE_TYPES.find((t) => t.id === id) ?? NOTICE_TYPES[0];
}

export function findVariant(
  type: NoticeType,
  variantId: string,
): NoticeVariant {
  return type.variants.find((v) => v.id === variantId) ?? type.variants[0];
}
