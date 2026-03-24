import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Save, MapPin, DollarSign, Briefcase, Target, Globe, Sliders, Camera, Trash2, User, AlertTriangle, Mail } from "lucide-react";
import { settingsApi, authApi } from "../services/api";
import useAuthStore from "../hooks/useAuthStore";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import { FormSkeleton } from "../components/PageSkeleton";
import { getApiErrorMessage } from "../utils/apiError";

/** Resize + compress an image File to a JPEG base64 data URL (max 200×200px, ~15–30KB). */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 200;
        let { width, height } = img;
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

const JOB_TYPES = ["Vollzeit", "Teilzeit", "Praktikum", "Samstagsjob", "Ferialjob", "Geringfügig", "Freiberuflich"];
const EXPERIENCE_LEVELS = ["Schüler/Student", "Berufseinsteiger", "Mit Erfahrung", "Senior/Führungskraft"];
const INDUSTRIES = ["Gastronomie", "Handel/Verkauf", "Technik/IT", "Gesundheit", "Bildung", "Handwerk", "Büro/Verwaltung", "Sonstiges"];
const CURRENCIES = ["EUR"];
const LANGUAGES = [
  { code: "de", label: "Deutsch" },
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const { t, setLanguage, releaseLanguageLock } = useI18n();
  const fileInputRef = useRef(null);
  const [avatar, setAvatar] = useState(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => settingsApi.getProfile().then((r) => r.data),
    staleTime: 1000 * 60 * 3,
  });

  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => settingsApi.getPreferences().then((r) => r.data),
    staleTime: 1000 * 60 * 3,
  });

  // Merged form values: profile fields + preferences fields, both authoritative for their own slice
  const formValues = profile && preferences ? {
    desired_locations: profile.desired_locations ?? [],
    salary_min: profile.salary_min ?? null,
    salary_max: profile.salary_max ?? null,
    job_types: profile.job_types ?? [],
    industries: profile.industries ?? [],
    experience_level: profile.experience_level ?? "",
    is_open_to_relocation: profile.is_open_to_relocation ?? false,
    currency: preferences.currency ?? "EUR",
    location: preferences.location ?? "Österreich",
    language: preferences.language ?? "de",
  } : undefined;

  // Sync avatar from server once profile loads
  useEffect(() => {
    if (profile?.avatar) setAvatar(profile.avatar);
  }, [profile?.avatar]);

  const { control, handleSubmit, formState: { isSubmitting } } = useForm({
    values: formValues ?? {
      currency: "EUR",
      location: "Österreich",
      language: "de",
      desired_locations: [],
      salary_min: null,
      salary_max: null,
      job_types: [],
      industries: [],
      experience_level: "",
      is_open_to_relocation: false,
    },
  });

  const onSubmit = async (data) => {
    if (isSubmitting) return;

    const preferencesPayload = {
      currency: data.currency,
      location: data.location,
      language: data.language,
    };

    const profilePayload = {
      desired_locations: data.desired_locations,
      salary_min: data.salary_min,
      salary_max: data.salary_max,
      job_types: data.job_types,
      industries: data.industries,
      experience_level: data.experience_level,
      is_open_to_relocation: data.is_open_to_relocation,
      avatar: avatar ?? null,
    };

    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 10000);

    try {
      const [prefResult, profResult] = await Promise.allSettled([
        settingsApi.updatePreferences(preferencesPayload, { signal: controller.signal }),
        settingsApi.updateProfile(profilePayload, { signal: controller.signal }),
      ]);

      // Always invalidate both regardless of partial failure
      await Promise.allSettled([
        qc.invalidateQueries({ queryKey: ["profile"] }),
        qc.invalidateQueries({ queryKey: ["preferences"] }),
        qc.invalidateQueries({ queryKey: ["init"] }),
      ]);

      const prefFailed = prefResult.status === "rejected";
      const profFailed = profResult.status === "rejected";

      if (prefFailed && profFailed) {
        const aborted = controller.signal.aborted;
        toast.error(aborted ? "Zeitüberschreitung — bitte erneut versuchen" : "Einstellungen konnten nicht gespeichert werden");
      } else if (prefFailed) {
        toast.error("App-Einstellungen konnten nicht gespeichert werden");
        toast.success("Jobpräferenzen gespeichert ✓");
      } else if (profFailed) {
        toast.error("Jobpräferenzen konnten nicht gespeichert werden");
        toast.success("App-Einstellungen gespeichert ✓");
      } else {
        // Coupled to request success — prevents rollback from background authUser refetch
        if (data.language) setLanguage(data.language);
        toast.success(t("settings.savePreferences") + " ✓");
      }
    } finally {
      clearTimeout(abortTimer);
      releaseLanguageLock();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Bitte wähle eine Bilddatei aus"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Bild muss unter 5 MB sein"); return; }
    try {
      const compressed = await compressImage(file);
      setAvatar(compressed);
    } catch {
      toast.error("Bild konnte nicht verarbeitet werden");
    }
  };

  if (profileLoading || preferencesLoading) return (
    <div className="max-w-2xl animate-slide-up">
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
      </div>
      <FormSkeleton fields={6} />
    </div>
  );

  return (
    <div className="max-w-2xl animate-slide-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("settings.title")}</h1>
        <p className="text-gray-500">{t("settings.description")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Profile Photo */}
        <div className="card">
          <div className="flex items-start gap-3 mb-5">
            <User className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-gray-900">Profilfoto</h2>
              <p className="text-xs text-gray-500 mt-0.5">Dein Foto wird in der Seitenleiste angezeigt</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* Avatar preview */}
            <div className="relative flex-shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-brand-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center ring-4 ring-brand-100">
                  <User className="w-10 h-10 text-white" />
                </div>
              )}
              {/* Camera badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-md hover:bg-brand-700 transition-colors"
                title="Foto ändern"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary text-sm px-4 py-2"
              >
                {avatar ? "Foto ändern" : "Foto hochladen"}
              </button>
              {avatar && (
                <button
                  type="button"
                  onClick={() => { setAvatar(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Foto entfernen
                </button>
              )}
              <p className="text-xs text-gray-400">JPG, PNG oder WebP · max. 5 MB</p>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* App Preferences */}
        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <Sliders className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-gray-900">{t("settings.appPreferences")}</h2>
              <p className="text-xs text-gray-500 mt-0.5">Passe dein Erlebnis an</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="label">{t("settings.currency")}</label>
                  <select {...field} className="input" value={field.value || "USD"}>
                    {CURRENCIES.map((curr) => (
                      <option key={curr} value={curr}>
                        {curr}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            />
            <Controller
              name="language"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="label">{t("settings.language")}</label>
                  <select
                    {...field}
                    className="input"
                    value={field.value || "en"}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            />
          </div>
          <div className="mt-4">
            <Controller
              name="location"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="label">{t("settings.location")}</label>
                  <input
                    {...field}
                    className="input"
                    placeholder="Österreich"
                    value={field.value || ""}
                  />
                </div>
              )}
            />
          </div>
        </div>

        {/* Job Preferences Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">{t("settings.jobSearchPreferences")}</h3>
        </div>

        {/* Locations */}
        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <MapPin className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-gray-900">Gewünschte Arbeitsorte</h2>
              <p className="text-xs text-gray-500 mt-0.5">Wo möchtest du arbeiten?</p>
            </div>
          </div>
          <Controller
            name="desired_locations"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                value={field.value?.join(", ") || ""}
                onChange={(e) => field.onChange(e.target.value ? e.target.value.split(",").map(s => s.trim()) : [])}
                className="input"
                placeholder="Wien, Graz, Linz, Salzburg"
              />
            )}
          />
        </div>

        {/* Salary */}
        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-gray-900">Gehaltsvorstellung</h2>
              <p className="text-xs text-gray-500 mt-0.5">In Tausend EUR (z.B. 30-50)</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="salary_min"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="label">Mindestgehalt</label>
                  <input
                    {...field}
                    type="number"
                    className="input"
                    placeholder="30"
                    value={field.value || ""}
                  />
                </div>
              )}
            />
            <Controller
              name="salary_max"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="label">Höchstgehalt</label>
                  <input
                    {...field}
                    type="number"
                    className="input"
                    placeholder="50"
                    value={field.value || ""}
                  />
                </div>
              )}
            />
          </div>
        </div>

        {/* Job Types */}
        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <Briefcase className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-gray-900">Stellenarten</h2>
              <p className="text-xs text-gray-500 mt-0.5">Welche Stellenarten interessieren dich?</p>
            </div>
          </div>
          <Controller
            name="job_types"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {JOB_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      const newVal = field.value?.includes(type)
                        ? field.value.filter((t) => t !== type)
                        : [...(field.value || []), type];
                      field.onChange(newVal);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      field.value?.includes(type)
                        ? "bg-brand-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        {/* Experience Level */}
        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <Target className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-gray-900">Erfahrungsstufe</h2>
              <p className="text-xs text-gray-500 mt-0.5">Wo stehst du in deiner Karriere?</p>
            </div>
          </div>
          <Controller
            name="experience_level"
            control={control}
            render={({ field }) => (
              <select {...field} className="input" value={field.value || ""}>
                <option value="">Stufe auswählen...</option>
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            )}
          />
        </div>

        {/* Industries */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Branchen</h3>
          <Controller
            name="industries"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2">
                {INDUSTRIES.map((industry) => (
                  <label key={industry} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.value?.includes(industry) || false}
                      onChange={(e) => {
                        const newVal = e.target.checked
                          ? [...(field.value || []), industry]
                          : field.value?.filter((i) => i !== industry) || [];
                        field.onChange(newVal);
                      }}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-700">{industry}</span>
                  </label>
                ))}
              </div>
            )}
          />
        </div>

        {/* Relocation */}
        <div className="card">
          <Controller
            name="is_open_to_relocation"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  {...field}
                  type="checkbox"
                  checked={field.value || false}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Offen für Umzug</span>
              </label>
            )}
          />
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={isSubmitting}>
            <Save className="w-4 h-4" />
            {isSubmitting ? t("common.loading") : t("settings.savePreferences")}
          </button>
        </div>
      </form>

      {/* Email Verification Banner */}
      <VerificationBanner />

      {/* Danger Zone — Delete Account */}
      <DeleteAccountSection />
    </div>
  );
}

