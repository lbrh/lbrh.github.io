import Head from 'next/head';
import Link from 'next/link';

export default function ToolboxShell({
  title,
  description,
  eyebrow,
  children,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="toolbox flex min-h-screen flex-col">
      <Head>
        <title>{`${title} · Toolbox`}</title>
        <meta name="description" content={description} />
        <meta name="theme-color" content="#ffffff" />
      </Head>

      <header className="border-b border-[var(--tb-border)] bg-[var(--tb-bg)]">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-6">
          <nav className="flex items-center gap-2 text-[12.5px]">
            <Link href="/toolbox" className="text-[var(--tb-text-muted)] hover:text-[var(--tb-accent)] hover:underline">
              Toolbox
            </Link>
            <span className="text-[var(--tb-text-faint)]">/</span>
            <span className="font-medium">{title}</span>
          </nav>
          {eyebrow && <span className="tb-eyebrow">{eyebrow}</span>}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>

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
