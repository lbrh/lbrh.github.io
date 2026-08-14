export type ID = string;

export type MarkKind = 'standard' | 'windward' | 'leeward' | 'offset' | 'reach' | 'gate';

export interface Mark {
  id: ID;
  kind: MarkKind;
  x: number;
  y: number;
  label: string;
  color: string;
  /** Radius in world units. */
  size: number;
  rotation: number;
  locked: boolean;
  /** Set when this mark is one half of a gate. */
  gateId?: ID;
  gateRole?: 'port' | 'stbd';
  /** Set when this is an offset attached to a parent mark. */
  parentId?: ID;
}

export interface Gate {
  id: ID;
  portId: ID;
  stbdId: ID;
  /** When true, dragging one side moves the other. */
  linked: boolean;
}

export type LineKind = 'start' | 'finish';
export type EndStyle = 'boat' | 'pin' | 'plain';

export interface RaceLine {
  id: ID;
  kind: LineKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  endA: EndStyle;
  endB: EndStyle;
  /** Fill colour for a 'pin' end. */
  pinColor?: string;
  /** Fill colour for a 'boat' end. */
  boatColor?: string;
  locked: boolean;
}

export interface WindArrow {
  id: ID;
  x: number;
  y: number;
  /** Degrees; 0 points down the page (wind blowing from top). */
  angle: number;
  length: number;
  label: string;
  locked: boolean;
}

export interface Annotation {
  id: ID;
  x: number;
  y: number;
  text: string;
  size: number;
  color: string;
  locked: boolean;
}

/** A sequence entry points at a physical object; the same object may appear many times. */
export type SeqRef =
  | { type: 'mark'; markId: ID }
  | { type: 'gate'; gateId: ID }
  | { type: 'line'; lineId: ID };

export interface SeqEntry {
  id: ID;
  ref: SeqRef;
}

export interface CourseSettings {
  title: string;
  allowMultipleStart: boolean;
  allowMultipleFinish: boolean;
  showGrid: boolean;
  snap: boolean;
  gridSize: number;
  /** Which side a boat leaves marks on when a rounding's direction is otherwise ambiguous (e.g. a straight beat/run). Most courses round to port. */
  roundingDirection: 'port' | 'starboard';
}

export interface CourseDoc {
  marks: Mark[];
  gates: Gate[];
  lines: RaceLine[];
  winds: WindArrow[];
  notes: Annotation[];
  sequence: SeqEntry[];
  settings: CourseSettings;
}

export type ObjectKind = 'mark' | 'line' | 'wind' | 'note';

/** Anything selectable/movable on the canvas. */
export interface CanvasObject {
  kind: ObjectKind;
  id: ID;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/* ── Render primitives ───────────────────────────────────────────
   The scene compiles the document down to this flat, ordered list.
   Every output (screen SVG, exported SVG, PNG, PDF) consumes the
   same primitives, so all four stay pixel-identical by construction. */

export interface PrimLine {
  k: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  w: number;
  dash?: number[];
  cap?: 'butt' | 'round';
}

export interface PrimCircle {
  k: 'circle';
  cx: number;
  cy: number;
  r: number;
  fill?: string;
  stroke?: string;
  w?: number;
}

export interface PrimPoly {
  k: 'poly';
  pts: [number, number][];
  fill?: string;
  stroke?: string;
  w?: number;
  close?: boolean;
}

export interface PrimRect {
  k: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  stroke?: string;
  sw?: number;
}

export interface PrimText {
  k: 'text';
  x: number;
  y: number;
  text: string;
  size: number;
  fill: string;
  anchor: 'start' | 'middle' | 'end';
  bold?: boolean;
}

export type Prim = PrimLine | PrimCircle | PrimPoly | PrimRect | PrimText;
