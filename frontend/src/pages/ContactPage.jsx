import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Clock, MessageCircle, FileText, Shield } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-20">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Kontakt & Support</h1>
          <p className="text-gray-500 text-base max-w-md mx-auto">
            Wir helfen dir gerne weiter — ob technische Frage, Feedback oder Anliegen zum Datenschutz.
          </p>
        </div>

        {/* Main contact card */}
        <div className="bg-white rounded-2xl border shadow-sm p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">E-Mail-Support</h2>
              <p className="text-sm text-gray-500">Der schnellste Weg, uns zu erreichen</p>
            </div>
          </div>

          <a
            href="mailto:jobassistsupport@gmail.com"
            className="block w-full text-center py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25"
          >
            jobassistsupport@gmail.com
          </a>

          <div className="flex items-center gap-2 mt-4 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Wir antworten in der Regel innerhalb von 24 Stunden</span>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border p-5 text-center">
            <MessageCircle className="w-6 h-6 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Allgemeine Fragen</h3>
            <p className="text-xs text-gray-500">Funktionen, Preise, Abonnements</p>
          </div>
          <div className="bg-white rounded-xl border p-5 text-center">
            <FileText className="w-6 h-6 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Technischer Support</h3>
            <p className="text-xs text-gray-500">Fehler melden, Hilfe bei Problemen</p>
          </div>
          <div className="bg-white rounded-xl border p-5 text-center">
            <Shield className="w-6 h-6 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Datenschutz</h3>
            <p className="text-xs text-gray-500">DSGVO-Anfragen, Datenlöschung</p>
          </div>
        </div>

        {/* Helpful links */}
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-4">Hilfreiche Links</h3>
          <div className="space-y-3">
            <Link to="/terms" className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors group">
              <span className="text-sm text-gray-700">Allgemeine Geschäftsbedingungen (AGB)</span>
              <ArrowLeft className="w-4 h-4 text-gray-300 rotate-180 group-hover:text-gray-500 transition-colors" />
            </Link>
            <Link to="/privacy" className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors group">
              <span className="text-sm text-gray-700">Datenschutzerklärung</span>
              <ArrowLeft className="w-4 h-4 text-gray-300 rotate-180 group-hover:text-gray-500 transition-colors" />
            </Link>
            <Link to="/impressum" className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors group">
              <span className="text-sm text-gray-700">Impressum</span>
              <ArrowLeft className="w-4 h-4 text-gray-300 rotate-180 group-hover:text-gray-500 transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
