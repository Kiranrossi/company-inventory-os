'use client';

import { useState, useEffect } from 'react';
import {
    ShieldCheck,
    Lock,
    Plus,
    Trash2,
    PackagePlus,
    ArrowRight,
    Loader2,
    AlertCircle
} from 'lucide-react';

export default function AdminPortal() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState(false);

    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // New Product Form State
    const [newName, setNewName] = useState('');
    const [newQty, setNewQty] = useState('');
    const [newThreshold, setNewThreshold] = useState('');
    const [newCategory, setNewCategory] = useState('Core materials');

    // Check LocalStorage on mount for session persistence
    useEffect(() => {
        const session = localStorage.getItem('admin_session');
        if (session === 'active') {
            setIsAuthenticated(true);
            fetchInventory();
        }
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Using a simple hardcoded passcode for demonstration of the UI flow
        if (password === 'admin') {
            setIsAuthenticated(true);
            setAuthError(false);
            localStorage.setItem('admin_session', 'active');
            fetchInventory();
        } else {
            setAuthError(true);
            setPassword('');
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('admin_session');
    };

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/inventory');
            const json = await res.json();
            if (json.data) setProducts(json.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newQty || !newThreshold) return;

        try {
            setActionLoading(true);
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_name: newName,
                    available_quantity: newQty,
                    low_stock_threshold: newThreshold,
                    category_name: newCategory
                })
            });

            if (res.ok) {
                setNewName('');
                setNewQty('');
                setNewThreshold('');
                await fetchInventory(); // refresh list
            }
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you critical you want to delete this master record? This action cannot be undone.")) return;

        try {
            setActionLoading(true);
            const res = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchInventory(); // refresh list
            }
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center h-[80vh] w-full animate-in fade-in duration-700">
                <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">

                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 bg-neutral-800 border border-neutral-700 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                            <ShieldCheck size={32} className="text-blue-400" />
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2">Admin Security Portal</h2>
                        <p className="text-neutral-500 text-center text-sm mb-8">
                            Authentication required to access master inventory control and destructive database actions.
                        </p>

                        <form onSubmit={handleLogin} className="w-full space-y-4">
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
                                <input
                                    type="password"
                                    placeholder="Enter Master Passcode"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full bg-black/50 border ${authError ? 'border-rose-500/50 focus:ring-rose-500/20' : 'border-neutral-700 focus:ring-blue-500/20'} rounded-xl text-white pl-12 pr-4 py-3 focus:outline-none focus:ring-4 transition-all`}
                                    autoFocus
                                />
                            </div>

                            {authError && (
                                <div className="flex items-center gap-2 text-rose-400 text-sm justify-center animate-in slide-in-from-top-2">
                                    <AlertCircle size={14} /> Incorrect password.
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all group"
                            >
                                Authenticate Request
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // Dashboard View (Authenticated)
    return (
        <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
            <header className="flex justify-between items-end border-b border-neutral-800 pb-6">
                <div>
                    <div className="flex gap-3 items-center mb-2">
                        <ShieldCheck size={28} className="text-blue-500" />
                        <h1 className="text-3xl font-bold text-white tracking-tight">Admin Control Panel</h1>
                    </div>
                    <p className="text-neutral-400 max-w-2xl">
                        Root access granted. You have privileges to modify master database tables, inject new material definitions, and execute record deletions.
                    </p>
                </div>

                <button
                    onClick={handleLogout}
                    className="px-4 py-2 border border-neutral-800 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium"
                >
                    Terminate Session
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Col: Add New Item Form */}
                <div className="lg:col-span-1 border border-neutral-800 bg-neutral-900 rounded-3xl p-6 h-fit sticky top-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><PackagePlus size={20} /></div>
                        <h3 className="text-lg font-bold text-white">Inject New Unit</h3>
                    </div>

                    <form onSubmit={handleAddProduct} className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1 block">Full Product Designation</label>
                            <input
                                required
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                                placeholder="e.g. 18mm Commercial Ply"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1 block">Initial Qty</label>
                                <input
                                    required
                                    type="number"
                                    value={newQty}
                                    onChange={(e) => setNewQty(e.target.value)}
                                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1 block">Min Alert</label>
                                <input
                                    required
                                    type="number"
                                    value={newThreshold}
                                    onChange={(e) => setNewThreshold(e.target.value)}
                                    className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                                    placeholder="10"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1 block">Category Classification</label>
                            <select
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                className="w-full bg-black/50 border border-neutral-800 text-white rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
                            >
                                <option>Core materials</option>
                                <option>Finish materials</option>
                                <option>Edge-bands</option>
                                <option>Hardware</option>
                            </select>
                        </div>

                        <button
                            disabled={actionLoading}
                            type="submit"
                            className="w-full mt-4 bg-emerald-600/20 border border-emerald-500/50 hover:bg-emerald-600 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                            {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                            Commit to Database
                        </button>
                    </form>
                </div>

                {/* Right Col: Delete Management Table */}
                <div className="lg:col-span-2 border border-neutral-800 bg-neutral-900 rounded-3xl overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-neutral-800 bg-neutral-900/50">
                        <h3 className="text-lg font-bold text-white mb-1">Master Records</h3>
                        <p className="text-sm text-neutral-500">Live view of the `products` table. Destructive actions below.</p>
                    </div>

                    <div className="flex-1 overflow-x-auto p-0">
                        {loading ? (
                            <div className="p-12 flex justify-center text-neutral-500"><Loader2 className="animate-spin" /></div>
                        ) : (
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="bg-black/20 text-neutral-500">
                                        <th className="px-6 py-4 font-medium">Record ID</th>
                                        <th className="px-6 py-4 font-medium">Product / Category</th>
                                        <th className="px-6 py-4 font-medium text-right">Delete</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800/50">
                                    {products.map((p) => (
                                        <tr key={p.id} className="hover:bg-neutral-800/30 transition-colors group">
                                            <td className="px-6 py-4 text-neutral-600 font-mono text-xs">#{p.id}</td>
                                            <td className="px-6 py-4">
                                                <p className="text-neutral-200 font-medium">{p.product_name}</p>
                                                <p className="text-neutral-500 text-xs">{p.categories?.category_name || 'Unknown'}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    disabled={actionLoading}
                                                    className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg transition-all opacity-50 group-hover:opacity-100 disabled:opacity-30"
                                                    title="Delete Record completely"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {products.length === 0 && !loading && (
                            <div className="p-12 text-center text-neutral-500">Database is empty.</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
