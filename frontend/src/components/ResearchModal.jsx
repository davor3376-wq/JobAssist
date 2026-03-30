import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Building2,
  Check,
  Globe,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Save,
  TrendingUp,
  X,
} from "lucide-react";

import { jobApi } from "../services/api";
import AIDisclosureBanner from "./AIDisclosureBanner";
import { getApiErrorMessage } from "../utils/apiError";

export default function ResearchModal({ companyName, data, loading, onClose, jobId, onRefresh }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasContactInfo = useMemo(
    () => Boolean(data?.contact_info && Object.values(data.contact_info).some(Boolean)),
    [data]
  );

  const handleSave = async () => {
    if (!jobId || !data) return;

    setSaving(true);
    try {
      const res = await jobApi.saveResearch(jobId, data);
      queryClient.setQueryData(["jobs"], (old = []) =>
        old.map((job) => (job.id === res.data.id ? res.data : job))
      );
      queryClient.setQueryData(["jobs", String(jobId)], res.data);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setSaved(true);
      toast.success("Die Recherche wurde sicher hinterlegt");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Die Recherche konnte nicht sicher hinterlegt werden"));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Building2 className="h-5 w-5 flex-shrink-0 text-blue-600" />
            <h2 className="truncate text-base font-bold text-gray-900">{companyName} - Recherche</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100"
            aria-label="Recherche schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          <AIDisclosureBanner feature="company_research" />
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-500">
              <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
              <p className="text-sm">Recherche läuft...</p>
            </div>
          ) : data ? (
            <>
              {hasContactInfo && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-800">Kontakt</h3>
                  <div className="space-y-2 rounded-xl bg-blue-50 p-4 text-sm">
                    {data.contact_info.email && (
                      <a
                        href={`mailto:${data.contact_info.email}`}
                        className="flex items-center gap-2 break-all text-blue-700 hover:text-blue-800"
                      >
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span>{data.contact_info.email}</span>
                      </a>
                    )}
                    {data.contact_info.phone && (
                      <a
                        href={`tel:${data.contact_info.phone}`}
                        className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                      >
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span>{data.contact_info.phone}</span>
                      </a>
                    )}
                    {data.contact_info.location && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span>{data.contact_info.location}</span>
                      </div>
                    )}
                    {data.contact_info.website && (
                      <a
                        href={data.contact_info.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 break-all text-blue-700 hover:text-blue-800"
                      >
                        <Globe className="h-4 w-4 flex-shrink-0" />
                        <span>{data.contact_info.website}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {data.known_data && Object.keys(data.known_data).length > 0 && (
                <div className="space-y-1.5 rounded-xl bg-gray-50 p-4 text-sm">
                  {data.known_data.ceo && (
                    <p>
                      <span className="font-medium text-gray-700">CEO:</span>{" "}
                      <span className="text-gray-600">{data.known_data.ceo}</span>
                    </p>
                  )}
                  {data.known_data.industry && (
                    <p>
                      <span className="font-medium text-gray-700">Branche:</span>{" "}
                      <span className="text-gray-600">{data.known_data.industry}</span>
                    </p>
                  )}
                  {data.known_data.employees && (
                    <p>
                      <span className="font-medium text-gray-700">Mitarbeiter:</span>{" "}
                      <span className="text-gray-600">{data.known_data.employees}</span>
                    </p>
                  )}
                  {data.known_data.founded && (
                    <p>
                      <span className="font-medium text-gray-700">Gegründet:</span>{" "}
                      <span className="text-gray-600">{data.known_data.founded}</span>
                    </p>
                  )}
                  {data.known_data.hq && (
                    <p>
                      <span className="font-medium text-gray-700">Hauptsitz:</span>{" "}
                      <span className="text-gray-600">{data.known_data.hq}</span>
                    </p>
                  )}
                  {data.known_data.mission && <p className="pt-1 italic text-gray-500">{data.known_data.mission}</p>}
                </div>
              )}

              {data.summary && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-gray-800">Zusammenfassung</h3>
                  <p className="text-sm leading-relaxed text-gray-600">{data.summary}</p>
                </div>
              )}

              {data.hot_topics?.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                    Aktuelle Themen
                  </h3>
                  <ul className="space-y-1.5">
                    {data.hot_topics.map((topic, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.smart_questions?.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                    <MessageCircle className="h-4 w-4 text-blue-500" />
                    Clevere Fragen fürs Interview
                  </h3>
                  <ul className="space-y-2">
                    {data.smart_questions.map((question, i) => (
                      <li key={i} className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-gray-600">
                        <span className="flex-shrink-0 font-semibold text-blue-600">{i + 1}.</span>
                        {question}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="py-10 text-center text-sm text-gray-400">Keine Daten verfügbar</p>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                recherche_aktualisieren (Die Unternehmensdaten neu abrufen)
              </button>
            )}
            {jobId && data && !loading && (
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 sm:w-auto"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saved ? "Sicher hinterlegt" : "recherche_sichern (Die Erkenntnisse in deiner Stelle hinterlegen)"}
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 sm:w-auto"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
