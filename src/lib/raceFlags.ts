/**
 * International code flags used in sailing race signals, as plain shape
 * data (rects / circles / polygons in a 0..width, 0..100 box) rather than
 * fixed SVG markup, so the same definitions can render both the live HTML
 * preview and the hand-written vector PDF (see pdfWriter.ts) at any size.
 *
 * Colours and designs checked against the World Sailing RRS 2025-2028 Race
 * Signals sheet. A few numeral pennants (6 and 9) are close approximations
 * of busier multi-colour designs — see the summary for which ones.
 */

export type FlagId =
  | "P"
  | "I"
  | "Z"
  | "U"
  | "BLACK"
  | "X"
  | "FIRST_SUB"
  | "S"
  | "AP"
  | "H"
  | "A"
  | "N"
  | "L"
  | "C"
  | "Y"
  | "NUM_1"
  | "NUM_2"
  | "NUM_3"
  | "NUM_4"
  | "NUM_5"
  | "NUM_6"
  | "NUM_7"
  | "NUM_8"
  | "NUM_9";

export type FlagShape =
  | { k: "rect"; x: number; y: number; w: number; h: number; fill: string }
  | { k: "circle"; cx: number; cy: number; r: number; fill: string }
  | { k: "poly"; pts: [number, number][]; fill: string };

export interface FlagDef {
  id: FlagId;
  name: string;
  /** Accessible text description, also printed under the graphic in the PDF. */
  description: string;
  /** Viewbox is 0..width by 0..100. Square flags use width 100, pennants and the swallowtail use 160. */
  width: number;
  layers: FlagShape[];
}

const RED = "#c8102e";
const BLUE = "#003087";
const YELLOW = "#ffd100";
const BLACK = "#1a1a1a";
const WHITE = "#ffffff";

// ─── Pennant geometry helpers ───────────────────────────────────────────
// A pennant is a triangle: base (the hoist edge) from (0,0) to (0,100),
// apex at (W,50). The two sloped edges follow y = 50*x/W (top) and
// y = 100 - 50*x/W (bottom).
function pennantTop(w: number, x: number) {
  return (50 * x) / w;
}
function pennantBottom(w: number, x: number) {
  return 100 - (50 * x) / w;
}

/** n equal vertical bands across a pennant, hoist to fly. */
function pennantVerticalStripes(w: number, colors: string[]): FlagShape[] {
  const n = colors.length;
  const shapes: FlagShape[] = [];
  for (let i = 0; i < n; i++) {
    const x0 = (w * i) / n;
    const x1 = (w * (i + 1)) / n;
    shapes.push({
      k: "poly",
      pts: [
        [x0, pennantTop(w, x0)],
        [x1, pennantTop(w, x1)],
        [x1, pennantBottom(w, x1)],
        [x0, pennantBottom(w, x0)],
      ],
      fill: colors[i],
    });
  }
  return shapes;
}

/** Split through the apex: one triangle above the midline, one below. */
function pennantHorizontalSplit(
  w: number,
  topColor: string,
  bottomColor: string,
): FlagShape[] {
  return [
    {
      k: "poly",
      pts: [
        [0, 0],
        [w, 50],
        [0, 50],
      ],
      fill: topColor,
    },
    {
      k: "poly",
      pts: [
        [0, 50],
        [w, 50],
        [0, 100],
      ],
      fill: bottomColor,
    },
  ];
}

/** A disc centred in the pennant, for numeral pennants 1 and 2. */
function pennantDisc(w: number, bg: string, discColor: string): FlagShape[] {
  return [
    {
      k: "poly",
      pts: [
        [0, 0],
        [w, 50],
        [0, 100],
      ],
      fill: bg,
    },
    { k: "circle", cx: w * 0.35, cy: 50, r: 16, fill: discColor },
  ];
}

function squareBase(fill: string): FlagShape {
  return { k: "rect", x: 0, y: 0, w: 100, h: 100, fill };
}

