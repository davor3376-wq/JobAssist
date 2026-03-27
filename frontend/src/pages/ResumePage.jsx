import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Upload, Trash2, FileText } from "lucide-react";

import { resumeApi } from "../services/api";
import { ListSkeleton } from "../components/PageSkeleton";
import useUsageGuard from "../hooks/useUsageGuard";
import { getApiErrorMessage } from "../utils/apiError";

function loadStoredResumes() {
  try {
    const raw = localStorage.getItem("resumes");
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function PdfSkeleton({ resume }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{resume.filename}</p>
          <p className="text-xs text-gray-500">Dokumentenansicht</p>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">PDF-Vorschau</span>
      </div>
      <div className="space-y-3">
        <div className="h-3 w-3/4 rounded-full bg-gray-200" />
        <div className="h-3 w-5/6 rounded-full bg-gray-100" />
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2 rounded-xl bg-gray-50 p-4">
            <div className="h-3 w-1/2 rounded-full bg-gray-200" />
            <div className="h-2.5 w-full rounded-full bg-gray-100" />
            <div className="h-2.5 w-4/5 rounded-full bg-gray-100" />
            <div className="h-2.5 w-3/5 rounded-full bg-gray-100" />
          </div>
          <div className="space-y-2 rounded-xl bg-gray-50 p-4">
            <div className="h-3 w-1/2 rounded-full bg-gray-200" />
            <div className="h-2.5 w-full rounded-full bg-gray-100" />
            <div className="h-2.5 w-3/4 rounded-full bg-gray-100" />
            <div className="h-2.5 w-2/3 rounded-full bg-gray-100" />
          </div>
        </div>
        <div className="space-y-2 rounded-xl bg-gray-50 p-4">
          <div className="h-3 w-1/3 rounded-full bg-gray-200" />
          <div className="h-2.5 w-full rounded-full bg-gray-100" />
          <div className="h-2.5 w-11/12 rounded-full bg-gray-100" />
          <div className="h-2.5 w-2/3 rounded-full bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

export default function ResumePage() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const { guardedRun } = useUsageGuard("cv_analysis");

  const { data: initData } = useQuery({
    queryKey: ["init"],
    initialData: () => queryClient.getQueryData(["init"]),
    staleTime: 1000 * 60 * 2,
  });

  const resumePlaceholder = initData?.resumes?.map((resume) => ({
    id: resume.id,
    filename: resume.filename,
    created_at: resume.created_at,
  }));

  const { data: resumes = [], isLoading } = useQuery({
    queryKey: ["resumes"],
    queryFn: () =>
      resumeApi.list().then((r) => {
        try {
          localStorage.setItem("resumes", JSON.stringify(r.data));
        } catch {}
        return r.data;
      }),
    initialData: () => queryClient.getQueryData(["resumes"]) || loadStoredResumes() || resumePlaceholder || [],
    staleTime: 1000 * 60 * 2,
  });

  const deleteMutation = useMutation({
    mutationFn: resumeApi.delete,
    onSuccess: (_data, deletedId) => {
      queryClient.setQueryData(["resumes"], (old = []) => old.filter((resume) => resume.id !== deletedId));
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      toast.success("Lebenslauf gelöscht");
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Lebenslauf konnte nicht gelöscht werden"));
    },
  });

  const onDrop = useCallback(
    async (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;

      guardedRun(async () => {
        setUploading(true);
        try {
          const formData = new FormData();
          formData.append("file", file);
          await resumeApi.upload(formData);
          queryClient.invalidateQueries({ queryKey: ["resumes"] });
          toast.success("Lebenslauf hochgeladen und analysiert!");
        } catch (err) {
          toast.error(getApiErrorMessage(err, "Upload fehlgeschlagen"));
        } finally {
          setUploading(false);
        }
      });
    },
    [guardedRun, queryClient]
  );

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
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="animate-slide-up">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Meine Lebensläufe</h1>
        <p className="text-gray-600">Lade deinen Lebenslauf hoch und überprüfe ihn gegen deine getrackten Stellen</p>
      </div>

      <div {...getRootProps()} className={`group relative animate-slide-up ${uploading ? "cursor-not-allowed opacity-50" : ""}`}>
        <input {...getInputProps()} />
        <div
          className={`relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-300 ${
            isDragActive
              ? "scale-105 border-brand-400 bg-gradient-to-br from-brand-50 to-brand-100 shadow-lg"
              : "border-gray-300 bg-gradient-to-br from-gray-50 to-white hover:border-brand-400 hover:shadow-md"
          }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-400 to-brand-600 opacity-0 transition-opacity duration-300 group-hover:opacity-5" />

          <div className="relative z-10">
            {uploading ? (
              <>
                <div className="mb-4 flex justify-center">
                  <div className="h-16 w-16 animate-spin rounded-full border-4 border-gray-300 border-t-brand-500" />
                </div>
                <p className="text-lg font-semibold text-brand-600">Wird hochgeladen und analysiert…</p>
                <p className="mt-2 text-sm text-gray-500">Das kann einen Moment dauern</p>
              </>
            ) : isDragActive ? (
              <>
                <Upload className="mx-auto mb-4 h-16 w-16 animate-pulse text-brand-500" />
                <p className="text-lg font-semibold text-brand-600">Lebenslauf hier ablegen!</p>
                <p className="mt-2 text-sm text-brand-500">Loslassen zum Hochladen</p>
              </>
            ) : (
              <>
                <div className="mb-4 flex justify-center">
                  <div className="rounded-full bg-gradient-to-br from-brand-100 to-brand-50 p-4 transition-colors duration-300 group-hover:from-brand-200">
                    <Upload className="h-12 w-12 text-brand-500" />
                  </div>
                </div>
                <p className="mb-2 text-lg font-semibold text-gray-900">Lebenslauf per Drag & Drop hochladen</p>
                <p className="text-sm text-gray-600">oder klicken, um vom Computer zu suchen</p>
                <div className="mt-4 flex justify-center gap-4 text-xs text-gray-500">
                  <span>PDF oder TXT</span>
                  <span>•</span>
                  <span>Max. 5 MB</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-slide-up">
          <ListSkeleton rows={3} />
        </div>
      ) : resumes.length === 0 ? (
        <div className="animate-slide-up">
          <div className="card border-2 border-dashed border-gray-200 p-12 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-gray-100 p-4">
                <FileText className="h-12 w-12 text-gray-400" />
              </div>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Noch keine Lebensläufe</h3>
            <p className="mb-6 text-gray-600">Lade deinen ersten Lebenslauf hoch, um mit Bewerbungen zu starten</p>
            <p className="text-xs text-gray-400">↑ Nutze den Upload-Bereich oben</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="animate-slide-up">
            <div className="mb-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <FileText className="h-5 w-5 text-brand-500" />
                Hochgeladene Lebensläufe
                <span className="text-sm font-normal text-gray-500">({resumes.length})</span>
              </h2>
            </div>
            <div className="space-y-3">
              {resumes.map((resume, idx) => (
                <div
                  key={resume.id}
                  className="card card-hover group flex items-center justify-between p-5 transition-all duration-300 animate-slide-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex-shrink-0 rounded-lg bg-gradient-to-br from-brand-100 to-brand-50 p-3 transition-colors duration-300 group-hover:from-brand-200">
                      <FileText className="h-5 w-5 text-brand-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-900 transition-colors duration-300 group-hover:text-brand-600">
                        {resume.filename}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-3">
                        <span className="text-xs text-gray-500">
                          {new Date(resume.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {resume.file_size && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-xs text-gray-500">{formatFileSize(resume.file_size)}</span>
                          </>
                        )}
                        {resume.parsed_status && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                              Analysiert
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteMutation.mutate(resume.id);
                    }}
                    disabled={deleteMutation.isPending}
                    className="ml-4 flex-shrink-0 rounded-lg p-2 text-gray-400 transition-all duration-300 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Lebenslauf löschen"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
