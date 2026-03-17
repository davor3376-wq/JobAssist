import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Trash2, Zap, FileText, MessageSquare, Copy, Check, ChevronDown } from "lucide-react";
import { jobApi, coverLetterApi, interviewApi, resumeApi } from "../services/api";

const LoadingSpinner = () => (
  <div className="inline-block">
    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
  </div>
);

const CircularScore = ({ score }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s) => {
    if (s >= 75) return { bg: "#d1fae5", stroke: "#10b981", text: "#059669" };
    if (s >= 50) return { bg: "#fef3c7", stroke: "#f59e0b", text: "#d97706" };
    return { bg: "#fee2e2", stroke: "#ef4444", text: "#dc2626" };
  };

  const colors = getColor(score);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill={colors.bg}
            stroke="#e5e7eb"
            strokeWidth="2"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: colors.text }}>
              {score}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function JobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  const { data: job, isLoading } = useQuery({
    queryKey: ["jobs", jobId],
    queryFn: () => jobApi.get(jobId).then(r => r.data),
  });

  const { data: resumes = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then(r => r.data),
  });

  const [selectedResume, setSelectedResume] = useState(null);
  const resumeId = selectedResume ?? resumes[0]?.id;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["jobs", jobId] });

  const matchMutation = useMutation({
    mutationFn: () => jobApi.match(Number(jobId), resumeId),
    onSuccess: () => { invalidate(); toast.success("Match score generated!"); },
    onError: () => toast.error("Match failed"),
  });

  const coverLetterMutation = useMutation({
    mutationFn: () => coverLetterApi.generate(Number(jobId), resumeId),
    onSuccess: () => { invalidate(); setActiveTab("cover-letter"); toast.success("Cover letter ready!"); },
    onError: () => toast.error("Cover letter generation failed"),
  });

  const interviewMutation = useMutation({
    mutationFn: () => interviewApi.generate(Number(jobId), resumeId),
    onSuccess: () => { invalidate(); setActiveTab("interview"); toast.success("Interview prep ready!"); },
    onError: () => toast.error("Interview prep generation failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => jobApi.delete(jobId),
    onSuccess: () => { navigate("/jobs"); toast.success("Job deleted"); },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-gray-600">
          <LoadingSpinner />
          <span>Loading job details...</span>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-red-600 font-medium">Job not found.</p>
      </div>
    );
  }

  const matchFeedback = job.match_feedback ? JSON.parse(job.match_feedback) : null;
  const interviewQA = job.interview_qa ? JSON.parse(job.interview_qa) : null;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "cover-letter", label: "Cover Letter", disabled: !job.cover_letter },
    { id: "interview", label: "Interview Prep", disabled: !job.interview_qa },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>

      {/* Header */}
      <div className="animate-fade-in mb-8">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-1">{job.role || "Untitled role"}</h1>
            <p className="text-lg text-gray-600">{job.company || "Unknown company"}</p>
          </div>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            title="Delete job"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Resume selector */}
      {resumes.length > 0 && (
        <div className="animate-slide-up mb-6 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <label className="text-sm font-semibold text-gray-700 block mb-2">Select Resume</label>
          <div className="relative">
            <select
              value={resumeId}
              onChange={e => setSelectedResume(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 appearance-none cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 transition-all"
            >
              {resumes.map(r => <option key={r.id} value={r.id}>{r.filename}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="animate-slide-up flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => matchMutation.mutate()}
          disabled={matchMutation.isPending || !resumeId}
          className="flex items-center gap-2 px-5 py-3 font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:from-gray-400 disabled:to-gray-500 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:cursor-not-allowed disabled:shadow-none"
        >
          {matchMutation.isPending ? (
            <>
              <LoadingSpinner />
              <span>Analyzing…</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>Match score</span>
            </>
          )}
        </button>
        <button
          onClick={() => coverLetterMutation.mutate()}
          disabled={coverLetterMutation.isPending || !resumeId}
          className="flex items-center gap-2 px-5 py-3 font-semibold text-gray-700 bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400 disabled:bg-gray-50 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
        >
          {coverLetterMutation.isPending ? (
            <>
              <LoadingSpinner />
              <span>Generating…</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              <span>Cover letter</span>
            </>
          )}
        </button>
        <button
          onClick={() => interviewMutation.mutate()}
          disabled={interviewMutation.isPending || !resumeId}
          className="flex items-center gap-2 px-5 py-3 font-semibold text-gray-700 bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 disabled:border-gray-200 disabled:text-gray-400 disabled:bg-gray-50 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
        >
          {interviewMutation.isPending ? (
            <>
              <LoadingSpinner />
              <span>Generating…</span>
            </>
          ) : (
            <>
              <MessageSquare className="w-4 h-4" />
              <span>Interview prep</span>
            </>
          )}
        </button>
      </div>

      {/* Match score banner */}
      {job.match_score != null && (
        <div className="animate-slide-up mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-6">Match Analysis</h2>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0">
                <CircularScore score={job.match_score} />
              </div>
              <div className="flex-1">
                <p className="text-gray-700 leading-relaxed">{matchFeedback?.summary}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs - Modern pill-style */}
      <div className="animate-slide-up mb-8">
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-white text-indigo-600 shadow-sm"
                  : tab.disabled
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-slide-up">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Job Description */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-indigo-600 to-indigo-400 rounded-full"></span>
                Job Description
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{job.description}</p>
            </div>

            {/* Strengths & Gaps */}
            {matchFeedback && (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Strengths */}
                <div className="bg-white rounded-xl border border-green-200 border-l-4 border-l-emerald-500 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-semibold text-emerald-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Strengths
                  </h3>
                  <ul className="space-y-3">
                    {matchFeedback.strengths?.map((s, i) => (
                      <li key={i} className="flex gap-3 text-gray-700">
                        <span className="text-emerald-500 font-bold flex-shrink-0">+</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Gaps */}
                <div className="bg-white rounded-xl border border-red-200 border-l-4 border-l-red-500 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Areas to Improve
                  </h3>
                  <ul className="space-y-3">
                    {matchFeedback.gaps?.map((g, i) => (
                      <li key={i} className="flex gap-3 text-gray-700">
                        <span className="text-red-500 font-bold flex-shrink-0">-</span>
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "cover-letter" && job.cover_letter && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Generated Cover Letter</h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(job.cover_letter);
                    setCopiedIndex(-1);
                    setTimeout(() => setCopiedIndex(null), 2000);
                    toast.success("Copied to clipboard!");
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all duration-200 border border-indigo-200"
                >
                  {copiedIndex === -1 ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{job.cover_letter}</p>
            </div>
          </div>
        )}

        {activeTab === "interview" && interviewQA && (
          <div className="space-y-4">
            {interviewQA.map((item, i) => (
              <div
                key={i}
                className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                  expandedQuestion === i
                    ? "bg-white border-indigo-200 shadow-md"
                    : "bg-gray-50 border-gray-200 hover:border-gray-300"
                }`}
              >
                <button
                  onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}
                  className="w-full px-6 py-4 flex items-start justify-between gap-4 text-left hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-1">
                      <span className="text-sm font-semibold text-gray-400 flex-shrink-0">
                        Q{i + 1}
                      </span>
                      <p className="font-semibold text-gray-900 text-sm">{item.question}</p>
                    </div>
                    <div className="flex gap-2 ml-7 flex-wrap">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          item.type === "technical"
                            ? "bg-blue-100 text-blue-700"
                            : item.type === "behavioral"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {item.type}
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                      expandedQuestion === i ? "transform rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedQuestion === i && (
                  <div className="border-t border-gray-200 bg-white px-6 py-4 space-y-4 animate-fade-in">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Answer</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{item.answer}</p>
                    </div>
                    {item.tip && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-amber-900 mb-1">PRO TIP</p>
                        <p className="text-sm text-amber-900">{item.tip}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
