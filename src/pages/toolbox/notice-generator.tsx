import React, { useEffect, useMemo, useState } from "react";
import ToolboxShell from "@/components/toolbox/ToolboxShell";
import { flagToSvg } from "@/lib/raceFlags";
import { NOTICE_TYPES, findNoticeType, findVariant } from "@/lib/noticeTypes";
import { downloadPdf, loadJpeg, type PdfImage } from "@/lib/pdfWriter";
import {
  CREST_ID,
  CREST_URL,
  PAGE_H,
  PAGE_W,
  appliesTo,
  buildNoticePdfPages,
  filenameFor,
  longDate,
  nowTime,
  signoffStamp,
  today,
  typeHeading,
  type NoticeForm,
} from "@/lib/noticePdf";

const STORAGE_KEY = "toolbox:notice-generator:org";

function blankForm(): NoticeForm {
  return {
    eventName: "",
    noticeNumber: "1",
    postedDate: today(),
    postedTime: nowTime(),
    classesAffected: "All",
    typeId: NOTICE_TYPES[0].id,
    variantId: NOTICE_TYPES[0].variants[0].id,
    extra: { hours: "1" },
    body: NOTICE_TYPES[0].variants[0].defaultBody({ hours: "1" }),
    rationale: "",
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
          officerName: form.officerName,
          officerRole: form.officerRole,
        }),
      );
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [restored, form.officerName, form.officerRole]);

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

  const exportPdf = async (f: NoticeForm) => {
    const t = findNoticeType(f.typeId);
    const crest = await loadJpeg(CREST_URL);
    const images: Record<string, PdfImage> = crest ? { [CREST_ID]: crest } : {};
    downloadPdf(
      buildNoticePdfPages(f, t, findVariant(t, f.variantId), !!crest),
      PAGE_W,
      PAGE_H,
      filenameFor(f),
      images,
    );
  };

  const download = async () => {
    await exportPdf(form);
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
            <span className="tb-eyebrow">Notice number (filename)</span>
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

        <label className="mt-4 block text-sm">
          <span className="tb-eyebrow">Rationale (optional)</span>
          <textarea
            value={form.rationale}
            onChange={(e) => set("rationale", e.target.value)}
            rows={3}
            placeholder="Why the change was made, or the forecast it is based on"
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
                  onClick={() => exportPdf(h.form)}
                  className="tb-btn-ghost px-3 py-1 text-xs"
                >
                  Download again
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        id="notice-preview"
        className="mx-auto mt-8 max-w-[600px] border border-black bg-white p-8 text-[#1a1a1a]"
        style={{ aspectRatio: "495 / 722" }}
      >
        <div className="relative flex min-h-full flex-col">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CREST_URL}
            alt="Royal Yacht Club of Victoria crest"
            className="absolute left-0 top-0 h-[84px] w-[60px]"
          />
          <div className="absolute right-0 top-0 flex flex-col items-end gap-1">
            {flagIds.map((id) => (
              <div
                key={id}
                dangerouslySetInnerHTML={{ __html: flagToSvg(id, 40) }}
              />
            ))}
          </div>
          <div className="pt-4 text-center">
            <h2 className="text-[26px] font-bold leading-tight">
              Notice to Competitors
            </h2>
            {form.eventName.trim() && (
              <p className="text-[16px] font-bold">{form.eventName.trim()}</p>
            )}
            <p className="text-[16px] font-bold">{longDate(form.postedDate)}</p>
          </div>

          <div className="mt-24 flex-1 px-1 text-[13px] leading-relaxed">
            {typeHeading(type) && (
              <p className="mb-3 font-bold">{typeHeading(type)}</p>
            )}
            {appliesTo(form) && <p className="mb-3">{appliesTo(form)}</p>}
            <p className="whitespace-pre-wrap">{form.body}</p>
            {form.rationale.trim() && (
              <>
                <p className="mt-3 font-bold">Rationale:</p>
                <p className="whitespace-pre-wrap">{form.rationale}</p>
              </>
            )}
          </div>

          <div className="mt-10 px-1 text-[13px]">
            <p>{form.officerName || "[race officer]"}</p>
            <p className="italic">{form.officerRole || "Race Officer"}</p>
            <p className="italic">{signoffStamp(form)}</p>
          </div>
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
            border: 1px solid #000 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </ToolboxShell>
  );
}
