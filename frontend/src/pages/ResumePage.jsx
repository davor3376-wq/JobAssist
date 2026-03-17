import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Upload, Trash2, FileText } from "lucide-react";
import { resumeApi } from "../services/api";

export default function ResumePage() {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: resumes = [], isLoading } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: resumeApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resumes"] });
      toast.success("Lebenslauf gelöscht");
    },
    onError: () => toast.error("Lebenslauf konnte nicht gelöscht werden"),
  });

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await resumeApi.upload(formData);
      qc.invalidateQueries({ queryKey: ["resumes"] });
      toast.success("Lebenslauf hochgeladen und analysiert!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }, [qc]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"] },
    maxFiles: 1,
    disabled: uploading,
  });

  const formatFileSize = (bytes) => {
    if (!bytes) return "Unbekannte Größe";
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mein Lebenslauf</h1>
        <p className="text-gray-600">Lade deinen Lebenslauf hoch und verwalte ihn für Bewerbungen</p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`group relative mb-10 animate-slide-up ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        <div
          className={`relative rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300 overflow-hidden ${
            isDragActive
              ? "border-brand-400 bg-gradient-to-br from-brand-50 to-brand-100 shadow-lg scale-105"
              : "border-gray-300 bg-gradient-to-br from-gray-50 to-white hover:border-brand-400 hover:shadow-md"
          }`}
        >
          {/* Background accent */}
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-5 transition-opacity duration-300 bg-gradient-to-br from-brand-400 to-brand-600" />

          {/* Content */}
          <div className="relative z-10">
            {uploading ? (
              <>
                {/* Spinning loader */}
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 border-4 border-gray-300 border-t-brand-500 rounded-full animate-spin" />
                </div>
                <p className="text-lg font-semibold text-brand-600">Wird hochgeladen und analysiert…</p>
                <p className="text-sm text-gray-500 mt-2">Das kann einen Moment dauern</p>
              </>
            ) : isDragActive ? (
              <>
                <Upload className="w-16 h-16 text-brand-500 mx-auto mb-4 animate-pulse" />
                <p className="text-lg font-semibold text-brand-600">Lebenslauf hier ablegen!</p>
                <p className="text-sm text-brand-500 mt-2">Loslassen zum Hochladen</p>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-gradient-to-br from-brand-100 to-brand-50 rounded-full group-hover:from-brand-200 transition-colors duration-300">
                    <Upload className="w-12 h-12 text-brand-500" />
                  </div>
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-2">Lebenslauf per Drag & Drop hochladen</p>
                <p className="text-sm text-gray-600">oder klicken, um vom Computer zu suchen</p>
                <div className="flex gap-4 justify-center mt-4 text-xs text-gray-500">
                  <span>PDF oder TXT</span>
                  <span>•</span>
                  <span>Max. 5 MB</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Resume List */}
      {isLoading ? (
        <div className="animate-slide-up">
          <div className="card p-8 text-center">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-brand-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Lebensläufe werden geladen…</p>
          </div>
        </div>
      ) : resumes.length === 0 ? (
        <div className="animate-slide-up">
          <div className="card p-12 text-center border-2 border-dashed border-gray-200">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gray-100 rounded-full">
                <FileText className="w-12 h-12 text-gray-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Noch keine Lebensläufe</h3>
            <p className="text-gray-600 mb-6">Lade deinen ersten Lebenslauf hoch, um mit Bewerbungen zu starten</p>
            <p className="text-xs text-gray-400">↑ Nutze den Upload-Bereich oben</p>
          </div>
        </div>
      ) : (
        <div className="animate-slide-up">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-500" />
              Hochgeladene Lebensläufe
              <span className="text-sm font-normal text-gray-500">({resumes.length})</span>
            </h2>
          </div>
          <div className="space-y-3">
            {resumes.map((r, idx) => (
              <div
                key={r.id}
                className="card card-hover p-5 flex items-center justify-between group transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-shrink-0 p-3 bg-gradient-to-br from-brand-100 to-brand-50 rounded-lg group-hover:from-brand-200 transition-colors duration-300">
                    <FileText className="w-5 h-5 text-brand-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate group-hover:text-brand-600 transition-colors duration-300">{r.filename}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-gray-500">
                        {new Date(r.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {r.file_size && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-gray-500">{formatFileSize(r.file_size)}</span>
                        </>
                      )}
                      {r.parsed_status && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                            Analysiert
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(r.id)}
                  disabled={deleteMutation.isPending}
                  className="flex-shrink-0 ml-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Lebenslauf löschen"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
