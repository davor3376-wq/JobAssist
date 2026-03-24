import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { authApi } from "../services/api";
import AuthLayout from "../components/ui/AuthLayout";
import { Mail } from "lucide-react";
import { getApiErrorMessage } from "../utils/apiError";

export default function RegisterPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [isResending, setIsResending] = useState(false);

  const onSubmit = async (data) => {
    try {
      await authApi.register(data);
      setRegisteredEmail(data.email);
      setRegistered(true);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Registrierung fehlgeschlagen"));
    }
  };

  const handleResendVerification = async () => {
    if (!registeredEmail || isResending) return;

    setIsResending(true);
    try {
      const res = await authApi.resendVerificationPublic(registeredEmail);
      toast.success(res.data?.message || "Bestatigungs-E-Mail erneut gesendet");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Bestatigungs-E-Mail konnte nicht gesendet werden"));
    } finally {
      setIsResending(false);
    }
  };

  if (registered) {
    return (
      <AuthLayout>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-brand-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">E-Mail bestätigen</h2>
          <p className="text-gray-500 text-sm mb-1">
            Wir haben eine Bestätigungs-E-Mail an
          </p>
          <p className="font-semibold text-gray-800 text-sm mb-4">{registeredEmail}</p>
          <p className="text-gray-500 text-sm mb-6">
            Bitte klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.
          </p>
          <button
            type="button"
            className="btn-secondary w-full block text-center !py-2.5 mb-3"
            onClick={handleResendVerification}
            disabled={isResending}
          >
            {isResending ? "E-Mail wird erneut gesendet..." : "Bestatigungs-E-Mail erneut senden"}
          </button>
          <Link to="/login" className="btn-primary w-full block text-center !py-2.5">
            Zur Anmeldung
          </Link>
        </div>
      </AuthLayout>
    );
  }

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

      <div className="flex justify-center gap-4 mt-6 text-xs text-gray-400">
        <Link to="/terms" className="hover:text-gray-600 transition-colors">AGB</Link>
        <Link to="/privacy" className="hover:text-gray-600 transition-colors">Datenschutz</Link>
        <Link to="/impressum" className="hover:text-gray-600 transition-colors">Impressum</Link>
      </div>
    </AuthLayout>
  );
}
