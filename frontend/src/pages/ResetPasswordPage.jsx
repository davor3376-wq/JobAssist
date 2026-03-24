import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { authApi } from "../services/api";
import AuthLayout from "../components/ui/AuthLayout";
import { CheckCircle } from "lucide-react";
import { getApiErrorMessage } from "../utils/apiError";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async (data) => {
    setError(null);
    try {
      await authApi.resetPassword(token, data.password);
      setDone(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Link ist ungültig oder abgelaufen"));
    }
  };

  if (!token) {
    return (
      <AuthLayout>
        <div className="text-center py-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ungültiger Link</h2>
          <p className="text-sm text-gray-500 mb-4">Dieser Link ist ungültig. Bitte fordere einen neuen an.</p>
          <Link to="/forgot-password" className="btn-primary inline-block">Neuen Link anfordern</Link>
        </div>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="text-center py-8">
          <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Passwort zurückgesetzt</h2>
          <p className="text-sm text-gray-500 mb-4">Du kannst dich jetzt mit deinem neuen Passwort anmelden.</p>
          <Link to="/login" className="btn-primary inline-block">Zum Login</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Neues Passwort</h2>
        <p className="text-gray-500 text-sm">Wähle ein neues Passwort für dein Konto.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="label">Neues Passwort</label>
          <input
            className="input"
            type="password"
            placeholder="Mindestens 8 Zeichen"
            {...register("password", {
              required: "Passwort ist erforderlich",
              minLength: { value: 8, message: "Mindestens 8 Zeichen" },
              validate: (v) => {
                if (!/[A-Z]/.test(v)) return "Mindestens ein Großbuchstabe";
                if (!/[a-z]/.test(v)) return "Mindestens ein Kleinbuchstabe";
                if (!/[0-9]/.test(v)) return "Mindestens eine Zahl";
                return true;
              },
            })}
          />
          {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
        </div>

        <div>
          <label className="label">Passwort bestätigen</label>
          <input
            className="input"
            type="password"
            placeholder="Passwort wiederholen"
            {...register("confirmPassword", {
              required: "Bitte bestätige dein Passwort",
              validate: (v) => v === watch("password") || "Passwörter stimmen nicht überein",
            })}
          />
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1.5">{errors.confirmPassword.message}</p>}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" className="btn-primary w-full !py-3 text-base" disabled={isSubmitting}>
          {isSubmitting ? "Wird gespeichert..." : "Passwort speichern"}
        </button>
      </form>
    </AuthLayout>
  );
}