function VerificationBanner() {
  const { data: initData } = useQuery({ queryKey: ["init"] });
  const me = initData?.me;
  const [sending, setSending] = useState(false);

  if (!me || me.is_verified) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await authApi.resendVerification();
      toast.success("Bestätigungs-E-Mail gesendet");
    } catch {
      toast.error("Fehler beim Senden");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
      <Mail className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-gray-900">E-Mail nicht bestätigt</h3>
        <p className="text-xs text-gray-600 mt-1">Bitte bestätige deine E-Mail-Adresse, um alle Funktionen nutzen zu können.</p>
        <button
          onClick={handleResend}
          disabled={sending}
          className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors disabled:opacity-50"
        >
          {sending ? "Wird gesendet..." : "Bestätigungs-E-Mail erneut senden"}
        </button>
      </div>
    </div>
  );
}

function DeleteAccountSection() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!password) { toast.error("Bitte gib dein Passwort ein"); return; }
    setDeleting(true);
    try {
      await authApi.deleteAccount(password);
      toast.success("Konto wurde gelöscht");
      logout();
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Fehler beim Löschen des Kontos");
      setDeleting(false);
    }
  };

  return (
    <div className="mt-10 border-t-2 border-red-100 pt-8">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
        <div>
          <h2 className="font-semibold text-red-700">Konto löschen</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Alle deine Daten (Profil, Lebensläufe, Anschreiben, Jobs) werden unwiderruflich gelöscht.
          </p>
        </div>
      </div>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
        >
          <Trash2 className="w-4 h-4" /> Konto endgültig löschen
        </button>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-red-800">
            Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          <div>
            <label className="label text-red-700">Passwort zur Bestätigung</label>
            <input
              type="password"
              className="input"
              placeholder="Dein aktuelles Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleting ? "Wird gelöscht..." : "Unwiderruflich löschen"}
            </button>
            <button
              onClick={() => { setShowConfirm(false); setPassword(""); }}
              className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border rounded-xl hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
