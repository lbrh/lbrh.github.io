import React, { useEffect, useMemo, useState } from "react";
import ToolboxShell from "@/components/toolbox/ToolboxShell";
import { FLAG_BY_ID, flagDescription, flagToSvg } from "@/lib/raceFlags";
import { NOTICE_TYPES, findNoticeType, findVariant } from "@/lib/noticeTypes";
import { downloadPdf } from "@/lib/pdfWriter";
import {
  PAGE_H,
  PAGE_W,
  buildNoticePdfPages,
  filenameFor,
  nowTime,
  today,
  type NoticeForm,
} from "@/lib/noticePdf";

const STORAGE_KEY = "toolbox:notice-generator:org";

function blankForm(): NoticeForm {
  return {
    eventName: "",
    club: "",
    noticeNumber: "1",
    postedDate: today(),
    postedTime: nowTime(),
    classesAffected: "All",
    typeId: NOTICE_TYPES[0].id,
    variantId: NOTICE_TYPES[0].variants[0].id,
    extra: { hours: "1" },
    body: NOTICE_TYPES[0].variants[0].defaultBody({ hours: "1" }),
    officerName: "",
    officerRole: "Race Officer",
  };
}

export default function NoticeGenerator() {
  const [form, setForm] = useState<NoticeForm>(blankForm());
  const [bodyEdited, setBodyEdited] = useState(false);
  const [history, setHistory] = useState<{ id: number; form: NoticeForm }[]>(
    [],
  );
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      setForm((f) => ({
        ...f,
        club: typeof saved.club === "string" ? saved.club : f.club,
        officerName:
          typeof saved.officerName === "string"
            ? saved.officerName
            : f.officerName,
        officerRole:
          typeof saved.officerRole === "string"
            ? saved.officerRole
            : f.officerRole,
      }));
    } catch {
      /* storage unavailable or corrupt; start blank */
    }
    setRestored(true);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          club: form.club,
          officerName: form.officerName,
          officerRole: form.officerRole,
        }),
      );
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [restored, form.club, form.officerName, form.officerRole]);

  const type = useMemo(() => findNoticeType(form.typeId), [form.typeId]);
  const variant = useMemo(
    () => findVariant(type, form.variantId),
    [type, form.variantId],
  );
  const flagIds = useMemo(
    () => variant.flags(form.extra),
    [variant, form.extra],
  );

  // Switching type/variant/extra fields re-primes the standard wording,
  // unless the officer has started editing it — then their edit wins.
  useEffect(() => {
    if (bodyEdited) return;
    setForm((f) => ({ ...f, body: variant.defaultBody(f.extra) }));
  }, [variant, form.extra, bodyEdited]);

  const set = <K extends keyof NoticeForm>(key: K, value: NoticeForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const changeType = (typeId: string) => {
    const t = findNoticeType(typeId);
    const v = t.variants[0];
    const extra: Record<string, string> = {};
    for (const field of v.extraFields ?? [])
      extra[field.id] = field.id === "hours" ? "1" : "";
    setForm((f) => ({ ...f, typeId, variantId: v.id, extra }));
    setBodyEdited(false);
  };

  const changeVariant = (variantId: string) => {
    const v = findVariant(type, variantId);
    const extra: Record<string, string> = {};
    for (const field of v.extraFields ?? [])
      extra[field.id] = field.id === "hours" ? "1" : "";
    setForm((f) => ({ ...f, variantId, extra }));
    setBodyEdited(false);
  };

  const resetWording = () => {
    setBodyEdited(false);
    setForm((f) => ({ ...f, body: variant.defaultBody(f.extra) }));
  };

  const pages = useMemo(
    () => buildNoticePdfPages(form, type, variant),
    [form, type, variant],
  );

  const download = () => {
    downloadPdf(pages, PAGE_W, PAGE_H, filenameFor(form));
    setHistory((h) => [...h, { id: Date.now(), form }]);
  };

  const print = () => {
    window.print();
  };

  return (
    <ToolboxShell
      eyebrow="Tool 10"
      title="Notice to Competitors Generator"
      description="Generate a Notice to Competitors with the correct race signal flag, ready to post or print."
    >
      <h1 className="tb-display tb-anim-rise text-[26px] leading-tight no-print">
        Notice to Competitors Generator
      </h1>
      <p
        className="tb-anim-rise mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--tb-text-muted)] no-print"
        style={{ animationDelay: "0.04s" }}
      >
        Pick the type of notice, fill in the details, and the flag and standard
        wording are filled in for you. Edit the body text freely, then download
        a vector PDF or print it directly.
      </p>

      <div
        className="tb-anim-rise tb-card mt-8 p-6 no-print"
        style={{ animationDelay: "0.08s" }}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm">
            <span className="tb-eyebrow">Event / series name</span>
            <input
              type="text"
              value={form.eventName}
              onChange={(e) => set("eventName", e.target.value)}
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="tb-eyebrow">Club</span>
            <input
              type="text"
              value={form.club}
              onChange={(e) => set("club", e.target.value)}
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="tb-eyebrow">Notice number</span>
            <input
              type="text"
              value={form.noticeNumber}
              onChange={(e) => set("noticeNumber", e.target.value)}
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="tb-eyebrow">Date posted</span>
            <input
              type="date"
              value={form.postedDate}
              onChange={(e) => set("postedDate", e.target.value)}
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="tb-eyebrow">Time posted</span>
            <div className="mt-1 flex gap-2">
              <input
                type="time"
                value={form.postedTime}
                onChange={(e) => set("postedTime", e.target.value)}
                className="tb-input w-full px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  set("postedDate", today());
                  set("postedTime", nowTime());
                }}
                className="tb-btn-ghost px-3 py-2 text-xs"
              >
                Now
              </button>
            </div>
          </label>
          <label className="block text-sm">
            <span className="tb-eyebrow">Race / class affected</span>
            <input
              type="text"
              value={form.classesAffected}
              onChange={(e) => set("classesAffected", e.target.value)}
              placeholder="All, or e.g. Div 1, Div 2"
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="tb-eyebrow">Race officer name</span>
            <input
              type="text"
              value={form.officerName}
              onChange={(e) => set("officerName", e.target.value)}
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="tb-eyebrow">Role</span>
            <input
              type="text"
              value={form.officerRole}
              onChange={(e) => set("officerRole", e.target.value)}
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="tb-rule my-5" />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="tb-eyebrow">Notice type</span>
            <select
              value={form.typeId}
              onChange={(e) => changeType(e.target.value)}
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
            >
              {NOTICE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          {type.variants.length > 1 && (
            <label className="block text-sm">
              <span className="tb-eyebrow">Flag</span>
              <select
                value={form.variantId}
                onChange={(e) => changeVariant(e.target.value)}
                className="tb-input mt-1 w-full px-3 py-2 text-sm"
              >
                {type.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {type.note && (
          <p className="mt-3 text-[12px] text-[var(--tb-text-muted)]">
            {type.note}
          </p>
        )}

        {(variant.extraFields ?? []).length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {variant.extraFields!.map((field) => (
              <label
                key={field.id}
                className={`block text-sm ${field.type === "textarea" ? "sm:col-span-2" : ""}`}
              >
                <span className="tb-eyebrow">{field.label}</span>
                {field.type === "textarea" ? (
                  <textarea
                    value={form.extra[field.id] ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        extra: { ...f.extra, [field.id]: e.target.value },
                      }))
                    }
                    rows={3}
                    className="tb-input mt-1 w-full px-3 py-2 text-sm"
                  />
                ) : (
                  <input
                    type={field.type === "number" ? "number" : "text"}
                    min={field.type === "number" ? 1 : undefined}
                    max={field.type === "number" ? 9 : undefined}
                    value={form.extra[field.id] ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        extra: { ...f.extra, [field.id]: e.target.value },
                      }))
                    }
                    placeholder={field.placeholder}
                    className="tb-input mt-1 w-full px-3 py-2 text-sm"
                  />
                )}
              </label>
            ))}
          </div>
        )}

        <label className="mt-4 block text-sm">
          <span className="tb-eyebrow flex items-center justify-between">
            Notice body
            {bodyEdited && (
              <button
                type="button"
                onClick={resetWording}
                className="tb-btn-ghost px-2 py-0.5 text-[10.5px] normal-case"
              >
                Reset to standard wording
              </button>
            )}
          </span>
          <textarea
            value={form.body}
            onChange={(e) => {
              setBodyEdited(true);
              set("body", e.target.value);
            }}
            rows={5}
            className="tb-input mt-1 w-full px-3 py-2 text-sm"
          />
        </label>

        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={download} className="tb-btn px-4 py-2 text-sm">
            Download PDF
          </button>
          <button onClick={print} className="tb-btn-ghost px-4 py-2 text-sm">
            Print
          </button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="tb-card mt-6 p-6 no-print">
          <h2 className="tb-display text-[15px]">
            This session&apos;s notices
          </h2>
          <ul className="mt-2 divide-y divide-[var(--tb-border)]">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span>
                  {filenameFor(h.form)} — {findNoticeType(h.form.typeId).title}
                </span>
                <button
                  onClick={() =>
                    downloadPdf(
                      buildNoticePdfPages(
                        h.form,
                        findNoticeType(h.form.typeId),
                        findVariant(
                          findNoticeType(h.form.typeId),
                          h.form.variantId,
                        ),
                      ),
                      PAGE_W,
                      PAGE_H,
                      filenameFor(h.form),
                    )
                  }
                  className="tb-btn-ghost px-3 py-1 text-xs"
                >
                  Download again
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div id="notice-preview" className="tb-card mt-8 bg-white p-10">
        <div className="mx-auto max-w-[520px]">
          <h2 className="text-center text-[20px] font-bold tracking-wide">
            NOTICE TO COMPETITORS
          </h2>
          <div className="tb-rule my-4" />
          <div className="flex items-baseline justify-between text-[13px]">
            <strong>{form.eventName || "[event name]"}</strong>
            <span>Notice No. {form.noticeNumber || "-"}</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between text-[11px] text-[var(--tb-text-muted)]">
            <span>{form.club || "[club]"}</span>
            <span>
              Posted: {form.postedDate} {form.postedTime}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[var(--tb-text-muted)]">
            Race / class affected: {form.classesAffected || "All"}
          </p>

          <div className="tb-rule my-5" />

          <div className="flex flex-col items-center gap-1.5">
            {flagIds.map((id) => (
              <div
                key={id}
                dangerouslySetInnerHTML={{ __html: flagToSvg(id, 80) }}
              />
            ))}
            <p className="mt-2 text-[16px] font-semibold">
              {flagIds.map((id) => FLAG_BY_ID[id].name).join(" over ")}
            </p>
            <p className="text-center text-[11px] text-[var(--tb-text-muted)]">
              {flagDescription(flagIds)}
            </p>
          </div>

          <h3 className="mt-6 text-[13px] font-bold uppercase tracking-wide">
            {type.title}
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed">
            {form.body}
          </p>

          <div className="tb-rule mt-10 mb-3" />
          <p className="text-[11px]">
            Issued by {form.officerName || "[race officer]"},{" "}
            {form.officerRole || "Race Officer"}
          </p>
          <p className="mt-4 text-[9.5px] text-[var(--tb-text-faint)]">
            Reference only. The race committee is responsible for the content of
            this notice and for posting it in accordance with the sailing
            instructions.
          </p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          .toolbox > header,
          .toolbox > footer,
          .no-print {
            display: none !important;
          }
          .toolbox > main {
            padding: 0 !important;
          }
          #notice-preview {
            border: none !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </ToolboxShell>
  );
}
