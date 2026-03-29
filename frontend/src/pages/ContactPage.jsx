import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ArrowLeft, Mail, Clock, Send, CheckCircle2, Loader2, MessageCircle, FileText, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { contactApi } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";

const TOPICS = [
  "Allgemeine Frage",
  "Technischer Support",
  "Datenschutz / DSGVO",
  "Abrechnung & Abonnement",
  "Feedback & Verbesserungen",
  "Sonstiges",
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: "", email: "", topic: "", message: "" },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await contactApi.send(data);
      setSubmitted(true);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Fehler beim Senden. Bitte versuche es erneut."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-20">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Link>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Kontakt & Support</h1>
          <p className="text-gray-500 text-base max-w-md mx-auto">
            Wir helfen dir gerne weiter — ob technische Frage, Feedback oder Datenschutzanliegen.
          </p>
        </div>

        {submitted ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Nachricht gesendet!</h2>
            <p className="text-sm text-gray-500 mb-6">
              Vielen Dank für deine Nachricht. Wir melden uns in der Regel innerhalb von 24 Stunden bei dir.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
            >
              Weitere Nachricht senden
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Form */}
            <div className="md:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-gray-900 mb-5">Nachricht senden</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
                  <input
                    type="text"
                    placeholder="Dein Name"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-all ${errors.name ? "border-red-400" : "border-gray-200"}`}
                    {...register("name", { required: "Name ist erforderlich" })}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">E-Mail</label>
                  <input
                    type="email"
                    placeholder="deine@email.at"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-all ${errors.email ? "border-red-400" : "border-gray-200"}`}
                    {...register("email", {
                      required: "E-Mail ist erforderlich",
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Ungültige E-Mail-Adresse" },
                    })}
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Thema</label>
                  <select
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-all ${errors.topic ? "border-red-400" : "border-gray-200"}`}
                    {...register("topic", { required: "Bitte wähle ein Thema" })}
                  >
                    <option value="">Thema auswählen…</option>
                    {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors.topic && <p className="text-xs text-red-500 mt-1">{errors.topic.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nachricht</label>
                  <textarea
                    rows={5}
                    placeholder="Beschreibe dein Anliegen so genau wie möglich…"
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-all resize-none ${errors.message ? "border-red-400" : "border-gray-200"}`}
                    {...register("message", { required: "Nachricht ist erforderlich", minLength: { value: 10, message: "Mindestens 10 Zeichen" } })}
                  />
                  {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {loading ? "Wird gesendet…" : "Nachricht senden"}
                </button>
              </form>
            </div>

            {/* Sidebar info */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Mail className="w-4.5 h-4.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Direkter Kontakt</p>
                    <a href="mailto:jobassistsupport@gmail.com" className="text-xs text-blue-600 hover:underline">
                      jobassistsupport@gmail.com
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  Antwort innerhalb von 24 Stunden
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { icon: MessageCircle, label: "Allgemeine Fragen", sub: "Funktionen, Preise, Abos" },
                  { icon: FileText, label: "Technischer Support", sub: "Fehler & Probleme" },
                  { icon: Shield, label: "Datenschutz", sub: "DSGVO-Anfragen" },
                ].map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">{label}</p>
                      <p className="text-[11px] text-gray-400">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-bold text-gray-700 mb-3">Rechtliches</p>
                <div className="space-y-2">
                  {[
                    { to: "/terms", label: "AGB" },
                    { to: "/privacy", label: "Datenschutzerklärung" },
                    { to: "/impressum", label: "Impressum" },
                  ].map(({ to, label }) => (
                    <Link key={to} to={to} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 group transition-colors">
                      <span className="text-xs text-gray-600">{label}</span>
                      <ArrowLeft className="w-3.5 h-3.5 text-gray-300 rotate-180 group-hover:text-gray-500 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
