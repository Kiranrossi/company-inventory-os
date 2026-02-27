'use client';

import { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { ParsedMaterial } from '@/lib/pdfParser';

interface PdfUploaderProps {
    onSuccess: () => void;
}

export default function PdfUploader({ onSuccess }: PdfUploaderProps) {
    const [file, setFile] = useState<File | null>(null);
    const [materials, setMaterials] = useState<ParsedMaterial[]>([]);
    const [projectName, setProjectName] = useState('');

    const [isParsing, setIsParsing] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [errorLine, setErrorLine] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const triggerSelect = () => fileInputRef.current?.click();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;
        if (selected.type !== 'application/pdf') {
            setErrorLine('Only PDF files are supported.');
            return;
        }

        setFile(selected);
        setErrorLine('');
        setMaterials([]);
        setProjectName(selected.name.replace('.pdf', '') || '');

        // Automatically trigger parsing parsing logic payload
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

            setMaterials(json.data);
        } catch (err: any) {
            setErrorLine(err.message);
            setFile(null);
        } finally {
            setIsParsing(false);
        }
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

            const res = await fetch('/api/projects/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectName, materials })
            });

            const json = await res.json();

            if (!res.ok) throw new Error(json.error || 'Database error processing deduction.');

            // Reset Uploader 
            setFile(null);
            setMaterials([]);
            setProjectName('');
            onSuccess();

        } catch (err: any) {
            setErrorLine(err.message);
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <div className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 relative overflow-hidden group">

            <input
                type="file"
                accept=".pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />

            {/* Upload State */}
            {!file && !isParsing && (
                <div
                    onClick={triggerSelect}
                    className="w-full flex flex-col items-center justify-center p-10 border-2 border-dashed border-neutral-700/50 rounded-xl bg-neutral-800/20 hover:bg-neutral-800/60 transition-all cursor-pointer group-hover:border-blue-500/50"
                >
                    <div className="p-4 bg-blue-500/10 text-blue-400 rounded-full mb-4 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300 shadow-xl shadow-blue-500/10">
                        <UploadCloud size={32} />
                    </div>
                    <p className="text-lg font-medium text-white mb-2 tracking-tight">Drop your Work Order PDF here</p>
                    <p className="text-sm text-neutral-500 max-w-sm text-center">
                        Upload the automated report containing the raw material requirements to begin stock deduction processing.
                    </p>
                </div>
            )}

            {/* Loading State */}
            {isParsing && (
                <div className="w-full flex flex-col items-center justify-center py-16">
                    <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
                    <p className="text-neutral-400 animate-pulse">Running extraction engine on document...</p>
                </div>
            )}

            {/* Materials Review State */}
            {materials.length > 0 && !isParsing && (
                <div className="flex justify-between gap-8 animate-in fly-in-from-bottom-2 fade-in duration-500">

                    <div className="flex-1 border border-neutral-800 rounded-xl bg-neutral-900/50 overflow-hidden">
                        <div className="bg-neutral-800 border-b border-neutral-700 px-4 py-3 flex gap-2 items-center text-sm font-medium">
                            <FileText size={16} className="text-blue-400" /> Parsed Materials List
                        </div>
                        <ul className="divide-y divide-neutral-800 max-h-64 overflow-y-auto">
                            {materials.map((m, idx) => (
                                <li key={idx} className="flex justify-between px-4 py-3 text-sm">
                                    <span className="text-neutral-300">{m.product_name}</span>
                                    <span className="font-mono text-emerald-400 font-medium">req: {m.quantity}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="w-1/3 flex flex-col gap-4">
                        <div>
                            <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 block">
                                Assign Work Order ID
                            </label>
                            <input
                                type="text"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                placeholder="e.g. Project Apollo 20"
                                className="w-full bg-black border border-neutral-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-lg placeholder:text-neutral-700"
                            />
                        </div>

                        <button
                            onClick={handleConfirm}
                            disabled={isConfirming}
                            className="mt-auto w-full group relative flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 transition-colors px-6 py-4 text-emerald-950 font-bold tracking-wide shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                        >
                            {isConfirming ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle size={18} /> Confirm & Deduct Stock</>}
                        </button>

                        <button
                            onClick={() => { setFile(null); setMaterials([]); setErrorLine(''); }}
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
