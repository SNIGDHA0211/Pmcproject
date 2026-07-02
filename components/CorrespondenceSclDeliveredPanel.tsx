import React, { useMemo, useState } from "react";
import type {
  CorrespondenceSclDelivered,
  CorrespondenceSclPartyCounts,
} from "../services/api";
import { ModalPortal } from "./ModalPortal";
import { validateCorrespondenceSclPartyCountsInput } from "../utils/correspondence";
import { DASHBOARD_STATUS_METRIC_LABEL_CLASS, getThemeClasses, useTheme } from "../utils/theme";

export type SclDeliveredFormValues = {
  client_received: number;
  client_delivered: number;
  contractor_received: number;
  contractor_delivered: number;
  other_agency_received: number;
  other_agency_delivered: number;
};

interface CorrespondenceSclDeliveredPanelProps {
  scl: CorrespondenceSclDelivered;
  isSaving?: boolean;
  onSave: (values: SclDeliveredFormValues) => Promise<void>;
  onAddDocument?: () => void;
}

const ROWS: {
  key: keyof Pick<
    CorrespondenceSclDelivered,
    "client" | "contractor" | "other_agency" | "totals"
  >;
  label: string;
  accent: string;
}[] = [
    { key: "client", label: "Client", accent: "text-blue-600" },
    { key: "contractor", label: "Contractor", accent: "text-violet-600" },
    { key: "other_agency", label: "Other Agency", accent: "text-slate-600" },
    { key: "totals", label: "Total", accent: "text-emerald-600" },
  ];

function sclToForm(scl: CorrespondenceSclDelivered): SclDeliveredFormValues {
  return {
    client_received: scl.client.received,
    client_delivered: scl.client.delivered,
    contractor_received: scl.contractor.received,
    contractor_delivered: scl.contractor.delivered,
    other_agency_received: scl.other_agency.received,
    other_agency_delivered: scl.other_agency.delivered,
  };
}

function parseCountInput(raw: string): number {
  if (raw === "") return 0;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.trunc(parsed);
}

function validateSclForm(form: SclDeliveredFormValues): string | null {
  const parties = [
    {
      label: "Client",
      received: form.client_received,
      delivered: form.client_delivered,
    },
    {
      label: "Contractor",
      received: form.contractor_received,
      delivered: form.contractor_delivered,
    },
    {
      label: "Other Agency",
      received: form.other_agency_received,
      delivered: form.other_agency_delivered,
    },
  ];

  for (const party of parties) {
    const error = validateCorrespondenceSclPartyCountsInput(party);
    if (error) return error;
  }
  return null;
}

const fmt = (n: number) => n.toLocaleString("en-IN");

const CorrespondenceSclDeliveredPanel: React.FC<
  CorrespondenceSclDeliveredPanelProps
