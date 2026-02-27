'use client';

import { useState, useEffect } from 'react';
import { Search, Info, Edit2, Check, X, Tag } from 'lucide-react';

interface Category {
    id: number;
    category_name: string;
}

interface Product {
    id: number;
    product_name: string;
    available_quantity: number;
    low_stock_threshold: number;
    categories: Category;
}

export default function InventoryTable() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isMocking, setIsMocking] = useState(false);

    // Editing state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/inventory');
            const json = await res.json();
            if (json.data) {
                setProducts(json.data);
                setIsMocking(json.isMock);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditInit = (p: Product) => {
        setEditingId(p.id);
        setEditValue(p.available_quantity.toString());
    };

    const handleEditSave = async (id: number) => {
        try {
            const val = Number(editValue);
            if (isNaN(val) || val < 0) return setEditingId(null);

            // Optimistic update
            setProducts(products.map(p => p.id === id ? { ...p, available_quantity: val } : p));
            setEditingId(null);

            await fetch('/api/inventory', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, available_quantity: val })
            });
        } catch (e) {
            console.error(e);
            // Revert could be handled here
        }
    };

    const filtered = products.filter(p => {
        const term = search.toLowerCase();
        return p.product_name.toLowerCase().includes(term) ||
            p.categories?.category_name.toLowerCase().includes(term);
    });

    const groupedProducts = filtered.reduce((acc: Record<string, Product[]>, curr) => {
        // Note: Supabase nested joins return either array or single object. 
        // Types cast it as object for this scale.
        const catName = curr.categories?.category_name || 'Uncategorized';
        if (!acc[catName]) acc[catName] = [];
        acc[catName].push(curr);
        return acc;
    }, {});

    if (loading) {
        return <div className="p-8 text-neutral-500 animate-pulse">Loading master inventory...</div>;
    }

    return (
        <div className="w-full flex flex-col gap-4">
            {/* Top Bar with Search */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-2">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search products or categories..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                </div>

                {isMocking && (
                    <div className="flex items-center gap-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-4 py-2 rounded-xl text-sm font-medium">
                        <Info size={16} />
                        Mock mode active (DB not connected)
                    </div>
                )}
            </div>

            {/* Main Table Area */}
            {Object.entries(groupedProducts).length === 0 ? (
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-500">
                    No matches found.
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {Object.entries(groupedProducts).map(([categoryName, items]) => (
                        <div key={categoryName} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                            <div className="bg-neutral-800/50 border-b border-neutral-800 px-6 py-3 flex items-center gap-2">
                                <Tag size={16} className="text-blue-400" />
                                <h3 className="font-semibold text-neutral-200">{categoryName}</h3>
                                <span className="text-xs ml-2 bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">
                                    {items.length} items
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead>
                                        <tr className="border-b border-neutral-800/50 text-neutral-500">
                                            <th className="px-6 py-3 font-medium w-16">S.No</th>
                                            <th className="px-6 py-3 font-medium">Product Name</th>
                                            <th className="px-6 py-3 font-medium w-48 text-right">Available Qty</th>
                                            <th className="px-6 py-3 font-medium w-32 text-right">Threshold</th>
                                            <th className="px-6 py-3 font-medium w-24">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-800/50">
                                        {items.map((product, index) => {
                                            const isLow = product.available_quantity <= product.low_stock_threshold;
                                            const isEditing = editingId === product.id;

                                            return (
                                                <tr key={product.id} className="hover:bg-neutral-800/30 transition-colors">
                                                    <td className="px-6 py-4 text-neutral-500">{index + 1}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`font-medium ${isLow ? 'text-rose-400' : 'text-neutral-200'}`}>
                                                            {product.product_name}
                                                        </span>
                                                        {isLow && (
                                                            <span className="ml-2 inline-block px-2 py-0.5 text-[10px] font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full">
                                                                Low Stock
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {isEditing ? (
                                                            <div className="flex justify-end">
                                                                <input
                                                                    type="number"
                                                                    value={editValue}
                                                                    onChange={(e) => setEditValue(e.target.value)}
                                                                    className="w-20 bg-black border border-blue-500 text-white rounded px-2 py-1 text-right focus:outline-none"
                                                                    autoFocus
                                                                    onKeyDown={(e) => e.key === 'Enter' && handleEditSave(product.id)}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <span className={`font-bold text-lg ${isLow ? 'text-rose-400' : 'text-white'}`}>
                                                                {product.available_quantity}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-neutral-500">
                                                        {product.low_stock_threshold}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {isEditing ? (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handleEditSave(product.id)}
                                                                    className="p-1.5 hover:bg-emerald-500/20 text-emerald-500 rounded-md transition-colors"
                                                                >
                                                                    <Check size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingId(null)}
                                                                    className="p-1.5 hover:bg-neutral-700 text-neutral-400 rounded-md transition-colors"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleEditInit(product)}
                                                                className="p-1.5 hover:bg-blue-500/20 text-neutral-400 hover:text-blue-400 rounded-md transition-colors"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
