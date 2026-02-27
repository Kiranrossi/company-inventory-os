'use client';

import { Activity, AlertTriangle, PackageX } from 'lucide-react';

interface LowStockCardProps {
    productName: string;
    categoryName: string;
    quantity: number;
    threshold: number;
}

export default function LowStockCard({ productName, categoryName, quantity, threshold }: LowStockCardProps) {
    // Determine severity based on how close to 0 it is
    const isCritical = quantity <= (threshold * 0.3); // Less than 30% of threshold left

    return (
        <div className={`relative overflow-hidden group rounded-2xl p-6 border transition-all duration-300 hover:scale-[1.02] cursor-default
      ${isCritical
                ? 'bg-rose-950/20 border-rose-900/50 hover:border-rose-500/50'
                : 'bg-amber-950/20 border-amber-900/50 hover:border-amber-500/50'
            }`}>

            {/* Background glow effect */}
            <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20
        ${isCritical ? 'bg-rose-500' : 'bg-amber-500'}`}
            />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <span className="text-xs font-semibold tracking-wider uppercase text-neutral-500 mb-1 block">
                        {categoryName}
                    </span>
                    <h3 className="text-xl font-bold text-neutral-200 group-hover:text-white transition-colors">{productName}</h3>
                </div>

                <div className={`p-2 rounded-xl bg-black/50 border shadow-inner
          ${isCritical ? 'border-rose-900/50 text-rose-500' : 'border-amber-900/50 text-amber-500'}`}>
                    {isCritical ? <PackageX size={20} /> : <AlertTriangle size={20} />}
                </div>
            </div>

            <div className="flex items-end justify-between relative z-10 mt-6">
                <div>
                    <p className="text-sm font-medium text-neutral-400 mb-1">Stock Level</p>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-black ${isCritical ? 'text-rose-500' : 'text-amber-500'}`}>
                            {quantity}
                        </span>
                    </div>
                </div>

                <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end text-neutral-500 text-sm font-medium mb-1">
                        <Activity size={14} /> Min Required
                    </div>
                    <span className="text-lg font-bold text-neutral-300">
                        {threshold}
                    </span>
                </div>
            </div>

            {/* Progress Bar Visualizer */}
            <div className="w-full h-1.5 bg-black rounded-full mt-6 overflow-hidden relative z-10">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out
            ${isCritical ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]'}`}
                    style={{ width: `${Math.min(100, Math.max(5, (quantity / threshold) * 100))}%` }}
                />
            </div>

        </div>
    );
}
