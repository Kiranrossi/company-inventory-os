'use client';

import { useState } from 'react';
import PdfUploader from '@/components/ui/PdfUploader';
import ProjectLogTable from '@/components/ui/ProjectLogTable';

export default function ProjectsPage() {
    const [refreshLogTrigger, setRefreshLogTrigger] = useState(0);

    const handleUploadSuccess = () => {
        // Force the log table below to refetch data from DB by bumping the trigger key
        setRefreshLogTrigger((prev) => prev + 1);
    };

    return (
        <div className="flex flex-col gap-8 w-full h-full max-w-5xl mx-auto pb-12">
            <header>
                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Project Consumption & Processing</h1>
                <p className="text-neutral-400">Upload work order PDFs to extract requirement quantities. The engine will automatically calculate stock availability and deduct it from the master inventory upon your confirmation.</p>
            </header>

            {/* Upload Zone */}
            <section>
                <h2 className="text-xl font-semibold text-neutral-200 mb-4 tracking-tight">Requirement Extractor Hub</h2>
                <PdfUploader onSuccess={handleUploadSuccess} />
            </section>

            {/* Audit Log Zone */}
            <section className="pt-4">
                <h2 className="text-xl font-semibold text-neutral-200 mb-4 tracking-tight">Processed Work Order Ledger</h2>
                <ProjectLogTable refreshTrigger={refreshLogTrigger} />
            </section>
        </div>
    );
}
