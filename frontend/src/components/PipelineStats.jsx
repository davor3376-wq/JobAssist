import { useQuery } from "@tanstack/react-query";
import { Bookmark, Send, Briefcase, Award, XCircle } from "lucide-react";
import { jobApi } from "../services/api";

export default function PipelineStats() {
  const { data: stats = {}, isLoading } = useQuery({
    queryKey: ["pipeline", "stats"],
    queryFn: () => jobApi.getPipelineStats().then(r => r.data),
  });

  const statuses = [
    { key: "bookmarked", label: "Gespeichert", icon: Bookmark, color: "bg-blue-50 border-blue-200" },
    { key: "applied", label: "Beworben", icon: Send, color: "bg-green-50 border-green-200" },
    { key: "interviewing", label: "Vorstellungsgespräch", icon: Briefcase, color: "bg-purple-50 border-purple-200" },
    { key: "offered", label: "Angebot", icon: Award, color: "bg-amber-50 border-amber-200" },
    { key: "rejected", label: "Abgelehnt", icon: XCircle, color: "bg-red-50 border-red-200" },
  ];

  if (isLoading) {
    return <div className="animate-pulse h-24 bg-gray-200 rounded-lg"></div>;
  }

  return (
    <div className="grid grid-cols-5 gap-4 mb-8">
      {statuses.map(({ key, label, icon: Icon, color }) => (
        <div key={key} className={`p-4 rounded-lg border ${color} animate-slide-up`}>
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats[key] || 0}</div>
        </div>
      ))}
    </div>
  );
}
