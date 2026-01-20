import { motion } from "framer-motion";
import { LoadTestProgress } from "../api";

interface RunnerStatsProps {
    history: LoadTestProgress[];
}

export default function RunnerStats({ history }: RunnerStatsProps) {
    if (history.length < 2) {
        return (
            <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                <p className="text-sm text-slate-400 font-medium">Waiting for data...</p>
            </div>
        );
    }

    const maxRps = Math.max(...history.map(p => p.current_rps), 1);
    const maxLat = Math.max(...history.map(p => p.avg_latency_ms), 1);

    const getPoints = (data: number[], max: number) => {
        return data.map((val, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - (val / max) * 100;
            return `${x},${y}`;
        }).join(" ");
    };

    const rpsPoints = getPoints(history.map(p => p.current_rps), maxRps);
    const latPoints = getPoints(history.map(p => p.avg_latency_ms), maxLat);

    return (
        <div className="space-y-6">
            {/* RPS Chart */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Requests Per Second</h3>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{history[history.length - 1].current_rps.toFixed(1)} RPS</span>
                </div>
                <div className="h-[120px] w-full relative">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        {/* Area */}
                        <motion.polyline
                            fill="rgba(37, 99, 235, 0.1)"
                            points={`0,100 ${rpsPoints} 100,100`}
                            transition={{ duration: 0.2 }}
                        />
                        {/* Line */}
                        <motion.polyline
                            fill="none"
                            stroke="#2563eb"
                            strokeWidth="2"
                            strokeLinejoin="round"
                            points={rpsPoints}
                            transition={{ duration: 0.2 }}
                        />
                    </svg>
                </div>
            </div>

            {/* Latency Chart */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Latency (ms)</h3>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{history[history.length - 1].avg_latency_ms}ms</span>
                </div>
                <div className="h-[120px] w-full relative">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        {/* Area */}
                        <motion.polyline
                            fill="rgba(16, 185, 129, 0.1)"
                            points={`0,100 ${latPoints} 100,100`}
                            transition={{ duration: 0.2 }}
                        />
                        {/* Line */}
                        <motion.polyline
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2"
                            strokeLinejoin="round"
                            points={latPoints}
                            transition={{ duration: 0.2 }}
                        />
                    </svg>
                </div>
            </div>
        </div>
    );
}
