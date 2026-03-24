import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authApi } from "../services/api";
import AuthLayout from "../components/ui/AuthLayout";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("loading"); // loading, success, error

  useEffect(() => {
    if (!token) { setStatus("error"); return; }
    authApi.verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <AuthLayout>
      <div className="text-center py-8">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900">E-Mail wird bestätigt...</h2>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">E-Mail bestätigt</h2>
            <p className="text-sm text-gray-500 mb-4">Deine E-Mail-Adresse wurde erfolgreich bestätigt.</p>
            <Link to="/login" className="btn-primary inline-block">Zum Login</Link>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Bestätigung fehlgeschlagen</h2>
            <p className="text-sm text-gray-500 mb-4">Der Link ist ungültig oder abgelaufen.</p>
            <Link to="/login" className="btn-primary inline-block">Zum Login</Link>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
