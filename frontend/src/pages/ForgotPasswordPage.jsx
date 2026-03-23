import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { authApi } from "../services/api";
import AuthLayout from "../components/ui/AuthLayout";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [sent, setSent] = useState(false);

  const onSubmit = async (data) => {
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch {
      // Always show success to prevent email enumeration
      setSent(true);
    }
  };

  return (
    <AuthLayout>
      <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Zurück zum Login
      </Link>

      {sent ? (
        <div className="text-center py-8">
          <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">E-Mail gesendet</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir dir einen Link zum Zurücksetzen deines Passworts gesendet.
          </p>
          <Link to="/login" className="btn-primary inline-block mt-6">Zurück zum Login</Link>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Passwort vergessen?</h2>
            <p className="text-gray-500 text-sm">Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.</p>
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

            <button type="submit" className="btn-primary w-full !py-3 text-base" disabled={isSubmitting}>
              {isSubmitting ? "Wird gesendet..." : "Link senden"}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