/** 2x2 checker for a square flag (U, L). */
function quarterSquare(
  tl: string,
  tr: string,
  bl: string,
  br: string,
): FlagShape[] {
  return [
    { k: "rect", x: 0, y: 0, w: 50, h: 50, fill: tl },
    { k: "rect", x: 50, y: 0, w: 50, h: 50, fill: tr },
    { k: "rect", x: 0, y: 50, w: 50, h: 50, fill: bl },
    { k: "rect", x: 50, y: 50, w: 50, h: 50, fill: br },
  ];
}

/** n x n checker for a square flag (N). */
function gridSquare(n: number, a: string, b: string): FlagShape[] {
  const cell = 100 / n;
  const shapes: FlagShape[] = [];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      shapes.push({
        k: "rect",
        x: col * cell,
        y: row * cell,
        w: cell,
        h: cell,
        fill: (row + col) % 2 === 0 ? a : b,
      });
    }
  }
  return shapes;
}

/** Four triangles meeting at the centre (Z flag): top, right, bottom, left. */
function diagonalQuarters(
  top: string,
  right: string,
  bottom: string,
  left: string,
): FlagShape[] {
  return [
    {
      k: "poly",
      pts: [
        [0, 0],
        [100, 0],
        [50, 50],
      ],
      fill: top,
    },
    {
      k: "poly",
      pts: [
        [100, 0],
        [100, 100],
        [50, 50],
      ],
      fill: right,
    },
    {
      k: "poly",
      pts: [
        [0, 100],
        [100, 100],
        [50, 50],
      ],
      fill: bottom,
    },
    {
      k: "poly",
      pts: [
        [0, 0],
        [0, 100],
        [50, 50],
      ],
      fill: left,
    },
  ];
}

/** Thick diagonal cross (X, M). */
function saltire(color: string, thickness = 16): FlagShape[] {
  const t = thickness / 2;
  return [
    {
      k: "poly",
      pts: [
        [0, -t],
        [t * 1.6, -t],
        [100, 100 - t * 1.6],
        [100, 100],
        [100 - t * 1.6, 100],
        [0, t * 1.6],
      ] as [number, number][],
      fill: color,
    },
    {
      k: "poly",
      pts: [
        [100, -t],
        [100 - t * 1.6, -t],
        [0, 100 - t * 1.6],
        [0, 100],
        [t * 1.6, 100],
        [100, t * 1.6],
      ] as [number, number][],
      fill: color,
    },
  ];
}

/** The swallowtail outline used by the A flag: a rectangle with a V notch cut from the fly end. */
export const SWALLOWTAIL_POINTS: [number, number][] = [
  [0, 0],
  [160, 0],
  [120, 50],
  [160, 100],
  [0, 100],
];

