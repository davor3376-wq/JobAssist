import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authApi, initApi } from "../services/api";
import useAuthStore from "../hooks/useAuthStore";
import AuthLayout from "../components/ui/AuthLayout";
import queryClient from "../queryClient";

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      await authApi.register(data);
      const res = await authApi.login({ email: data.email, password: data.password });
      login(res.data.access_token, res.data.refresh_token);
      queryClient.clear();
      navigate("/dashboard");
      toast.success("Konto erstellt! Willkommen.");
      // Prefetch init in background so sidebar has data quickly
      initApi.fetch().then((initRes) => {
        try { localStorage.setItem("init", JSON.stringify(initRes.data)); } catch {}
        queryClient.setQueryData(["init"], initRes.data);
      }).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registrierung fehlgeschlagen");
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Konto erstellen</h2>
        <p className="text-gray-500 text-sm sm:text-base">Starte jetzt mit deiner Bewerbung in Österreich</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="label">Vollständiger Name</label>
          <input className="input" placeholder="Max Mustermann" {...register("full_name")} />
        </div>

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
            placeholder="Mindestens 8 Zeichen"
            {...register("password", {
              required: "Passwort ist erforderlich",
              minLength: { value: 8, message: "Mindestens 8 Zeichen" },
            })}
          />
          {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
        </div>

        <button type="submit" className="btn-primary w-full !py-3 text-base" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Konto wird erstellt...
            </span>
          ) : "Konto erstellen"}
        </button>
      </form>

      <p className="text-sm text-center text-gray-500 mt-6">
        Bereits ein Konto?{" "}
        <Link to="/login" className="text-brand-600 font-semibold hover:text-brand-700 transition-colors">
          Anmelden
        </Link>
      </p>
    </AuthLayout>
  );
}
