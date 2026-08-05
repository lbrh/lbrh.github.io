import Link from 'next/link';
import Head from 'next/head';
import WindSummary from '@/components/toolbox/WindSummary';

type Tool = {
  n: string;
  title: string;
  href: string;
  blurb: string;
  tags: string[];
};

const TOOLS: Tool[] = [
  {
    n: '01',
    title: 'Risk Assessment',
    href: '/toolbox/risk-assessment',
    blurb:
      'Pull live weather and marine forecasts for Port Phillip and produce a documented go / no-go recommendation for race day.',
    tags: ['Live data', 'Print'],
  },
  {
    n: '02',
    title: 'Start Sheets',
    href: '/toolbox/start-sheets',
    blurb:
      'Convert a race entrant CSV into printable pursuit or fleet start sheets, including a sign-on sheet for the front desk.',
    tags: ['CSV', 'Print'],
  },
  {
    n: '03',
    title: 'QR Code',
    href: '/toolbox/qr-code',
    blurb:
      'Generate a high-resolution QR code for booking links, crew registration or race notices.',
    tags: ['Utility'],
  },
  {
    n: '04',
    title: 'W/L Designer',
    href: '/toolbox/course-maker',
    blurb:
      'Build windward-leeward race course diagrams on an infinite canvas and export them to PNG, SVG or PDF for the sailing instructions.',
    tags: ['Diagramming', 'Export'],
  },
  {
    n: '05',
    title: 'Bay Marks',
    href: '/toolbox/bay-marks',
    blurb:
      'A searchable reference chart of every navigation mark in Port Phillip Bay, filterable by category with full position detail.',
    tags: ['Reference', 'Mapping'],
  },
  {
    n: '06',
    title: 'Mark Course Planner',
    href: '/toolbox/course-planner',
    blurb:
      'Lay a fixed-mark course by selecting marks in order, then total each leg in nautical miles and export the schedule as CSV.',
    tags: ['Mapping', 'CSV'],
  },
];

function ToolRow({ tool, delay }: { tool: Tool; delay: number }) {
  return (
    <Link
      href={tool.href}
      className="tb-tool-card tb-card tb-anim-rise group block p-5"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="tb-eyebrow">{tool.n}</span>
        <div className="flex gap-1.5">
          {tool.tags.map((t) => (
            <span
              key={t}
              className="border border-[var(--tb-border)] bg-[var(--tb-surface)] px-1.5 py-0.5 text-[10.5px] text-[var(--tb-text-muted)]"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <h2 className="tb-display mt-2.5 text-[17px]">{tool.title}</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--tb-text-muted)]">{tool.blurb}</p>

      <span className="mt-3.5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--tb-accent)]">
        Open
        <span className="tb-tool-arrow inline-block">→</span>
      </span>
    </Link>
  );
}

export default function ToolboxIndex() {
  return (
    <div className="toolbox flex min-h-screen flex-col">
      <Head>
        <title>Toolbox · Liam Robinson Hounsell</title>
        <meta
          name="description"
          content="Six browser-based tools for sailing race management — course diagrams, risk assessment, course planning, mark reference, start sheets and QR codes."
        />
        <meta name="theme-color" content="#ffffff" />
      </Head>

      <header className="border-b border-[var(--tb-border)] bg-[var(--tb-bg)]">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-6">
          <nav className="flex items-center gap-2 text-[12.5px]">
            <Link href="/" className="text-[var(--tb-text-muted)] hover:text-[var(--tb-accent)] hover:underline">
              Portfolio
            </Link>
            <span className="text-[var(--tb-text-faint)]">/</span>
            <span className="font-medium">Toolbox</span>
          </nav>
          <span className="tb-eyebrow">{TOOLS.length} Tools</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <div className="max-w-2xl">
          <p className="tb-eyebrow tb-anim-rise">Race Management · Port Phillip Bay</p>
          <h1 className="tb-display tb-anim-rise mt-2 text-[30px] leading-tight" style={{ animationDelay: '0.04s' }}>
            Toolbox
          </h1>
          <p
            className="tb-anim-rise mt-3 text-[14px] leading-relaxed text-[var(--tb-text-muted)]"
            style={{ animationDelay: '0.08s' }}
          >
            A set of small, single-purpose tools built for club race days: drawing courses, reading the
            forecast, planning long-distance legs, locating a mark, and printing the start sheet. Each runs
            entirely in the browser — nothing is uploaded, and no account is required.
          </p>
        </div>

        <div className="tb-rule tb-anim-rise mt-8" style={{ animationDelay: '0.1s' }} />

        <div className="tb-anim-rise mt-8" style={{ animationDelay: '0.12s' }}>
          <WindSummary />
        </div>

        <div className="tb-rule tb-anim-rise mt-8" style={{ animationDelay: '0.14s' }} />

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t, i) => (
            <ToolRow key={t.href} tool={t} delay={0.16 + i * 0.04} />
          ))}
        </div>
      </main>

      <footer className="border-t border-[var(--tb-border)] bg-[var(--tb-surface)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4">
          <p className="text-[12px] text-[var(--tb-text-muted)]">
            Runs entirely in your browser. No data is uploaded or stored.
          </p>
          <p className="text-[12px] text-[var(--tb-text-faint)]">
            Reference only — not for navigation. Not official weather data; check BOM to confirm.
          </p>
        </div>
      </footer>
    </div>
  );
}