const FLAGS: FlagDef[] = [
  {
    id: "P",
    name: "P",
    description: "Blue flag with a white rectangle in the centre",
    width: 100,
    layers: [
      squareBase(BLUE),
      { k: "rect", x: 32, y: 32, w: 36, h: 36, fill: WHITE },
    ],
  },
  {
    id: "I",
    name: "I",
    description: "Yellow flag with a black disc in the centre",
    width: 100,
    layers: [
      squareBase(YELLOW),
      { k: "circle", cx: 50, cy: 50, r: 20, fill: BLACK },
    ],
  },
  {
    id: "Z",
    name: "Z",
    description:
      "Flag quartered into four triangles: yellow top, blue right, red bottom, black left",
    width: 100,
    layers: diagonalQuarters(YELLOW, BLUE, RED, BLACK),
  },
  {
    id: "U",
    name: "U",
    description: "Flag checkered red and white, red top-left and bottom-right",
    width: 100,
    layers: quarterSquare(RED, WHITE, WHITE, RED),
  },
  {
    id: "BLACK",
    name: "Black flag",
    description: "Solid black flag",
    width: 100,
    layers: [squareBase(BLACK)],
  },
  {
    id: "X",
    name: "X",
    description: "White flag with a blue diagonal cross",
    width: 100,
    layers: [squareBase(WHITE), ...saltire(BLUE, 22)],
  },
  {
    id: "FIRST_SUB",
    name: "First Substitute",
    description: "Blue pennant with a yellow triangle pointing toward the fly",
    width: 160,
    layers: [
      {
        k: "poly",
        pts: [
          [0, 0],
          [160, 50],
          [0, 100],
        ],
        fill: BLUE,
      },
      {
        k: "poly",
        pts: [
          [14, 14],
          [130, 50],
          [14, 86],
        ],
        fill: YELLOW,
      },
    ],
  },
  {
    id: "S",
    name: "S",
    description: "White flag with a blue square in the centre",
    width: 100,
    layers: [
      squareBase(WHITE),
      { k: "rect", x: 32, y: 32, w: 36, h: 36, fill: BLUE },
    ],
  },
  {
    id: "AP",
    name: "AP",
    description: "Red, white and red vertical-striped pennant",
    width: 160,
    layers: pennantVerticalStripes(160, [RED, WHITE, RED]),
  },
  {
    id: "H",
    name: "H",
    description: "Flag split vertically, white at the hoist and red at the fly",
    width: 100,
    layers: [
      { k: "rect", x: 0, y: 0, w: 50, h: 100, fill: WHITE },
      { k: "rect", x: 50, y: 0, w: 50, h: 100, fill: RED },
    ],
  },
  {
    id: "A",
    name: "A",
    description: "White and blue swallow-tailed flag, white at the hoist",
    width: 160,
    layers: [
      { k: "poly", pts: SWALLOWTAIL_POINTS, fill: WHITE },
      {
        k: "poly",
        pts: [
          [80, 0],
          [160, 0],
          [120, 50],
          [160, 100],
          [80, 100],
        ],
        fill: BLUE,
      },
    ],
  },
  {
    id: "N",
    name: "N",
    description: "Flag checkered blue and white",
    width: 100,
    layers: gridSquare(4, BLUE, WHITE),
  },
  {
    id: "L",
    name: "L",
    description: "Flag checkered yellow and black",
    width: 100,
    layers: quarterSquare(YELLOW, BLACK, BLACK, YELLOW),
  },
  {
    id: "C",
    name: "C",
    description: "Flag with three horizontal bands: blue, white and red",
    width: 100,
    layers: [
      { k: "rect", x: 0, y: 0, w: 100, h: 34, fill: BLUE },
      { k: "rect", x: 0, y: 33, w: 100, h: 34, fill: WHITE },
      { k: "rect", x: 0, y: 66, w: 100, h: 34, fill: RED },
    ],
  },
  {
    id: "Y",
    name: "Y",
    description: "Flag with diagonal red and yellow stripes",
    width: 100,
    layers: (() => {
      const shapes: FlagShape[] = [squareBase(YELLOW)];
      // Diagonal bands, clipped by eye to a 100x100 box.
      const bands: [number, number][][] = [
        [
          [-20, 0],
          [20, 0],
          [-60, 100],
          [-100, 100],
        ],
        [
          [40, 0],
          [80, 0],
          [0, 100],
          [-40, 100],
        ],
        [
          [100, 0],
          [140, 0],
          [60, 100],
          [20, 100],
        ],
      ];
      for (const pts of bands) shapes.push({ k: "poly", pts, fill: RED });
      return shapes;
    })(),
  },
  {
    id: "NUM_1",
    name: "Pennant 1",
    description: "White pennant with a red disc",
    width: 160,
    layers: pennantDisc(160, WHITE, RED),
  },
  {
    id: "NUM_2",
    name: "Pennant 2",
    description: "Blue pennant with a white disc",
    width: 160,
    layers: pennantDisc(160, BLUE, WHITE),
  },
  {
    id: "NUM_3",
    name: "Pennant 3",
    description: "Pennant in three vertical bands: red, white and blue",
    width: 160,
    layers: pennantVerticalStripes(160, [RED, WHITE, BLUE]),
  },
  {
    id: "NUM_4",
    name: "Pennant 4",
    description: "White pennant with a red cross",
    width: 160,
    layers: [
      {
        k: "poly",
        pts: [
          [0, 0],
          [160, 50],
          [0, 100],
        ],
        fill: WHITE,
      },
      ...saltire(RED, 14),
    ],
  },
  {
    id: "NUM_5",
    name: "Pennant 5",
    description:
      "Pennant split vertically, yellow at the hoist and blue at the fly",
    width: 160,
    layers: pennantVerticalStripes(160, [YELLOW, BLUE]),
  },
  {
    id: "NUM_6",
    name: "Pennant 6",
    description:
      "Pennant split diagonally, black near the hoist and white toward the fly (approximate)",
    width: 160,
    layers: [
      {
        k: "poly",
        pts: [
          [0, 0],
          [160, 50],
          [0, 100],
        ],
        fill: WHITE,
      },
      {
        k: "poly",
        pts: [
          [0, 0],
          [160, 50],
          [0, 40],
        ],
        fill: BLACK,
      },
    ],
  },
  {
    id: "NUM_7",
    name: "Pennant 7",
    description: "Pennant split horizontally, yellow above and red below",
    width: 160,
    layers: pennantHorizontalSplit(160, YELLOW, RED),
  },
  {
    id: "NUM_8",
    name: "Pennant 8",
    description: "White pennant with a red horizontal band through the middle",
    width: 160,
    layers: [
      {
        k: "poly",
        pts: [
          [0, 0],
          [160, 50],
          [0, 100],
        ],
        fill: WHITE,
      },
      {
        k: "poly",
        pts: [
          [0, 40],
          [128, 40],
          [128, 60],
          [0, 60],
        ],
        fill: RED,
      },
    ],
  },
  {
    id: "NUM_9",
    name: "Pennant 9",
    description:
      "Pennant in four sections: white, red, black and a yellow tip (approximate)",
    width: 160,
    layers: [
      { k: "rect", x: 0, y: 0, w: 80, h: 50, fill: WHITE },
      { k: "rect", x: 0, y: 50, w: 80, h: 50, fill: RED },
      {
        k: "poly",
        pts: [
          [80, 0],
          [130, 25],
          [80, 50],
        ],
        fill: BLACK,
      },
      {
        k: "poly",
        pts: [
          [80, 50],
          [130, 75],
          [80, 100],
        ],
        fill: BLACK,
      },
      {
        k: "poly",
        pts: [
          [130, 25],
          [160, 50],
          [130, 75],
        ],
        fill: YELLOW,
      },
    ],
  },
];

