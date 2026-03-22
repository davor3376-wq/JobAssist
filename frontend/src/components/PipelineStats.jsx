import { useQuery } from "@tanstack/react-query";
import { Bookmark, Send, MessageSquare, Award, XCircle } from "lucide-react";
import { jobApi } from "../services/api";

export default function PipelineStats() {
  const { data: stats = {}, isLoading } = useQuery({
    queryKey: ["pipeline", "stats"],
    queryFn: () => jobApi.getPipelineStats().then(r => r.data),
  });

  const statuses = [
    { key: "bookmarked",   label: "Gespeichert", icon: Bookmark,      iconColor: "text-blue-500",   color: "bg-blue-50 border-blue-200" },
    { key: "applied",      label: "Beworben",    icon: Send,           iconColor: "text-green-500",  color: "bg-green-50 border-green-200" },
    { key: "interviewing", label: "Gespräch",    icon: MessageSquare,  iconColor: "text-purple-500", color: "bg-purple-50 border-purple-200" },
    { key: "offered",      label: "Angebot",     icon: Award,          iconColor: "text-amber-500",  color: "bg-amber-50 border-amber-200" },
    { key: "rejected",     label: "Abgelehnt",   icon: XCircle,        iconColor: "text-red-500",    color: "bg-red-50 border-red-200" },
  ];

  if (isLoading) {
    return <div className="animate-pulse h-24 bg-gray-200 rounded-lg"></div>;
  }

  return (
    <div className="grid grid-cols-5 gap-3 mb-8">
      {statuses.map(({ key, label, icon: Icon, iconColor, color }) => (
        <div key={key} className={`p-4 rounded-xl border ${color} animate-slide-up`}>
          <div className="flex items-center gap-2 mb-3">
            <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
            <span className="text-xs font-semibold text-gray-600 truncate">{label}</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats[key] ?? 0}</div>
        </div>
      ))}
    </div>
  );
}
