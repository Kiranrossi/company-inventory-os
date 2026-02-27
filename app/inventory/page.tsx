import InventoryTable from '@/components/ui/InventoryTable';

export default function InventoryPage() {
    return (
        <div className="flex flex-col gap-6 w-full h-full max-w-7xl mx-auto">
            <header className="mb-2">
                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Master Inventory</h1>
                <p className="text-neutral-400">Complete view of all current stock and categories. Fully editable and sortable.</p>
            </header>

            <div className="flex-1 w-full">
                <InventoryTable />
            </div>
        </div>
    );
}
