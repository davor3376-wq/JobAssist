import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authApi, initApi } from "../services/api";
import useAuthStore from "../hooks/useAuthStore";
import AuthLayout from "../components/ui/AuthLayout";
import queryClient from "../queryClient";
import { getApiErrorMessage } from "../utils/apiError";

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const login = useAuthStore((s) => s.login);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      const res = await authApi.login(data);
      login(res.data.access_token, res.data.refresh_token);
      // Clear previous user's React Query cache before setting new user's data
      queryClient.clear();
      navigate("/dashboard");
      // Prefetch init in background so sidebar has data quickly
      initApi.fetch().then((initRes) => {
        const initData = initRes.data;
        try { localStorage.setItem("init", JSON.stringify(initData)); } catch {}
        queryClient.setQueryData(["init"], initData);
        if (initData.me) setUser(initData.me);
      }).catch(() => {});
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Anmeldung fehlgeschlagen"));
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Willkommen zurück</h2>
        <p className="text-gray-500 text-sm sm:text-base">Melde dich bei deinem JobAssist-Konto an</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="label">E-Mail-Adresse</label>
          <input
            className="input"
            type="email"
            placeholder="du@beispiel.at"
            {...register("email", { required: "E-Mail ist erforderlich" })}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
        </div>

        <div>
          <label className="label">Passwort</label>
          <input
            className="input"
            type="password"
            placeholder="Dein Passwort eingeben"
            {...register("password", { required: "Passwort ist erforderlich" })}
          />
          {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
          <div className="text-right">
            <Link to="/forgot-password" className="text-xs text-brand-600 hover:text-brand-700 transition-colors">
              Passwort vergessen?
            </Link>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full !py-3 text-base" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Anmeldung läuft...
            </span>
          ) : "Anmelden"}
        </button>
      </form>

      <p className="text-sm text-center text-gray-500 mt-6">
        Noch kein Konto?{" "}
        <Link to="/register" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">
          Jetzt registrieren
        </Link>
      </p>

      <div className="flex justify-center gap-4 mt-6 text-xs text-gray-400">
        <Link to="/terms" className="hover:text-gray-600 transition-colors">AGB</Link>
        <Link to="/privacy" className="hover:text-gray-600 transition-colors">Datenschutz</Link>
        <Link to="/impressum" className="hover:text-gray-600 transition-colors">Impressum</Link>
      </div>
    </AuthLayout>
  );
}
