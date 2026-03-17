import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import toast from "react-hot-toast";
import { Plus, Trash2, FileDown, Eye } from "lucide-react";
import { resumeDataApi } from "../services/api";

const TEMPLATES = [
  { id: 1, name: "Modern Split",   description: "Dark sidebar · sky blue",       accent: "#0EA5E9" },
  { id: 2, name: "Executive",      description: "Indigo banner · two-column",    accent: "#4F46E5" },
  { id: 3, name: "Minimalist",     description: "Grid bands · emerald type",     accent: "#059669" },
  { id: 4, name: "Accent Column",  description: "Rose bar · icon contact",       accent: "#E11D48" },
  { id: 5, name: "Card Interface", description: "Floating cards · violet",       accent: "#7C3AED" },
];

export default function ResumeCreatorPage() {
  const qc = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState(1);
  const selectedLanguage = "de"; // Austria-only: always German
  const [previewUrl, setPreviewUrl] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteName, setDeleteName] = useState("");
  const [clearAllConfirm, setClearAllConfirm] = useState(false);

  const { data: resumes = [], isLoading: resumesLoading, error: resumesError } = useQuery({
    queryKey: ["resume-data"],
    queryFn: () => resumeDataApi.list().then((r) => r.data),
    retry: false,
  });

  const [fitToPage, setFitToPage] = useState(false);

  const { control, handleSubmit, reset, register, formState: { isSubmitting } } = useForm({
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      location: "",
      birth_info: "",
      nationality: "",
      staatsbuergerschaft: "",
      familienstand: "",
      fuehrerschein: "",
      religion: "",
      address_lines: [],
      professional_summary: "",
      work_experience: [],
      education: [],
      skills: [],
      certifications: [],
    },
  });

  const { fields: jobFields, append: appendJob, remove: removeJob } = useFieldArray({
    control,
    name: "work_experience",
  });

  const { fields: eduFields, append: appendEdu, remove: removeEdu } = useFieldArray({
    control,
    name: "education",
  });

  const { fields: addrFields, append: appendAddr, remove: removeAddr } = useFieldArray({
    control,
    name: "address_lines",
  });

  const createMutation = useMutation({
    mutationFn: (data) => resumeDataApi.create({ ...data, template_id: selectedTemplate, language: selectedLanguage }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resume-data"] });
      toast.success("Resume created successfully!");
      reset();
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.detail || error.message || "Failed to create resume";
      console.error("Resume creation error:", error);
      toast.error(errorMsg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => resumeDataApi.delete(id),
    onSuccess: (_, resumeId) => {
      // Manually remove the deleted resume from the cache
      qc.setQueryData(["resume-data"], (old) => old.filter(r => r.id !== resumeId));
      toast.success("Resume deleted");
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.detail || error.message || "Failed to delete resume";
      toast.error(errorMsg);
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const resumes = qc.getQueryData(["resume-data"]) || [];
      await Promise.all(resumes.map(r => resumeDataApi.delete(r.id)));
    },
    onSuccess: () => {
      // Clear all resumes from the cache
      qc.setQueryData(["resume-data"], []);
      toast.success("All resumes cleared!");
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to clear resumes");
    },
  });

  const previewMutation = useMutation({
    mutationFn: (id) => resumeDataApi.preview(id),
    onSuccess: (response) => {
      const html = response.data?.html || response.data;
      const blob = new Blob([html], { type: "text/html" });
      setPreviewUrl(URL.createObjectURL(blob));
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.detail || error.message || "Failed to generate preview";
      toast.error(errorMsg);
    },
  });

  const TEMPLATE_ZOOM = { 1: 0.98, 2: 0.91, 3: 0.80, 4: 0.90, 5: 0.90 };

  const downloadPdf = useMutation({
    mutationFn: (id) => resumeDataApi.preview(id),
    onSuccess: (response, resumeId) => {
      const html = response.data?.html || response.data;
      const resume = resumes.find(r => r.id === resumeId);
      const zoom = TEMPLATE_ZOOM[resume?.template_id] ?? 0.88;

      // Parse and strip @media print blocks so the print dialog captures the screen design
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      doc.querySelectorAll("style").forEach(style => {
        style.textContent = style.textContent.replace(
          /@media\s+print\s*\{(?:[^{}]|\{[^{}]*\})*\}/gs,
          ""
        );
      });

      // Auto-trigger print dialog when window opens
      const body = doc.body.innerHTML;
      const head = doc.head.innerHTML;
      // Force background colors + zoom + per-template layout fixes
      const forceBg = `<style>
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
        @page { size: A4 portrait; margin: 0; }
        html { zoom: ${zoom}; }

        /* T3: reinject skills grid fix lost when @media print was stripped */
        body.minimalist-grid .t3-skills-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr 1fr !important;
          gap: 0.5rem 2rem !important;
        }
        body.minimalist-grid section > div,
        body.minimalist-grid header > div { display: block !important; }
        body.minimalist-grid section > div > div:first-child,
        body.minimalist-grid header > div > div:first-child { width: 100% !important; margin-bottom: 0.15rem !important; }

        /* T4: narrow the sidebar so main content has more room for bullet text */
        body.accent-col aside.resume-sidebar { width: 8.5rem !important; min-width: 8.5rem !important; }
        body.accent-col li { min-width: 0 !important; }
        body.accent-col li > *:last-child { min-width: 0 !important; flex: 1 1 0 !important; }
      </style>`;
      const cleanHtml = `<!DOCTYPE html><html><head>${head}${forceBg}</head><body>${body}<script>window.onload=function(){window.print();}<\/script></body></html>`;

      const blob = new Blob([cleanHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, "_blank", "noopener,noreferrer");
      if (!newWindow) {
        toast.error("Could not open PDF. Check your pop-up blocker.");
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || "Failed to generate PDF");
    },
  });

  const onSubmit = (data) => {
    if (!data.full_name || !data.email) {
      toast.error("Full name and email are required");
      return;
    }

    // Format skills as array of objects if needed
    const formattedData = {
      ...data,
      skills: data.skills && data.skills.length > 0
        ? [{ category: "Skills", items: data.skills }]
        : [],
      work_experience: data.work_experience || [],
      education: data.education || [],
      certifications: data.certifications || [],
      // address_lines: extract the value string from each field array item
      address_lines: (data.address_lines || []).map((item) => item.value || item).filter(Boolean),
      fit_to_page: fitToPage,
    };

    createMutation.mutate(formattedData);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-10 animate-slide-up">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Lebenslauf erstellen</h1>
        <p className="text-gray-600">Erstelle einen professionellen Lebenslauf mit unseren Vorlagen</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-2 animate-slide-up">
          <div className="card mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Vorlage wählen</h2>
            <div className="grid grid-cols-5 gap-2 mb-6">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  style={selectedTemplate === template.id ? { borderColor: template.accent, background: `${template.accent}12` } : {}}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedTemplate === template.id
                      ? "shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  }`}
                >
                  <div
                    className="w-full h-1.5 rounded-full mb-2"
                    style={{ background: template.accent }}
                  />
                  <p className="font-semibold text-xs text-gray-900">{template.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">{template.description}</p>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setFitToPage((v) => !v)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${fitToPage ? "bg-blue-600" : "bg-gray-300"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${fitToPage ? "translate-x-5" : ""}`}
                  />
                </div>
                <span className="text-sm text-gray-700 font-medium">Auf 1 Seite anpassen</span>
              </label>
              <p className="text-xs text-gray-400">Inhalt automatisch auf eine Seite skalieren</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Info */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Persönliche Daten</h3>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="full_name"
                  control={control}
                  rules={{ required: "Vollständiger Name ist erforderlich" }}
                  render={({ field }) => (
                    <div>
                      <label className="label">Vollständiger Name *</label>
                      <input {...field} className="input" placeholder="Max Mustermann" />
                    </div>
                  )}
                />
                <Controller
                  name="email"
                  control={control}
                  rules={{ required: "E-Mail ist erforderlich" }}
                  render={({ field }) => (
                    <div>
                      <label className="label">E-Mail *</label>
                      <input {...field} type="email" className="input" placeholder="max@beispiel.at" />
                    </div>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="label">Telefon</label>
                      <input {...field} type="tel" className="input" placeholder="+43 660 1234567" />
                    </div>
                  )}
                />
                <Controller
                  name="birth_info"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="label">Geburtsdaten</label>
                      <input {...field} className="input" placeholder="01.01.2000, Wien" />
                    </div>
                  )}
                />
              </div>

              {/* Aufenthaltsorte */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Aufenthaltsorte</label>
                  <button
                    type="button"
                    onClick={() => appendAddr({ value: "" })}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Aufenthaltsort hinzufügen
                  </button>
                </div>
                {addrFields.length === 0 && (
                  <p className="text-xs text-gray-400">Klicke auf &ldquo;Aufenthaltsort hinzufügen&rdquo; um Adressen einzutragen.</p>
                )}
                <div className="space-y-2">
                  {addrFields.map((item, index) => (
                    <div key={item.id} className="flex gap-2 items-center">
                      <input
                        {...register(`address_lines.${index}.value`)}
                        className="input flex-1"
                        placeholder={index === 0 ? "Musterstraße 1, 1010 Wien" : "Weitere Adresse..."}
                      />
                      <button
                        type="button"
                        onClick={() => removeAddr(index)}
                        className="text-red-400 hover:text-red-600 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Austrian-specific personal fields */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Controller
                  name="nationality"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="label">Staatsangehörigkeit</label>
                      <input {...field} className="input" placeholder="Österreich" />
                    </div>
                  )}
                />
                <Controller
                  name="staatsbuergerschaft"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="label">Staatsbürgerschaft</label>
                      <input {...field} className="input" placeholder="Österreich" />
                    </div>
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <Controller
                  name="familienstand"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="label">Familienstand</label>
                      <select {...field} className="input">
                        <option value="">— Auswählen —</option>
                        <option value="ledig">Ledig</option>
                        <option value="verheiratet">Verheiratet</option>
                        <option value="geschieden">Geschieden</option>
                        <option value="verwitwet">Verwitwet</option>
                        <option value="in Partnerschaft">In Partnerschaft</option>
                      </select>
                    </div>
                  )}
                />
                <Controller
                  name="fuehrerschein"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="label">Führerschein</label>
                      <input {...field} className="input" placeholder="B" />
                    </div>
                  )}
                />
                <Controller
                  name="religion"
                  control={control}
                  render={({ field }) => (
                    <div>
                      <label className="label">Religionsbekenntnis</label>
                      <input {...field} className="input" placeholder="röm.-kath." />
                    </div>
                  )}
                />
            </div>
            </div>

            {/* Profil */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Profil</h3>
              <Controller
                name="professional_summary"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    className="input min-h-24"
                    placeholder="Kurze Zusammenfassung deines beruflichen Hintergrunds und deiner Ziele..."
                  />
                )}
              />
            </div>

            {/* Kenntnisse */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Kenntnisse</h3>
              <Controller
                name="skills"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    value={field.value?.join(", ") || ""}
                    onChange={(e) => field.onChange(e.target.value ? e.target.value.split(",").map(s => s.trim()) : [])}
                    className="input min-h-20"
                    placeholder="MS Office, Deutsch (C2), Englisch (B2), Teamarbeit (kommagetrennt)"
                  />
                )}
              />
            </div>

            {/* Work Experience */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Berufserfahrung</h3>
                <button
                  type="button"
                  onClick={() => appendJob({ title: "", company: "", startDate: "", endDate: "", isCurrentPosition: false, description: "" })}
                  className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  <Plus className="w-4 h-4" /> Hinzufügen
                </button>
              </div>
              {jobFields.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Noch keine Berufserfahrung hinzugefügt</p>
              )}
              <div className="space-y-5">
                {jobFields.map((field, index) => (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-4 relative">
                    <button
                      type="button"
                      onClick={() => removeJob(index)}
                      className="absolute top-3 right-3 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="label">Berufsbezeichnung *</label>
                        <input {...register(`work_experience.${index}.title`)} className="input" placeholder="Verkäufer/in" />
                      </div>
                      <div>
                        <label className="label">Unternehmen *</label>
                        <input {...register(`work_experience.${index}.company`)} className="input" placeholder="Firma GmbH" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="label">Beginn</label>
                        <input {...register(`work_experience.${index}.startDate`)} className="input" placeholder="Jän 2020" />
                      </div>
                      <div>
                        <label className="label">Ende</label>
                        <Controller
                          name={`work_experience.${index}.isCurrentPosition`}
                          control={control}
                          render={({ field: f }) => (
                            <div>
                              <input
                                {...register(`work_experience.${index}.endDate`)}
                                className="input mb-1"
                                placeholder="Dec 2023"
                                disabled={f.value}
                              />
                              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={f.value}
                                  onChange={(e) => f.onChange(e.target.checked)}
                                  className="rounded"
                                />
                                Aktuelle Position
                              </label>
                            </div>
                          )}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Beschreibung</label>
                      <textarea
                        {...register(`work_experience.${index}.description`)}
                        className="input min-h-20"
                        placeholder="Beschreibe deine Aufgaben und Erfolge..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Education */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Bildungsweg</h3>
                <button
                  type="button"
                  onClick={() => appendEdu({ degree: "", school: "", field: "", graduationDate: "" })}
                  className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  <Plus className="w-4 h-4" /> Hinzufügen
                </button>
              </div>
              {eduFields.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Noch keine Bildung hinzugefügt</p>
              )}
              <div className="space-y-4">
                {eduFields.map((field, index) => (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-4 relative">
                    <button
                      type="button"
                      onClick={() => removeEdu(index)}
                      className="absolute top-3 right-3 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="label">Abschluss *</label>
                        <input {...register(`education.${index}.degree`)} className="input" placeholder="Matura / Bachelor" />
                      </div>
                      <div>
                        <label className="label">Schule/Uni *</label>
                        <input {...register(`education.${index}.school`)} className="input" placeholder="HTL Wien" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="label">Fachrichtung *</label>
                        <input {...register(`education.${index}.field`)} className="input" placeholder="Informatik" />
                      </div>
                      <div>
                        <label className="label">Abschlussdatum</label>
                        <input {...register(`education.${index}.graduationDate`)} className="input" placeholder="Juni 2024" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? "Wird erstellt..." : "Lebenslauf erstellen"}
            </button>
          </form>
        </div>

        {/* Preview Section */}
        <div className="animate-slide-up">
          <div className="card sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Deine Lebensläufe</h2>
              {resumes.length > 0 && (
                <button
                  onClick={() => setClearAllConfirm(true)}
                  disabled={clearAllMutation.isPending}
                  className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                >
                  Alle löschen
                </button>
              )}
            </div>
            {resumes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Noch keine Lebensläufe erstellt</p>
            ) : (
              <div className="space-y-3">
                {resumes.map((resume) => (
                  <div key={resume.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <p className="font-semibold text-sm text-gray-900 truncate">{resume.full_name}</p>
                    <p className="text-xs text-gray-500 mt-1">{resume.email}</p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => previewMutation.mutate(resume.id)}
                        disabled={previewMutation.isPending}
                        className="flex-1 px-3 py-2 bg-brand-50 text-brand-600 rounded text-sm font-medium hover:bg-brand-100 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <Eye className="w-3 h-3" />
                        Vorschau
                      </button>
                      <button
                        onClick={() => downloadPdf.mutate(resume.id)}
                        disabled={downloadPdf.isPending}
                        className="flex-1 px-3 py-2 bg-green-50 text-green-700 rounded text-sm font-medium hover:bg-green-100 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <FileDown className="w-3 h-3" />
                        PDF
                      </button>
                      <button
                        onClick={() => {
                          setDeleteConfirmId(resume.id);
                          setDeleteName(resume.full_name);
                        }}
                        disabled={deleteMutation.isPending}
                        className="px-2 py-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 font-medium text-sm"
                        aria-label={`Delete resume for ${resume.full_name}`}
                      >
                        {deleteMutation.isPending ? "Wird gelöscht..." : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {previewUrl && (
            <div className="mt-6 card animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Vorschau</h3>
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Schließen
                </button>
              </div>
              <iframe src={previewUrl} className="w-full h-96 border border-gray-200 rounded" />
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Lebenslauf löschen?</h3>
            <p className="text-gray-600 mb-6">
              Bist du sicher, dass du den Lebenslauf von <strong>{deleteName}</strong> löschen möchtest? Dies kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Wird gelöscht..." : "Löschen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {clearAllConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Alle Lebensläufe löschen?</h3>
            <p className="text-gray-600 mb-6">
              Bist du sicher, dass du alle <strong>{resumes.length}</strong> Lebensläufe löschen möchtest? Dies kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setClearAllConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  clearAllMutation.mutate();
                  setClearAllConfirm(false);
                }}
                disabled={clearAllMutation.isPending}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {clearAllMutation.isPending ? "Wird gelöscht..." : "Alle löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
