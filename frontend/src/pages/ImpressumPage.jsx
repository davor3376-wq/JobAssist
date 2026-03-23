import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-20">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Link>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Impressum</h1>
        <p className="text-sm text-gray-400 mb-10">Angaben gemäß § 5 E-Commerce-Gesetz (ECG) und § 25 Mediengesetz (MedienG)</p>

        <div className="prose prose-gray max-w-none space-y-8 text-[15px] leading-relaxed text-gray-700">
          <section className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Unternehmensangaben</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="font-semibold text-gray-900 sm:w-48 flex-shrink-0">Unternehmensbezeichnung</dt>
                <dd className="text-gray-600">[Vor- und Nachname] — Einzelunternehmen</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="font-semibold text-gray-900 sm:w-48 flex-shrink-0">Unternehmensgegenstand</dt>
                <dd className="text-gray-600">IT-Dienstleistungen / Softwareentwicklung</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="font-semibold text-gray-900 sm:w-48 flex-shrink-0">Rechtsform</dt>
                <dd className="text-gray-600">Einzelunternehmen (Kleingewerbe gem. § 1 Abs. 2 GewO)</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="font-semibold text-gray-900 sm:w-48 flex-shrink-0">Anschrift</dt>
                <dd className="text-gray-600">[Straße und Hausnummer]<br />[PLZ Ort], Österreich</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="font-semibold text-gray-900 sm:w-48 flex-shrink-0">E-Mail</dt>
                <dd className="text-gray-600">kontakt@jobassist.app</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="font-semibold text-gray-900 sm:w-48 flex-shrink-0">UID-Nr.</dt>
                <dd className="text-gray-600">[ATU00000000] (falls vorhanden)</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="font-semibold text-gray-900 sm:w-48 flex-shrink-0">GISA-Zahl</dt>
                <dd className="text-gray-600">[wird nach Gewerbeanmeldung ergänzt]</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <dt className="font-semibold text-gray-900 sm:w-48 flex-shrink-0">Zuständige Behörde</dt>
                <dd className="text-gray-600">Bezirkshauptmannschaft / Magistrat [Ort]</dd>
              </div>
            </dl>
          </section>

          <section className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Medieninhaber & Herausgeber</h2>
            <p>
              Medieninhaber und Herausgeber dieser Website ist die oben genannte Person. Grundlegende Richtung des Mediums: Information über das Produkt JobAssist und KI-gestützte Bewerbungshilfe für den österreichischen Arbeitsmarkt.
            </p>
          </section>

          <section className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Haftungsausschluss</h2>
            <p>
              Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
            </p>
            <p className="mt-2">
              Die von der KI generierten Inhalte stellen keine Rechts-, Karriere- oder Finanzberatung dar. Die Nutzung erfolgt auf eigene Verantwortung.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Streitbeilegung</h2>
            <p>
              Online-Streitbeilegung gemäß Art. 14 Abs. 1 ODR-VO:{" "}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                https://ec.europa.eu/consumers/odr
              </a>
            </p>
            <p className="mt-2">
              Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
            <p className="font-semibold text-gray-900 mb-1">Hinweis</p>
            <p className="text-gray-600">
              Die mit [Klammern] gekennzeichneten Angaben sind Platzhalter und müssen vor Veröffentlichung mit deinen tatsächlichen Unternehmensdaten ergänzt werden.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
