export const PALETTE_ITEMS = [
  { kind: 'standard', label: 'Standard Mark', hint: 'Plain rounding mark' },
  { kind: 'windward', label: 'Windward Mark', hint: 'Top of the beat' },
  { kind: 'leeward', label: 'Leeward Mark', hint: 'Bottom of the run' },
  { kind: 'offset', label: 'Offset Mark', hint: 'Attaches to a parent' },
  { kind: 'gate', label: 'Gate', hint: 'Creates a linked pair' },
  { kind: 'reach', label: 'Reach Mark', hint: 'Wing / reaching mark' },
  { kind: 'start', label: 'Start Line', hint: 'Boat + pin ends' },
  { kind: 'finish', label: 'Finish Line', hint: 'Boat + pin ends' },
  { kind: 'wind', label: 'Wind Arrow', hint: 'Rotatable direction' },
  { kind: 'note', label: 'Text Label', hint: 'Free annotation' },
] as const;

export type PaletteKind = (typeof PALETTE_ITEMS)[number]['kind'];

function Glyph({ kind }: { kind: string }) {
  const s = { width: 30, height: 24 };
  switch (kind) {
    case 'gate':
      return (
        <svg {...s} viewBox="0 0 30 24">
          <line x1="6" y1="12" x2="24" y2="12" stroke="#8a8a8a" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx="6" cy="12" r="5" fill="#f2c230" stroke="#111" strokeWidth="1.5" />
          <circle cx="24" cy="12" r="5" fill="#f2c230" stroke="#111" strokeWidth="1.5" />
        </svg>
      );
    case 'offset':
      return (
        <svg {...s} viewBox="0 0 30 24">
          <line x1="9" y1="10" x2="21" y2="15" stroke="#b9b9b9" strokeWidth="1.25" strokeDasharray="2 2" />
          <circle cx="9" cy="10" r="6" fill="#f26722" stroke="#111" strokeWidth="1.5" />
          <circle cx="22" cy="16" r="4" fill="#f26722" stroke="#111" strokeWidth="1.5" />
        </svg>
      );
    case 'start':
    case 'finish':
      return (
        <svg {...s} viewBox="0 0 30 24">
          <line
            x1="6"
            y1="12"
            x2="24"
            y2="12"
            stroke="#111"
            strokeWidth="2"
            strokeDasharray={kind === 'finish' ? '4 3' : undefined}
          />
          <circle cx="6" cy="12" r="3.5" fill="#fff" stroke="#111" strokeWidth="2" />
          <polygon points="19,8 26,8 28,12 26,16 19,16" fill="#fff" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case 'wind':
      return (
        <svg {...s} viewBox="0 0 30 24">
          <line x1="15" y1="4" x2="15" y2="17" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
          <polygon points="15,21 11,14 19,14" fill="#111" />
        </svg>
      );
    case 'note':
      return (
        <svg {...s} viewBox="0 0 30 24">
          <text x="15" y="17" textAnchor="middle" fontSize="15" fontWeight="700" fill="#111" fontFamily="Helvetica">
            Aa
          </text>
        </svg>
      );
    default: {
      const fill = kind === 'leeward' ? '#f2c230' : kind === 'reach' ? '#2e8b4f' : '#f26722';
      return (
        <svg {...s} viewBox="0 0 30 24">
          <circle cx="15" cy="12" r="8" fill={fill} stroke="#111" strokeWidth="2" />
        </svg>
      );
    }
  }
}

export default function Palette({ onAdd }: { onAdd: (kind: PaletteKind) => void }) {
  return (
    <div className="space-y-1">
      <p className="tb-eyebrow block px-1 pb-2">
        Drag onto the canvas
      </p>
      {PALETTE_ITEMS.map((it) => (
        <button
          key={it.kind}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/x-course-item', it.kind);
            e.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => onAdd(it.kind)}
          title={`${it.hint} — drag onto the canvas, or click to drop in the centre`}
          className="flex w-full items-center gap-2.5 border border-transparent px-2 py-1.5 text-left transition hover:border-[var(--tb-border)] hover:bg-[var(--tb-bg)]"
        >
          <span className="flex h-6 w-[30px] shrink-0 items-center justify-center">
            <Glyph kind={it.kind} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12.5px] font-medium leading-tight">{it.label}</span>
            <span className="block truncate text-[10.5px] leading-tight text-[var(--tb-text-muted)]">{it.hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
