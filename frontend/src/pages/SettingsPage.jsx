import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Save,
  MapPin,
  DollarSign,
  Briefcase,
  Target,
  Sliders,
  Camera,
  Trash2,
  User,
  AlertTriangle,
} from "lucide-react";
import { authApi, settingsApi } from "../services/api";
import useAuthStore from "../hooks/useAuthStore";
import { useI18n } from "../context/I18nContext";
import { FormSkeleton } from "../components/PageSkeleton";
import { getApiErrorMessage } from "../utils/apiError";

const loadStored = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
};

const saveStored = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 200;
        let { width, height } = img;

        if (width > height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

const JOB_TYPES = [
  "Vollzeit",
  "Teilzeit",
  "Praktikum",
  "Samstagsjob",
  "Ferialjob",
  "Geringfügig",
  "Freiberuflich",
];
const EXPERIENCE_LEVELS = [
  "Schüler/Student",
  "Berufseinsteiger",
  "Mit Erfahrung",
  "Senior/Führungskraft",
];
const INDUSTRIES = [
  "Gastronomie",
  "Handel/Verkauf",
  "Technik/IT",
  "Gesundheit",
  "Bildung",
  "Handwerk",
  "Büro/Verwaltung",
  "Sonstiges",
];
const CURRENCIES = ["EUR"];
const LANGUAGES = [{ code: "de", label: "Deutsch" }];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { t, setLanguage, releaseLanguageLock } = useI18n();
  const fileInputRef = useRef(null);
  const [avatar, setAvatar] = useState(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () =>
      settingsApi.getProfile().then((res) => {
        saveStored("profile", res.data);
        return res.data;
      }),
    initialData: () => loadStored("profile"),
    staleTime: 1000 * 60 * 3,
  });

  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ["preferences"],
    queryFn: () =>
      settingsApi.getPreferences().then((res) => {
        saveStored("preferences", res.data);
        return res.data;
      }),
    initialData: () => loadStored("preferences"),
    staleTime: 1000 * 60 * 3,
  });

  const formValues =
    profile && preferences
      ? {
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
        }
      : undefined;

  useEffect(() => {
    if (profile?.avatar) setAvatar(profile.avatar);
  }, [profile?.avatar]);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    values:
      formValues ?? {
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
      const [preferencesResult, profileResult] = await Promise.allSettled([
        settingsApi.updatePreferences(preferencesPayload, { signal: controller.signal }),
        settingsApi.updateProfile(profilePayload, { signal: controller.signal }),
      ]);

      // Immediately update caches so sidebar avatar changes without waiting for refetch
      const newAvatar = avatar ?? null;
      queryClient.setQueryData(["profile"], (old) =>
        old ? { ...old, avatar: newAvatar } : old
      );
      queryClient.setQueryData(["init"], (old) =>
        old ? { ...old, profile: { ...(old.profile || {}), avatar: newAvatar } } : old
      );
      try {
        const raw = localStorage.getItem("profile");
        if (raw) localStorage.setItem("profile", JSON.stringify({ ...JSON.parse(raw), avatar: newAvatar }));
      } catch {}
      try {
        const raw = localStorage.getItem("init");
        if (raw) {
          const parsed = JSON.parse(raw);
          localStorage.setItem("init", JSON.stringify({ ...parsed, profile: { ...(parsed.profile || {}), avatar: newAvatar } }));
        }
      } catch {}

      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["preferences"] }),
        queryClient.invalidateQueries({ queryKey: ["init"] }),
      ]);

      const preferencesFailed = preferencesResult.status === "rejected";
      const profileFailed = profileResult.status === "rejected";

      if (preferencesFailed && profileFailed) {
        toast.error(
          controller.signal.aborted
            ? "Zeitüberschreitung – bitte erneut versuchen"
            : "Einstellungen konnten nicht gespeichert werden"
        );
        return;
      }

      if (preferencesFailed) {
        toast.error("App-Einstellungen konnten nicht gespeichert werden");
        toast.success("Jobpräferenzen gespeichert");
        return;
      }

      if (profileFailed) {
        toast.error("Jobpräferenzen konnten nicht gespeichert werden");
        toast.success("App-Einstellungen gespeichert");
        return;
      }

      if (data.language) setLanguage(data.language);
      toast.success(`${t("settings.savePreferences")} ✓`);
    } finally {
      clearTimeout(abortTimer);
      releaseLanguageLock();
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte wähle eine Bilddatei aus");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bild muss unter 5 MB sein");
      return;
    }

    try {
      const compressed = await compressImage(file);
      setAvatar(compressed);
    } catch {
      toast.error("Bild konnte nicht verarbeitet werden");
    }
  };

  if (profileLoading || preferencesLoading) {
    return (
      <div className="max-w-2xl animate-slide-up">
        <div className="mb-8">
          <div className="mb-2 h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-gray-100" />
        </div>
        <FormSkeleton fields={6} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl animate-slide-up">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl sm:text-3xl font-bold text-gray-900">{t("settings.title")}</h1>
        <p className="text-gray-500">{t("settings.description")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <SectionCard icon={<User className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600" />} title="Profilfoto" description="Dein Foto wird in der Seitenleiste angezeigt">
          <div className="flex items-center gap-6">
            <div className="relative flex-shrink-0">
              {avatar ? (
                <img src={avatar} alt="Profil" className="h-24 w-24 rounded-full object-cover ring-4 ring-brand-100" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-purple-600 ring-4 ring-brand-100">
                  <User className="h-10 w-10 text-white" />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white shadow-md transition-colors hover:bg-brand-700"
                title="Foto ändern"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary px-4 py-2 text-sm">
                {avatar ? "Foto ändern" : "Foto hochladen"}
              </button>
              {avatar && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatar(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="flex items-center gap-1.5 text-sm text-red-500 transition-colors hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Foto entfernen
                </button>
              )}
              <p className="text-xs text-gray-400">JPG, PNG oder WebP · max. 5 MB</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </SectionCard>

        <SectionCard icon={<Sliders className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600" />} title={t("settings.appPreferences")} description="Passe dein Erlebnis an">
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="label">{t("settings.currency")}</label>
                  <select {...field} className="input" value={field.value || "EUR"}>
                    {CURRENCIES.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
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
                    value={field.value || "de"}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    {LANGUAGES.map((language) => (
                      <option key={language.code} value={language.code}>
                        {language.label}
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
                  <input {...field} className="input" placeholder="Österreich" value={field.value || ""} />
                </div>
              )}
            />
          </div>
        </SectionCard>

        <div className="mt-8 border-t border-gray-200 pt-6">
          <h3 className="mb-6 text-xl font-semibold text-gray-900">{t("settings.jobSearchPreferences")}</h3>
        </div>

        <SectionCard icon={<MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600" />} title="Gewünschte Arbeitsorte" description="Wo möchtest du arbeiten?">
          <Controller
            name="desired_locations"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                value={field.value?.join(", ") || ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value ? e.target.value.split(",").map((part) => part.trim()) : []
                  )
                }
                className="input"
                placeholder="Wien, Graz, Linz, Salzburg"
              />
            )}
          />
        </SectionCard>

        <SectionCard icon={<DollarSign className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600" />} title="Gehaltsvorstellung" description="In Tausend EUR, z. B. 30–50">
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="salary_min"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="label">Mindestgehalt</label>
                  <input {...field} type="number" className="input" placeholder="30" value={field.value || ""} />
                </div>
              )}
            />
            <Controller
              name="salary_max"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="label">Höchstgehalt</label>
                  <input {...field} type="number" className="input" placeholder="50" value={field.value || ""} />
                </div>
              )}
            />
          </div>
        </SectionCard>

        <SectionCard icon={<Briefcase className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600" />} title="Stellenarten" description="Welche Stellenarten interessieren dich?">
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
                      const nextValue = field.value?.includes(type)
                        ? field.value.filter((entry) => entry !== type)
                        : [...(field.value || []), type];
                      field.onChange(nextValue);
                    }}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
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
        </SectionCard>

        <SectionCard icon={<Target className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600" />} title="Erfahrungsstufe" description="Wo stehst du in deiner Karriere?">
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
        </SectionCard>

        <div className="card">
          <h3 className="mb-3 font-semibold text-gray-900">Branchen</h3>
          <Controller
            name="industries"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2">
                {INDUSTRIES.map((industry) => (
                  <label key={industry} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={field.value?.includes(industry) || false}
                      onChange={(e) => {
                        const nextValue = e.target.checked
                          ? [...(field.value || []), industry]
                          : field.value?.filter((entry) => entry !== industry) || [];
                        field.onChange(nextValue);
                      }}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm text-gray-700">{industry}</span>
                  </label>
                ))}
              </div>
            )}
          />
        </div>

        <div className="card">
          <Controller
            name="is_open_to_relocation"
            control={control}
            render={({ field }) => (
              <label className="flex cursor-pointer items-center gap-3">
                <input {...field} type="checkbox" checked={field.value || false} className="h-4 w-4 rounded" />
                <span className="text-sm font-medium text-gray-700">Offen für Umzug</span>
              </label>
            )}
          />
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={isSubmitting}>
            <Save className="h-4 w-4" />
            {isSubmitting ? t("common.loading") : t("settings.savePreferences")}
          </button>
        </div>
      </form>

      <DeleteAccountSection />
    </div>
  );
}

function SectionCard({ icon, title, description, children }) {
  return (
    <div className="card">
      <div className="mb-4 flex items-start gap-3">
        {icon}
        <div>
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function DeleteAccountSection() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!password) {
      toast.error("Bitte gib dein Passwort ein");
      return;
    }

    setDeleting(true);

    try {
      await authApi.deleteAccount(password);
      toast.success("Konto wurde gelöscht");
      logout();
      navigate("/login");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Fehler beim Löschen des Kontos"));
      setDeleting(false);
    }
  };

  return (
    <div className="mt-10 border-t-2 border-red-100 pt-8">
      <div className="mb-4 flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
        <div>
          <h2 className="font-semibold text-red-700">Konto löschen</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Alle deine Daten, Profile, Lebensläufe, Anschreiben und Jobs werden unwiderruflich gelöscht.
          </p>
        </div>
      </div>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
        >
          <Trash2 className="h-4 w-4" />
          Konto endgültig löschen
        </button>
      ) : (
        <div className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-5">
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
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Wird gelöscht..." : "Unwiderruflich löschen"}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setPassword("");
              }}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
