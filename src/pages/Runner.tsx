import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Play,
    Square,
    Users,
    Clock,
    Zap,
    BarChart3,
    Timer,
    Activity,
    Globe,
    ListFilter,
    Download,
    TrendingUp
} from "lucide-react";
import { api, LoadTestConfig, LoadTestProgress, Environment, RecordedRequest } from "../api";
import { listen } from "@tauri-apps/api/event";
import RunnerStats from "../components/RunnerStats";
import ResponseTimeDistribution from "../components/ResponseTimeDistribution";
import ErrorAnalysis from "../components/ErrorAnalysis";
import { exportToJSON, exportToCSV, downloadFile } from "../utils/exportResults";

export default function Runner() {
    const { collectionId } = useParams<{ collectionId: string }>();
    const navigate = useNavigate();
    const [isRunning, setIsRunning] = useState(false);
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [progress, setProgress] = useState<LoadTestProgress | null>(null);
    const [config, setConfig] = useState<LoadTestConfig>({
        collection_id: collectionId || "",
        environment_id: null,
        concurrent_users: 10,
        duration_seconds: 60,
        loop_count: null,
        delay_ms: 0,
    });
    const [history, setHistory] = useState<LoadTestProgress[]>([]);
    const [requestLog, setRequestLog] = useState<RecordedRequest[]>([]);
    const logScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadEnvironments();
    }, []);

    const loadEnvironments = async () => {
        try {
            const data = await api.getEnvironments();
            setEnvironments(data);
        } catch (error) {
            console.error("Failed to load environments:", error);
        }
    };

    useEffect(() => {
        if (!collectionId) return;

        const unlisten = listen<LoadTestProgress>(
            `load_test_progress_${collectionId}`,
            (event) => {
                const newProgress = event.payload;
                setProgress(newProgress);
                setHistory((prev: LoadTestProgress[]) => [...prev.slice(-50), newProgress]);

                if (newProgress.recent_results && newProgress.recent_results.length > 0) {
                    setRequestLog((prev: RecordedRequest[]) => [...prev.slice(-99), ...newProgress.recent_results]);
                }

                if (newProgress.is_finished) {
                    setIsRunning(false);
                }
            }
        );

        return () => {
            unlisten.then(f => f());
        };
    }, [collectionId]);

    useEffect(() => {
        if (logScrollRef.current) {
            logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
        }
    }, [requestLog]);

    const handleStart = async () => {
        try {
            setIsRunning(true);
            setHistory([]);
            setProgress(null);
            setRequestLog([]);
            await api.startLoadTest(config);
        } catch (error) {
            console.error("Failed to start load test:", error);
            setIsRunning(false);
        }
    };

    const handleStop = async () => {
        try {
            await api.stopLoadTest();
            setIsRunning(false);
        } catch (error) {
            console.error("Failed to stop load test:", error);
        }
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    };

    const handleExportJSON = () => {
        if (!progress) return;
        const json = exportToJSON(progress, requestLog);
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
        downloadFile(json, `load-test-${timestamp}.json`);
    };

    const handleExportCSV = () => {
        const csv = exportToCSV(requestLog);
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
        downloadFile(csv, `load-test-${timestamp}.csv`);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate("/")}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-800">Collection Runner</h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">High Performance Engine</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {progress && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportJSON}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors text-sm"
                            >
                                <Download size={16} />
                                JSON
                            </button>
                            <button
                                onClick={handleExportCSV}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors text-sm"
                            >
                                <Download size={16} />
                                CSV
                            </button>
                        </div>
                    )}
                    {!isRunning ? (
                        <button
                            onClick={handleStart}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                        >
                            <Play size={18} fill="currentColor" />
                            Start Run
                        </button>
                    ) : (
                        <button
                            onClick={handleStop}
                            className="flex items-center gap-2 px-6 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                        >
                            <Square size={18} fill="currentColor" />
                            Stop Run
                        </button>
                    )}
                </div>
            </header>

            <main className="flex-1 p-6 w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Config Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <section className="bg-white rounded-2xl border border-slate-200 p-6">
                        <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Activity size={16} className="text-blue-500" />
                            Configuration
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-500 block mb-1.5 uppercase">Environment</label>
                                <div className="relative">
                                    <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <select
                                        disabled={isRunning}
                                        value={config.environment_id || ""}
                                        onChange={(e) => setConfig({ ...config, environment_id: e.target.value || null })}
                                        className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 appearance-none bg-no-repeat"
                                        style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,<svg%20xmlns="http://www.w3.org/2000/svg"%20width="24"%20height="24"%20viewBox="0%200%2024%2024"%20fill="none"%20stroke="gray"%20stroke-width="2"%20stroke-linecap="round"%20stroke-linejoin="round"><polyline%20points="6%209%2012%2015%2018%209"></polyline></svg>')`, backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
                                    >
                                        <option value="">No Environment</option>
                                        {environments.map((env: Environment) => (
                                            <option key={env.id} value={env.id}>{env.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-500 block mb-1.5 uppercase">Concurrent Users</label>
                                <div className="relative">
                                    <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="number"
                                        disabled={isRunning}
                                        value={config.concurrent_users}
                                        onChange={(e) => setConfig({ ...config, concurrent_users: parseInt(e.target.value) || 1 })}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-500 block mb-1.5 uppercase">Duration (Seconds)</label>
                                <div className="relative">
                                    <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="number"
                                        disabled={isRunning}
                                        value={config.duration_seconds || ""}
                                        onChange={(e) => setConfig({ ...config, duration_seconds: e.target.value ? parseInt(e.target.value) : null })}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-500 block mb-1.5 uppercase">Delay (ms)</label>
                                <div className="relative">
                                    <Timer size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="number"
                                        disabled={isRunning}
                                        value={config.delay_ms}
                                        onChange={(e) => setConfig({ ...config, delay_ms: parseInt(e.target.value) || 0 })}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Request Log */}
                    <section className="bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden h-[400px]">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                <ListFilter size={16} className="text-blue-500" />
                                Request Log
                            </h2>
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">{requestLog.length}</span>
                        </div>
                        <div ref={logScrollRef} className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {requestLog.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-40">
                                    <Activity size={32} className="mb-2" />
                                    <p className="text-xs">Waiting for data...</p>
                                </div>
                            ) : (
                                requestLog.map((log: RecordedRequest, i: number) => (
                                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${log.status >= 200 && log.status < 300 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                            {log.status === 0 ? 'FAIL' : log.status}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <p className="text-[11px] font-bold text-slate-700 truncate">{log.name}</p>
                                                <span className="text-[10px] text-slate-400">{log.latency_ms}ms</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 truncate font-mono">{log.url}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                {/* Results Main Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Real-time Stats Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label="Avg RPS"
                            value={progress?.current_rps.toFixed(1) || "0.0"}
                            icon={<Activity size={18} />}
                            color="blue"
                        />
                        <StatCard
                            label="P95 Latency"
                            value={`${progress?.p95_latency_ms || 0}ms`}
                            icon={<Timer size={18} />}
                            color="emerald"
                        />
                        <StatCard
                            label="P99 Latency"
                            value={`${progress?.p99_latency_ms || 0}ms`}
                            icon={<Zap size={18} />}
                            color="orange"
                        />
                        <StatCard
                            label="Throughput"
                            value={formatBytes((progress?.bytes_sent || 0) + (progress?.bytes_received || 0))}
                            icon={<TrendingUp size={18} />}
                            color="indigo"
                        />
                    </div>

                    {/* Charts Section */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 overflow-hidden min-h-[450px] flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                <BarChart3 size={16} className="text-blue-500" />
                                Live Performance Metrics
                            </h2>
                            {isRunning && (
                                <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                    Live Stream
                                </div>
                            )}
                        </div>

                        <div className="flex-1">
                            <RunnerStats history={history} />
                        </div>
                    </div>

                    {/* Histogram and Error Analysis */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <ResponseTimeDistribution histogram={progress?.latency_histogram || []} />
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <ErrorAnalysis
                                errorCategories={progress?.error_categories || {}}
                                totalErrors={progress?.failed_requests || 0}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function StatCard({ label, value, icon, color }: { label: string, value: string, icon: React.ReactNode, color: 'blue' | 'emerald' | 'red' | 'indigo' | 'orange' }) {
    const colors = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        red: "bg-red-50 text-red-600 border-red-100",
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
        orange: "bg-orange-50 text-orange-600 border-orange-100",
    };

    return (
        <div className={`p-4 rounded-2xl border ${colors[color]} flex flex-col gap-2`}>
            <div className="flex items-center justify-between opacity-70">
                <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
                {icon}
            </div>
            <span className="text-lg md:text-2xl font-bold tracking-tight">{value}</span>
        </div>
    );
}
