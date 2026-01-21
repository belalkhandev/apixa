import { AlertCircle } from "lucide-react";

interface ErrorAnalysisProps {
    errorCategories: Record<string, number>;
    totalErrors: number;
}

export default function ErrorAnalysis({ errorCategories, totalErrors }: ErrorAnalysisProps) {
    if (totalErrors === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-emerald-50/30 rounded-2xl border-2 border-dashed border-emerald-200">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <p className="text-sm font-semibold text-emerald-700">No Errors Detected</p>
                <p className="text-xs text-emerald-600 mt-1">All requests completed successfully</p>
            </div>
        );
    }

    const sortedErrors = Object.entries(errorCategories)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10); // Show top 10 error types

    const getCategoryColor = (category: string) => {
        switch (category) {
            case "timeout":
                return "bg-orange-100 text-orange-700 border-orange-200";
            case "connection_refused":
                return "bg-red-100 text-red-700 border-red-200";
            case "dns_error":
                return "bg-purple-100 text-purple-700 border-purple-200";
            case "tls_error":
                return "bg-pink-100 text-pink-700 border-pink-200";
            case "4xx":
                return "bg-yellow-100 text-yellow-700 border-yellow-200";
            case "5xx":
                return "bg-red-100 text-red-700 border-red-200";
            case "network_error":
                return "bg-blue-100 text-blue-700 border-blue-200";
            default:
                return "bg-slate-100 text-slate-700 border-slate-200";
        }
    };

    const formatCategoryName = (category: string) => {
        return category
            .split("_")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-500" />
                    Error Analysis
                </h3>
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                    {totalErrors} errors
                </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                {sortedErrors.map(([category, count]) => {
                    const percentage = (count / totalErrors) * 100;
                    return (
                        <div
                            key={category}
                            className={`p-3 rounded-xl border ${getCategoryColor(category)} transition-all hover:shadow-sm`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold uppercase tracking-wide">
                                    {formatCategoryName(category)}
                                </span>
                                <span className="text-xs font-bold">
                                    {count} ({percentage.toFixed(1)}%)
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-white/50 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-current opacity-40 rounded-full transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
