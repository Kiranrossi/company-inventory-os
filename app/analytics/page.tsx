'use client';

import { useEffect, useState } from 'react';
import DashboardCharts from '@/components/charts/DashboardCharts';
import { AreaChart, Activity, RefreshCw } from 'lucide-react';

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/analytics');
            const json = await res.json();
            if (json.data) {
                setData(json.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto pb-12">
            <header className="flex justify-between items-end border-b border-neutral-800 pb-6">
                <div>
                    <div className="flex gap-3 items-center mb-2">
                        <AreaChart size={28} className="text-purple-500" />
                        <h1 className="text-3xl font-bold text-white tracking-tight">Machine Insights & Telemetry</h1>
                    </div>
                    <p className="text-neutral-400 max-w-2xl">
                        Visualize your warehouse's historical consumption statistics. Forecast models predict the trajectory
                        of your material burn-rate to help optimize future inventory ordering.
                    </p>
                </div>

                <button
                    onClick={fetchAnalytics}
                    disabled={loading}
                    className="p-3 bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors hidden sm:flex items-center gap-2 group"
                >
                    {loading ? (
                        <RefreshCw size={18} className="animate-spin text-purple-500" />
                    ) : (
                        <Activity size={18} className="group-hover:text-purple-400 transition-colors" />
                    )}
                    <span className="text-sm font-medium">Telemetry Sync</span>
                </button>
            </header>

            {/* Main Content Area */}
            <section className="w-full">
                {loading && !data ? (
                    <div className="w-full h-96 border border-neutral-800 rounded-3xl bg-neutral-900/50 flex flex-col items-center justify-center animate-pulse">
                        <Activity size={40} className="text-purple-500/50 mb-4 animate-bounce" />
                        <p className="text-neutral-500 font-medium">Compiling Machine Learning Models...</p>
                    </div>
                ) : data ? (
                    <DashboardCharts data={data} />
                ) : (
                    <div className="text-center p-12 text-rose-500">Failed to load analytics payload.</div>
                )}
            </section>

        </div>
    );
}
