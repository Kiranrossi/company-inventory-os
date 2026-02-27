'use client';

import { useEffect, useState } from 'react';
import LowStockCard from '@/components/ui/LowStockCard';
import { RefreshCw, LayoutDashboard } from 'lucide-react';

interface LowStockItem {
  id: number;
  product_name: string;
  available_quantity: number;
  low_stock_threshold: number;
  categories: {
    category_name: string;
  };
}

export default function Home() {
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLowStock();
  }, []);

  const fetchLowStock = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/low-stock');
      const json = await res.json();
      if (json.data) {
        setItems(json.data);
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
            <LayoutDashboard size={28} className="text-blue-500" />
            <h1 className="text-3xl font-bold text-white tracking-tight">Low Stock Dashboard</h1>
          </div>
          <p className="text-neutral-400 max-w-2xl">
            Critical inventory warning system. Items appearing here have fallen below their
            predefined minimum safety thresholds and require immediate attention or restocking.
          </p>
        </div>

        <button
          onClick={fetchLowStock}
          disabled={loading}
          className="p-3 bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors hidden sm:flex items-center gap-2 group"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin text-blue-500' : 'group-hover:rotate-180 transition-transform duration-500'} />
          <span className="text-sm font-medium">Refresh Data</span>
        </button>
      </header>

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="bg-neutral-900/50 border border-neutral-800 h-44 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="w-full flex flex-col items-center justify-center p-24 bg-neutral-900/30 border border-neutral-800 border-dashed rounded-3xl">
          <div className="p-6 bg-emerald-500/10 text-emerald-500 rounded-full mb-6 relative">
            <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 relative z-10"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">All Clear! No Critical Items</h2>
          <p className="text-neutral-500 text-center max-w-sm">
            Your warehouse is fully stocked. Every item in the master inventory currently exceeds its minimum threshold.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
          {items.map((item) => (
            <LowStockCard
              key={item.id}
              productName={item.product_name}
              categoryName={item.categories?.category_name || 'Uncategorized'}
              quantity={item.available_quantity}
              threshold={item.low_stock_threshold}
            />
          ))}
        </div>
      )}
    </div>
  );
}
