import { useState } from "react";
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
import { getApiErrorMessage } from "../utils/apiError";

export default function ResearchModal({ companyName, data, loading, onClose, jobId, onRefresh }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!jobId || !data) return;
    setSaving(true);
    try {
      const res = await jobApi.saveResearch(jobId, data);
      qc.setQueryData(["jobs"], (old = []) =>
        old.map((job) => (job.id === res.data.id ? res.data : job))
      );
      qc.setQueryData(["jobs", String(jobId)], res.data);
      qc.invalidateQueries({ queryKey: ["jobs"] });
      setSaved(true);
      toast.success("Recherche gespeichert!");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Speichern fehlgeschlagen"));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-gray-900">{companyName} - Recherche</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-500">
              <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
              <p className="text-sm">Recherche läuft...</p>
            </div>
          ) : data ? (
            <>
              {data.contact_info && Object.values(data.contact_info).some(Boolean) && (
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
                  {data.known_data.ceo && <p><span className="font-medium text-gray-700">CEO:</span> <span className="text-gray-600">{data.known_data.ceo}</span></p>}
                  {data.known_data.industry && <p><span className="font-medium text-gray-700">Branche:</span> <span className="text-gray-600">{data.known_data.industry}</span></p>}
                  {data.known_data.employees && <p><span className="font-medium text-gray-700">Mitarbeiter:</span> <span className="text-gray-600">{data.known_data.employees}</span></p>}
                  {data.known_data.founded && <p><span className="font-medium text-gray-700">Gegründet:</span> <span className="text-gray-600">{data.known_data.founded}</span></p>}
                  {data.known_data.hq && <p><span className="font-medium text-gray-700">Hauptsitz:</span> <span className="text-gray-600">{data.known_data.hq}</span></p>}
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

        <div className="flex items-center justify-between border-t px-6 py-4">
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Aktualisieren
              </button>
            )}
            {jobId && data && !loading && (
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saved ? "Gespeichert" : "Speichern"}
              </button>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100">
            Schließen
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
