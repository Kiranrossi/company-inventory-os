'use client';

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { Briefcase, Layers, AlertCircle, HeartPulse } from 'lucide-react';

interface ChartDataProps {
    metrics?: {
        totalWorkOrders: number;
        totalMaterialsConsumed: number;
        activeWarnings: number;
        systemHealth: number;
    };
    categoryUsage: { name: string, value: number }[];
    productUsage: { name: string, value: number }[];
    trendWithForecast: { date: string, value: number, forecast: number | null }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DashboardCharts({ data }: { data: ChartDataProps }) {

    if (!data) return <div className="p-8 animate-pulse text-neutral-500">Loading charts...</div>;

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">

            {/* Top Row: KPI Metric Cards */}
            {data.metrics && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between hover:border-purple-500/50 transition-all group">
                        <div className="flex items-start justify-between mb-4">
                            <span className="text-sm font-medium text-neutral-400">Total Work Orders</span>
                            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg group-hover:scale-110 transition-transform"><Briefcase size={18} /></div>
                        </div>
                        <h4 className="text-3xl font-bold text-white">{data.metrics.totalWorkOrders}</h4>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between hover:border-blue-500/50 transition-all group">
                        <div className="flex items-start justify-between mb-4">
                            <span className="text-sm font-medium text-neutral-400">Total Units Consumed</span>
                            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg group-hover:scale-110 transition-transform"><Layers size={18} /></div>
                        </div>
                        <h4 className="text-3xl font-bold text-white">{data.metrics.totalMaterialsConsumed.toLocaleString()}</h4>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between hover:border-rose-500/50 transition-all group">
                        <div className="flex items-start justify-between mb-4">
                            <span className="text-sm font-medium text-neutral-400">Critical Stock Warnings</span>
                            <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg group-hover:scale-110 transition-transform"><AlertCircle size={18} /></div>
                        </div>
                        <h4 className="text-3xl font-bold text-rose-500">{data.metrics.activeWarnings}</h4>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between hover:border-emerald-500/50 transition-all group">
                        <div className="flex items-start justify-between mb-4">
                            <span className="text-sm font-medium text-neutral-400">Master Stock Health</span>
                            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg group-hover:scale-110 transition-transform"><HeartPulse size={18} /></div>
                        </div>
                        <h4 className="text-3xl font-bold text-emerald-500">{data.metrics.systemHealth}%</h4>
                    </div>
                </div>
            )}

            {/* Middle Row: Trend/Forecast & Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">

                {/* Trend Line Chart (Span 2 cols) */}
                <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col hover:border-blue-500/50 transition-colors">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-neutral-200">Consumption Trend & Forecast</h3>
                        <p className="text-xs text-neutral-500">Monthly breakdown predicting next period exhaustion.</p>
                    </div>
                    <div className="flex-1 w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.trendWithForecast}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                <XAxis dataKey="date" stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#737373" fontSize={12} tickLine={false} axisLine={false} />
                                {/* @ts-ignore */}
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '12px' }}
                                    itemStyle={{ color: '#e5e5e5' }}
                                />
                                <Legend iconType="circle" />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    name="Actual Consumption"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="forecast"
                                    name="Projected Forecast"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    strokeDasharray="5 5"
                                    dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Pie Chart (Span 1 col) */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col hover:border-emerald-500/50 transition-colors">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-neutral-200">Category Distribution</h3>
                        <p className="text-xs text-neutral-500">Volume share of master categories.</p>
                    </div>
                    <div className="flex-1 w-full relative -mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.categoryUsage}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {data.categoryUsage.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                {/* @ts-ignore */}
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '12px' }}
                                    itemStyle={{ color: '#e5e5e5' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2 text-xs text-neutral-400">
                        {data.categoryUsage.map((c, i) => (
                            <div key={i} className="flex justify-between items-center bg-neutral-800/50 p-2 rounded-lg">
                                <span className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                                    {c.name}
                                </span>
                                <span className="font-mono font-medium text-neutral-200">{Math.round((c.value / data.categoryUsage.reduce((acc, curr) => acc + curr.value, 0)) * 100)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Product Bar Chart */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 h-96 hover:border-amber-500/50 transition-colors">
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-neutral-200">Top 10 Depleted Resources</h3>
                    <p className="text-xs text-neutral-500">Highest volume consumption by individual material unit.</p>
                </div>
                <div className="w-full h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.productUsage} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                            <XAxis dataKey="name" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} angle={-25} textAnchor="end" height={60} />
                            <YAxis stroke="#737373" fontSize={11} tickLine={false} axisLine={false} />
                            {/* @ts-ignore */}
                            <RechartsTooltip
                                cursor={{ fill: '#262626', opacity: 0.4 }}
                                contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '12px' }}
                                itemStyle={{ color: '#e5e5e5' }}
                            />
                            <Bar dataKey="value" name="Units Consumed" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    );
}
