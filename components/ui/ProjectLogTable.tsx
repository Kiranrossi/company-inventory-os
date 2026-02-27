'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, PackageSearch, RefreshCw } from 'lucide-react';

interface ProjectLog {
    id: number;
    project_name: string;
    upload_date: string;
    status: string;
    project_materials: {
        quantity_used: number;
        products: { product_name: string };
    }[];
}

interface ProjectLogTableProps {
    refreshTrigger: number;
}

export default function ProjectLogTable({ refreshTrigger }: ProjectLogTableProps) {
    const [logs, setLogs] = useState<ProjectLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, [refreshTrigger]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/projects/log');
            const json = await res.json();
            if (json.data) setLogs(json.data);
        } catch (e) {
            console.error('Failed to fetch project logs:', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading && logs.length === 0) {
        return (
            <div className="flex items-center justify-center p-12 text-neutral-500 animate-pulse bg-neutral-900 border border-neutral-800 rounded-2xl">
                <RefreshCw size={24} className="animate-spin mr-3 text-blue-500" />
                Synchronizing Audit Logs...
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="bg-neutral-900/50 border border-dashed border-neutral-800 rounded-2xl p-16 flex flex-col items-center justify-center text-neutral-500">
                <PackageSearch size={40} className="mb-4 text-neutral-700" />
                <p className="font-medium text-lg">No Work Orders Processed Yet</p>
                <p className="text-sm mt-1">When a PDF is parsed and stock is successfully deducted, the audit log will appear here.</p>
            </div>
        );
    }

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
            <div className="bg-neutral-800/40 border-b border-neutral-800 px-6 py-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    Deduction Audit Trail
                </h3>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                        <tr className="border-b border-neutral-800 text-neutral-500">
                            <th className="px-6 py-4 font-medium">Work Order UID</th>
                            <th className="px-6 py-4 font-medium">Consumed Resources / Qty</th>
                            <th className="px-6 py-4 font-medium">Date Indexed</th>
                            <th className="px-6 py-4 font-medium text-right">Verification</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/50">
                        {logs.map((log) => (
                            <tr key={log.id} className="hover:bg-neutral-800/30 transition-colors">
                                <td className="px-6 py-4">
                                    <span className="font-semibold text-neutral-200 block">{log.project_name}</span>
                                    <span className="text-xs font-mono text-neutral-500 mt-1 block">ID: {log.id}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-2 pt-1 pb-1">
                                        {log.project_materials?.map((m, i) => (
                                            <div
                                                key={i}
                                                className="bg-black border border-neutral-800 text-neutral-300 rounded-full px-3 py-1 text-xs flex items-center shadow-inner"
                                            >
                                                <span className="mr-2 text-blue-400 font-medium">{m.quantity_used}x</span>
                                                {m.products?.product_name || 'Unknown'}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-neutral-400">
                                    {new Date(log.upload_date).toLocaleString(undefined, {
                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]">
                                        <CheckCircle2 size={12} /> {log.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
