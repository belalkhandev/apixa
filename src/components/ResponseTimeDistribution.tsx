import { HistogramBucket } from "../api";
import { motion } from "framer-motion";

interface ResponseTimeDistributionProps {
    histogram: HistogramBucket[];
}

export default function ResponseTimeDistribution({ histogram }: ResponseTimeDistributionProps) {
    if (!histogram || histogram.length === 0) {
        return (
            <div className="h-[250px] flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                <p className="text-sm text-slate-400 font-medium">Waiting for data...</p>
            </div>
        );
    }

    const totalRequests = histogram.reduce((sum, bucket) => sum + bucket.count, 0);
    const maxCount = Math.max(...histogram.map(b => b.count), 1);

    const formatRange = (start: number, end: number) => {
        if (end === 0) return `${start}+ms`;
        return `${start}-${end}ms`;
    };

    const getBarColor = (start: number) => {
        if (start < 100) return "bg-emerald-500";
        if (start < 500) return "bg-yellow-500";
        if (start < 1000) return "bg-orange-500";
        return "bg-red-500";
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Response Time Distribution</h3>
                <span className="text-xs text-slate-500">{totalRequests} total requests</span>
            </div>
            <div className="space-y-2">
                {histogram.map((bucket, index) => {
                    const percentage = totalRequests > 0 ? (bucket.count / totalRequests) * 100 : 0;
                    const barWidth = totalRequests > 0 ? (bucket.count / maxCount) * 100 : 0;

                    return (
                        <div key={index} className="flex items-center gap-3">
                            <div className="w-24 text-xs font-medium text-slate-600 text-right">
                                {formatRange(bucket.range_start, bucket.range_end)}
                            </div>
                            <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${barWidth}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className={`h-full ${getBarColor(bucket.range_start)} flex items-center justify-end pr-2`}
                                >
                                    {bucket.count > 0 && (
                                        <span className="text-xs font-bold text-white drop-shadow">
                                            {bucket.count}
                                        </span>
                                    )}
                                </motion.div>
                            </div>
                            <div className="w-16 text-xs font-semibold text-slate-600">
                                {percentage.toFixed(1)}%
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
