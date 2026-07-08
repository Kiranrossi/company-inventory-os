'use client';

import { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle, XCircle, Loader2, ArrowRight, Laptop, Cloud, Plus } from 'lucide-react';
import { ParsedMaterial } from '@/lib/pdfParser';
import useDrivePicker from 'react-google-drive-picker';

interface PdfUploaderProps {
    onSuccess: () => void;
}

export default function PdfUploader({ onSuccess }: PdfUploaderProps) {
    const [file, setFile] = useState<File | null>(null);
    const [materials, setMaterials] = useState<any[]>([]);
    const [unmatchedMaterials, setUnmatchedMaterials] = useState<any[]>([]);
    const [skippedMaterials, setSkippedMaterials] = useState<any[]>([]);
    const [isUnmatchedOpen, setIsUnmatchedOpen] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [confirmedBy, setConfirmedBy] = useState('Nisha');
    const [isAdding, setIsAdding] = useState<string | null>(null);

    const [isParsing, setIsParsing] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [errorLine, setErrorLine] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [openPicker, authResponse] = useDrivePicker();
    const authRef = useRef<any>(null);

    useEffect(() => {
        authRef.current = authResponse;
    }, [authResponse]);

    const triggerSelect = () => fileInputRef.current?.click();

    const processFile = async (selected: File) => {
        const fileExt = selected.name.split('.').pop()?.toLowerCase();
        if (fileExt !== 'pdf' && fileExt !== 'docx') {
            setErrorLine('Only PDF and DOCX files are supported.');
            return;
        }

        setFile(selected);
        setErrorLine('');
        setMaterials([]);
        setUnmatchedMaterials([]);
        setSkippedMaterials([]);
        setProjectName(selected.name.replace(/\.[^/.]+$/, "") || '');

        const formData = new FormData();
        formData.append('file', selected);

        try {
            setIsParsing(true);
            const res = await fetch('/api/projects/upload', {
                method: 'POST',
                body: formData,
            });
            const json = await res.json();

            if (!res.ok) throw new Error(json.error || 'Parsing failed');

            const { matched_items, unmatched_items, skipped_items } = json.data;
            setMaterials(matched_items || []);
            setUnmatchedMaterials(unmatched_items || []);
            setSkippedMaterials(skipped_items || []);
            setIsUnmatchedOpen((unmatched_items || []).length > 0);
        } catch (err: any) {
            setErrorLine(err.message);
            setFile(null);
        } finally {
            setIsParsing(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        processFile(selected);
    };

    const handleGoogleDrive = () => {
        const _clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
        const _devKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';

        if (!_clientId || !_devKey) {
            setErrorLine('Google Drive configuration missing from environment variables.');
            return;
        }

        openPicker({
            clientId: _clientId,
            developerKey: _devKey,
            viewId: "PDFS", // only show pdfs
            showUploadView: true,
            showUploadFolders: false,
            supportDrives: true,
            multiselect: false,
            customScopes: ['https://www.googleapis.com/auth/drive.readonly'],
            callbackFunction: async (data: any) => {
                if (data.action === 'picked') {
                    try {
                        setIsParsing(true);
                        const fileId = data.docs[0].id;
                        const fileName = data.docs[0].name;

                        // Retrieve the token from ref 
                        // fallback to window.gapi if hook didn't set it in time
                        const token = authRef.current?.access_token || (window as any).gapi?.auth?.getToken()?.access_token;

                        if (!token) throw new Error('Authorization token not found. Please try again.');

                        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });

                        if (!response.ok) {
                            throw new Error('Failed to download from Drive. Ensure you have proper read scope permissions.');
                        }

                        const blob = await response.blob();
                        const driveFile = new File([blob], fileName, { type: 'application/pdf' });
                        
                        await processFile(driveFile);

                    } catch (e: any) {
                        console.error('Drive import error:', e);
                        setErrorLine(e.message);
                        setIsParsing(false);
                    }
                }
            }
        });
    };

    const handleConfirm = async () => {
        if (!projectName.trim()) {
            setErrorLine('Project Name cannot be empty.');
            return;
        }
        if (materials.length === 0) return;

        try {
            setIsConfirming(true);
            setErrorLine('');

            // Send only matched items mapped back to the name and quantity format expected by DB route
            const confirmPayload = materials.map(m => ({
                product_name: m.product_name,
                quantity: m.requested_qty
            }));

            const res = await fetch('/api/projects/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectName, materials: confirmPayload, confirmedBy })
            });

            const json = await res.json();

            if (!res.ok) throw new Error(json.error || 'Database error processing deduction.');

            // Reset Uploader 
            setFile(null);
            setMaterials([]);
            setUnmatchedMaterials([]);
            setSkippedMaterials([]);
            setProjectName('');
            onSuccess();

        } catch (err: any) {
            setErrorLine(err.message);
        } finally {
            setIsConfirming(false);
        }
    };

    const handleAddToInventory = async (rawName: string, requestedQty: number) => {
        try {
            setIsAdding(rawName);
            setErrorLine('');

            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_name: rawName,
                    available_quantity: 0,
                    low_stock_threshold: 10,
                    category_name: 'Needs Review'
                })
            });

            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.error || 'Failed to add product to master inventory.');
            }

            // Remove from unmatched list
            setUnmatchedMaterials(prev => prev.filter(item => item.raw_name !== rawName));

            // Append to matched list (with 0 stock and Needs Review category context)
            setMaterials(prev => [
                ...prev,
                {
                    product_name: rawName,
                    requested_qty: requestedQty,
                    available_quantity: 0.0,
                    low_stock_threshold: 10.0,
                    raw_names: [rawName]
                }
            ]);

        } catch (err: any) {
            setErrorLine(err.message);
        } finally {
            setIsAdding(null);
        }
    };

    const handleReRunMatching = async () => {
        if (!file) return;
        await processFile(file);
    };

    const hasStockWarning = materials.some(m => m.requested_qty > m.available_quantity);

    return (
        <div className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 relative overflow-hidden group">

            <input
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />

            {/* Upload State */}
            {!file && !isParsing && (
                <div className="w-full flex flex-col items-center justify-center p-10 border-2 border-dashed border-neutral-700/50 rounded-xl bg-neutral-800/20">
                    <div className="flex flex-col items-center mb-8">
                        <div className="p-4 bg-blue-500/10 text-blue-400 rounded-full mb-4 shadow-xl shadow-blue-500/10">
                            <UploadCloud size={32} />
                        </div>
                        <p className="text-xl font-medium text-white mb-2 tracking-tight">Select Work Order Source</p>
                        <p className="text-sm text-neutral-500 max-w-sm text-center">
                            Upload your requirement document (.pdf, .docx) to begin processing
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-6 w-full max-w-lg">
                        {/* Local Computer Option */}
                        <div 
                            onClick={triggerSelect}
                            className="flex-1 flex flex-col items-center justify-center p-6 border border-neutral-700 rounded-xl bg-neutral-900/50 hover:bg-neutral-800 hover:border-blue-500/50 transition-all cursor-pointer group shadow-lg"
                        >
                            <div className="p-3 bg-neutral-800 rounded-full mb-4 group-hover:bg-blue-500/10 transition-colors">
                                <Laptop size={28} className="text-neutral-400 group-hover:text-blue-400 transition-colors" />
                            </div>
                            <span className="text-sm font-semibold text-white tracking-wide">Local Computer</span>
                            <span className="text-xs text-neutral-500 mt-1">Upload PDF or DOCX file</span>
                        </div>

                        {/* Google Drive Option */}
                        <div 
                            onClick={handleGoogleDrive}
                            className="flex-1 flex flex-col items-center justify-center p-6 border border-neutral-700 rounded-xl bg-neutral-900/50 hover:bg-neutral-800 hover:border-emerald-500/50 transition-all cursor-pointer group shadow-lg relative overflow-hidden"
                        >
                            <div className="p-3 bg-neutral-800 rounded-full mb-4 group-hover:bg-emerald-500/10 transition-colors">
                                <Cloud size={28} className="text-neutral-400 group-hover:text-emerald-400 transition-colors" />
                            </div>
                            <span className="text-sm font-semibold text-white tracking-wide">Google Drive</span>
                            <span className="text-xs text-neutral-500 mt-1">Import from Drive</span>
                            
                            {/* Premium indicator */}
                            <div className="absolute top-2 right-2 flex items-center gap-1 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 rounded-full px-2 py-0.5 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                                Beta
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isParsing && (
                <div className="w-full flex flex-col items-center justify-center py-16">
                    <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
                    <p className="text-neutral-400 animate-pulse">Running 3-stage extraction & fuzzy matching engine...</p>
                </div>
            )}

            {/* Materials Review State */}
            {(materials.length > 0 || unmatchedMaterials.length > 0) && !isParsing && (
                <div className="flex flex-col lg:flex-row justify-between gap-8 animate-in fly-in-from-bottom-2 fade-in duration-500">

                    <div className="flex-1 flex flex-col gap-4">
                        {/* Matched list */}
                        <div className="border border-neutral-800 rounded-xl bg-neutral-900/50 overflow-hidden">
                            <div className="bg-neutral-800 border-b border-neutral-700 px-4 py-3 flex gap-2 items-center text-sm font-medium">
                                <FileText size={16} className="text-blue-400" /> Parsed Materials List (Matched)
                            </div>
                            {materials.length === 0 ? (
                                <div className="p-6 text-center text-sm text-neutral-500">
                                    No items were matched automatically.
                                </div>
                            ) : (
                                <ul className="divide-y divide-neutral-800 max-h-72 overflow-y-auto">
                                    {materials.map((m, idx) => {
                                        const isNegative = m.requested_qty > m.available_quantity;
                                        return (
                                            <li key={idx} className="flex justify-between items-center px-4 py-3 text-sm hover:bg-neutral-800/10 transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="text-neutral-300 font-semibold">{m.product_name}</span>
                                                    <span className="text-[10px] font-mono text-neutral-500">Raw text: {m.raw_names?.join(', ') || m.product_name}</span>
                                                </div>
                                                <div className="flex flex-col items-end gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-emerald-400 font-medium">req: {m.requested_qty}</span>
                                                        <span className="text-xs text-neutral-500 font-mono">(stock: {m.available_quantity})</span>
                                                    </div>
                                                    {isNegative && (
                                                        <span className="text-[10px] text-rose-400 font-medium animate-pulse">
                                                            ⚠️ Warning: Takes stock negative by {(m.requested_qty - m.available_quantity).toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        {/* Collapsible Unmatched List */}
                        {unmatchedMaterials.length > 0 && (
                            <div className="border border-neutral-800 rounded-xl bg-neutral-900/50 overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setIsUnmatchedOpen(!isUnmatchedOpen)}
                                    className="w-full bg-neutral-800/40 hover:bg-neutral-800/60 border-b border-neutral-850 px-4 py-3 flex justify-between items-center text-sm font-semibold text-neutral-300 transition-colors"
                                >
                                    <div className="flex items-center gap-2 text-amber-500">
                                        <XCircle size={16} /> Unmatched / Needs Review ({unmatchedMaterials.length})
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span
                                            onClick={(e) => { e.stopPropagation(); handleReRunMatching(); }}
                                            className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-xs rounded transition-colors"
                                        >
                                            Re-run Matching
                                        </span>
                                        <span className="text-xs text-neutral-500">
                                            {isUnmatchedOpen ? 'Hide Items ▴' : 'Show Items ▾'}
                                        </span>
                                    </div>
                                </button>
                                {isUnmatchedOpen && (
                                    <div>
                                        <div className="bg-amber-500/10 text-amber-400/90 px-4 py-2.5 text-xs border-b border-neutral-800 font-medium leading-relaxed">
                                            ⚠️ These items did not match any product in the Master Inventory. They will NOT be processed or deducted.
                                        </div>
                                        <ul className="divide-y divide-neutral-850 max-h-48 overflow-y-auto">
                                            {unmatchedMaterials.map((m, idx) => (
                                                <li key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 hover:bg-neutral-800/10 transition-colors">
                                                    <div className="flex flex-col">
                                                        <span className="text-neutral-300 font-medium">{m.raw_name}</span>
                                                        {m.best_fuzzy_match && (
                                                            <span className="text-[10px] text-neutral-500">
                                                                Fuzzy match: {m.best_fuzzy_match} ({Math.round(m.confidence)}%)
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 self-end sm:self-auto">
                                                        <span className="font-mono text-neutral-400 text-xs">req: {m.requested_qty}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddToInventory(m.raw_name, m.requested_qty)}
                                                            disabled={isAdding === m.raw_name}
                                                            className="px-2 py-1 bg-blue-600/25 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[10px] font-semibold rounded-md transition-all flex items-center gap-1 disabled:opacity-50"
                                                        >
                                                            {isAdding === m.raw_name ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />} Add to Master
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="w-full lg:w-1/3 flex flex-col gap-4">
                        <div>
                            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 block">
                                Assign Work Order ID
                            </label>
                            <input
                                type="text"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                placeholder="e.g. Project Apollo 20"
                                className="w-full bg-black border border-neutral-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-lg placeholder:text-neutral-700 mb-4"
                            />

                            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 block">
                                Confirmed By Manager
                            </label>
                            <select
                                value={confirmedBy}
                                onChange={(e) => setConfirmedBy(e.target.value)}
                                className="w-full bg-black border border-neutral-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-base cursor-pointer"
                            >
                                <option value="Nisha">Nisha (N)</option>
                                <option value="Admin">Admin</option>
                                <option value="Warehouse Manager">Warehouse Manager</option>
                                <option value="Project Lead">Project Lead</option>
                            </select>
                        </div>

                        {hasStockWarning && (
                            <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-xs">
                                <XCircle size={16} className="shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-rose-300">Negative Stock Warning</p>
                                    <p className="mt-1 leading-relaxed text-neutral-400">
                                        One or more items exceed current stock levels. Deducting them will take stock levels negative, which may be blocked by your server manager.
                                    </p>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleConfirm}
                            disabled={isConfirming || materials.length === 0}
                            className="mt-auto w-full group relative flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 transition-colors px-6 py-4 text-emerald-950 font-bold tracking-wide shadow-lg shadow-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {isConfirming ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle size={18} /> Confirm & Deduct Stock</>}
                        </button>

                        <button
                            onClick={() => { setFile(null); setMaterials([]); setUnmatchedMaterials([]); setSkippedMaterials([]); setErrorLine(''); }}
                            className="w-full flex items-center justify-center gap-2 text-sm text-neutral-500 hover:text-white transition-colors"
                        >
                            Cancel Operation
                        </button>
                    </div>
                </div>
            )}

            {/* Error Overlay */}
            {errorLine && (
                <div className="mt-6 flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-sm">
                    <XCircle size={18} className="shrink-0 mt-0.5" />
                    <p className="font-medium whitespace-pre-wrap">{errorLine}</p>
                </div>
            )}

        </div>
    );
}
