import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Building2, TrendingUp, MessageCircle, Loader2, Save, Check } from "lucide-react";
import { jobApi } from "../services/api";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export default function ResearchModal({ companyName, data, loading, onClose, jobId }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!jobId || !data) return;
    setSaving(true);
    try {
      await jobApi.saveResearch(jobId, data);
      qc.invalidateQueries({ queryKey: ["jobs"] });
      setSaved(true);
      toast.success("Recherche gespeichert!");
    } catch {
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-gray-900">
              {companyName} — Recherche
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
              <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
              <p className="text-sm">Recherche läuft…</p>
            </div>
          ) : data ? (
            <>
              {/* Known data */}
              {data.known_data && Object.keys(data.known_data).length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
                  {data.known_data.ceo && (
                    <p><span className="font-medium text-gray-700">CEO:</span> <span className="text-gray-600">{data.known_data.ceo}</span></p>
                  )}
                  {data.known_data.industry && (
                    <p><span className="font-medium text-gray-700">Branche:</span> <span className="text-gray-600">{data.known_data.industry}</span></p>
                  )}
                  {data.known_data.employees && (
                    <p><span className="font-medium text-gray-700">Mitarbeiter:</span> <span className="text-gray-600">{data.known_data.employees}</span></p>
                  )}
                  {data.known_data.founded && (
                    <p><span className="font-medium text-gray-700">Gegründet:</span> <span className="text-gray-600">{data.known_data.founded}</span></p>
                  )}
                  {data.known_data.hq && (
                    <p><span className="font-medium text-gray-700">Hauptsitz:</span> <span className="text-gray-600">{data.known_data.hq}</span></p>
                  )}
                  {data.known_data.mission && (
                    <p className="pt-1 text-gray-500 italic">{data.known_data.mission}</p>
                  )}
                </div>
              )}

              {/* AI Summary */}
              {data.summary && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Zusammenfassung</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{data.summary}</p>
                </div>
              )}

              {/* Hot Topics */}
              {data.hot_topics?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    Aktuelle Themen
                  </h3>
                  <ul className="space-y-1.5">
                    {data.hot_topics.map((topic, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Smart Questions */}
              {data.smart_questions?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-blue-500" />
                    Clevere Fragen fürs Interview
                  </h3>
                  <ul className="space-y-2">
                    {data.smart_questions.map((q, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 bg-blue-50 rounded-lg px-3 py-2">
                        <span className="font-semibold text-blue-600 flex-shrink-0">{i + 1}.</span>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-10">Keine Daten verfügbar</p>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-between items-center">
          <div>
            {jobId && data && !loading && (
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saved ? "Gespeichert" : "Speichern"}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