export const FLAG_BY_ID: Record<FlagId, FlagDef> = Object.fromEntries(
  FLAGS.map((f) => [f.id, f]),
) as Record<FlagId, FlagDef>;

export function flagDescription(ids: FlagId[]): string {
  return ids.map((id) => `Flag ${FLAG_BY_ID[id].name}`).join(" over ");
}

/** The flag's own outline, for the border stroke — a pennant or the A flag's swallowtail isn't a full rectangle. */
export function flagOutline(def: FlagDef): [number, number][] {
  if (def.id === "A") return SWALLOWTAIL_POINTS;
  if (def.width > 100) {
    return [
      [0, 0],
      [def.width, 50],
      [0, 100],
    ];
  }
  return [
    [0, 0],
    [def.width, 0],
    [def.width, 100],
    [0, 100],
  ];
}

export function flagToSvg(id: FlagId, size: number): string {
  const def = FLAG_BY_ID[id];
  const h = 100;
  const body = def.layers
    .map((l) => {
      if (l.k === "rect")
        return `<rect x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" fill="${l.fill}"/>`;
      if (l.k === "circle")
        return `<circle cx="${l.cx}" cy="${l.cy}" r="${l.r}" fill="${l.fill}"/>`;
      const pts = l.pts.map(([x, y]) => `${x},${y}`).join(" ");
      return `<polygon points="${pts}" fill="${l.fill}"/>`;
    })
    .join("");
  const w = Math.round((size * def.width) / h);
  const outline = flagOutline(def)
    .map(([x, y]) => `${x},${y}`)
    .join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${size}" viewBox="0 0 ${def.width} ${h}">${body}<polygon points="${outline}" fill="none" stroke="#00000033"/></svg>`;
}