> = ({ scl, isSaving = false, onSave, onAddDocument }) => {
  const { isDarkTheme } = useTheme();
  const themeClasses = getThemeClasses(isDarkTheme);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<SclDeliveredFormValues>(() => sclToForm(scl));
  const [localError, setLocalError] = useState<string | null>(null);

  const openModal = () => {
    setForm(sclToForm(scl));
    setLocalError(null);
    setIsModalOpen(true);
  };

  const formPreviewTotal = useMemo(
    () =>
      form.client_delivered +
      form.contractor_delivered +
      form.other_agency_delivered,
    [form],
  );

  const renderCount = (
    tone: "received" | "delivered" | "record" | "pending",
    party: CorrespondenceSclPartyCounts,
    isTotal = false,
  ) => {
    const n =
      tone === "received"
        ? party.received
        : tone === "delivered"
          ? party.delivered
          : tone === "record"
            ? party.record
            : party.pending;
    const color =
      tone === "received"
        ? isDarkTheme
          ? "text-slate-200"
          : "text-slate-800"
        : tone === "delivered"
          ? isDarkTheme
            ? "text-emerald-400"
            : "text-emerald-600"
          : tone === "record"
            ? isDarkTheme
              ? "text-slate-300"
              : "text-slate-700"
            : isDarkTheme
              ? "text-amber-400"
              : "text-amber-600";
    return (
      <span
        className={`font-black tabular-nums ${isTotal ? "text-base sm:text-lg" : "text-sm sm:text-base"} ${color}`}
      >
        {fmt(n)}
      </span>
    );
  };

  const inputClass = `w-full rounded-lg border px-3 py-2 text-sm outline-none transition ${isDarkTheme
      ? "border-white/10 bg-slate-800 text-white focus:border-blue-500"
      : "border-slate-300 bg-white focus:border-blue-500"
    }`;

  return (
    <>
      <div
        className={`rounded-lg border px-2.5 py-2 sm:px-3 sm:py-2.5 ${isDarkTheme
            ? "border-white/10 bg-white/[0.03]"
            : "border-slate-200 bg-white shadow-sm"
          }`}
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h4
            className={`text-[10px] font-bold uppercase tracking-widest sm:text-xs ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}
          >
            SCL Delivered Correspondence
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            {onAddDocument && (
              <button
                type="button"
                onClick={onAddDocument}
                className="rounded-md border border-blue-600 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 sm:text-sm dark:hover:bg-blue-500/10"
              >
                Add Document
              </button>
            )}
            <button
              type="button"
              onClick={openModal}
              className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 sm:text-sm"
            >
              Edit SCL
            </button>
          </div>
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[400px] border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className={isDarkTheme ? "text-slate-400" : "text-slate-500"}>
                <th className="pb-2 pr-2 font-semibold uppercase tracking-wide">Party</th>
                <th className="pb-2 px-2 text-center font-semibold uppercase tracking-wide">Received</th>
                <th className="pb-2 px-2 text-center font-semibold uppercase tracking-wide">Delivered</th>
                <th className="pb-2 px-2 text-center font-semibold uppercase tracking-wide">Record</th>
                <th className="pb-2 pl-2 text-center font-semibold uppercase tracking-wide">Pending</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const party = scl[row.key];
                const isTotal = row.key === "totals";
                return (
                  <tr
                    key={row.key}
                    className={`border-t ${isDarkTheme ? "border-white/10" : "border-slate-100"}`}
                  >
                    <td
                      className={`py-2 pr-2 font-semibold ${isTotal ? "font-bold" : ""} ${isDarkTheme ? row.accent.replace("600", "400") : row.accent
                        }`}
                    >
                      {row.label}
                    </td>
                    <td className="px-2 py-2 text-center">{renderCount("received", party, isTotal)}</td>
                    <td className="px-2 py-2 text-center">{renderCount("delivered", party, isTotal)}</td>
                    <td className="px-2 py-2 text-center">{renderCount("record", party, isTotal)}</td>
                    <td className="py-2 pl-2 text-center">{renderCount("pending", party, isTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:hidden">
          {ROWS.map((row) => {
            const party = scl[row.key];
            const isTotal = row.key === "totals";
            return (
              <div
                key={row.key}
                className={`rounded-md border px-2.5 py-2 ${isDarkTheme ? "border-white/10 bg-white/[0.02]" : "border-slate-100 bg-slate-50"
                  }`}
              >
                <p
                  className={`mb-1.5 text-xs font-bold uppercase tracking-wide ${isDarkTheme ? row.accent.replace("600", "400") : row.accent
                    }`}
                >
                  {row.label}
                </p>
                <div className="grid grid-cols-4 gap-1 text-center">
                  {(
                    [
                      ["Received", "received"],
                      ["Delivered", "delivered"],
                      ["Record", "record"],
                      ["Pending", "pending"],
                    ] as const
                  ).map(([label, tone]) => (
                    <div key={tone}>
                      <p
                        className={`text-[9px] font-semibold uppercase ${DASHBOARD_STATUS_METRIC_LABEL_CLASS(isDarkTheme)}`}
                      >
                        {label}
                      </p>
                      <div className="mt-0.5">{renderCount(tone, party, isTotal)}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen && (
        <ModalPortal open>
          <div
            className="fixed inset-0 z-[300] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border shadow-2xl sm:max-w-lg sm:rounded-2xl ${isDarkTheme ? "border-white/10 bg-slate-900" : "border-slate-200 bg-white"
                }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-5 sm:py-4 ${isDarkTheme ? "border-white/10" : "border-slate-200"
                  }`}
              >
                <div>
                  <h3 className="text-base font-bold sm:text-lg">SCL Delivered Correspondence</h3>
                  <p className={`mt-0.5 text-xs ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
                    Enter received and delivered counts per party
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`rounded-lg p-2 ${isDarkTheme ? "hover:bg-white/10" : "hover:bg-slate-100"}`}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
                {(
                  [
                    {
                      title: "Client",
                      receivedKey: "client_received" as const,
                      deliveredKey: "client_delivered" as const,
                    },
                    {
                      title: "Contractor",
                      receivedKey: "contractor_received" as const,
                      deliveredKey: "contractor_delivered" as const,
                    },
                    {
                      title: "Other Agency",
                      receivedKey: "other_agency_received" as const,
                      deliveredKey: "other_agency_delivered" as const,
                    },
                  ] as const
                ).map((section) => {
                  const received = form[section.receivedKey];
                  const delivered = form[section.deliveredKey];
                  return (
                    <div
                      key={section.title}
                      className={`rounded-xl border p-3 ${isDarkTheme ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-slate-50/80"
                        }`}
                    >
                      <p className="mb-2 text-sm font-bold">{section.title}</p>
                      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                        <div>
                          <label className={`mb-1 block text-xs font-semibold ${themeClasses.textSecondary}`}>
                            Received
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={received}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                [section.receivedKey]: parseCountInput(e.target.value),
                              }))
                            }
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={`mb-1 block text-xs font-semibold ${themeClasses.textSecondary}`}>
                            Delivered
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={delivered}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                [section.deliveredKey]: parseCountInput(e.target.value),
                              }))
                            }
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div
                  className={`rounded-xl border p-3 ${isDarkTheme ? "border-blue-500/20 bg-blue-500/10" : "border-blue-100 bg-blue-50"
                    }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total Delivered
                  </p>
                  <p className="mt-1 text-2xl font-black tabular-nums text-blue-600">
                    {fmt(formPreviewTotal)}
                  </p>
                </div>

                {localError && <p className="text-sm font-semibold text-rose-500">{localError}</p>}
              </div>

              <div
                className={`flex shrink-0 flex-col-reverse gap-2 border-t p-4 sm:flex-row sm:justify-end sm:px-5 sm:py-4 ${isDarkTheme ? "border-white/10" : "border-slate-200"
                  }`}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold ${isDarkTheme
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={async () => {
                    const validation = validateSclForm(form);
                    if (validation) {
                      setLocalError(validation);
                      return;
                    }
                    setLocalError(null);
                    await onSave(form);
                    setIsModalOpen(false);
                  }}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {isSaving ? "Saving…" : "Save Correspondence"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
};

export default React.memo(CorrespondenceSclDeliveredPanel);
