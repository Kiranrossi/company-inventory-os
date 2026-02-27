export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
    try {
        const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        if (dbUrl.includes('placeholder') || dbUrl.includes('your_supabase')) {
            return NextResponse.json({ data: getMockAnalytics(), isMock: true });
        }

        // Fetch projects and project_materials
        const { data: materialsData, error: materialsErr } = await supabase
            .from('project_materials')
            .select(`
        quantity_used,
        products (
          product_name,
          categories ( category_name )
        ),
        projects ( upload_date )
      `);

        if (materialsErr) throw materialsErr;

        // Fetch total projects
        const { count: workOrderCount } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true });

        // Fetch products for health checks
        const { data: productsData } = await supabase
            .from('products')
            .select('available_quantity, low_stock_threshold');

        // We process data on the server side for simplicity:

        // 1. Category Distribution
        const categoryUsage: Record<string, number> = {};
        // 2. Product Distribution
        const productUsage: Record<string, number> = {};
        // 3. Monthly Trend
        const monthlyTrendMap: Record<string, number> = {};

        let totalMaterialsConsumed = 0;

        materialsData?.forEach((m: any) => {
            const catName = m.products?.categories?.category_name || 'Unknown';
            const prodName = m.products?.product_name || 'Unknown';
            const qty = Number(m.quantity_used) || 0;

            totalMaterialsConsumed += qty;
            categoryUsage[catName] = (categoryUsage[catName] || 0) + qty;
            productUsage[prodName] = (productUsage[prodName] || 0) + qty;

            if (m.projects?.upload_date) {
                const date = new Date(m.projects.upload_date);
                const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
                monthlyTrendMap[monthYear] = (monthlyTrendMap[monthYear] || 0) + qty;
            }
        });

        const categoriesList = Object.keys(categoryUsage).map(name => ({ name, value: categoryUsage[name] }));
        const productsList = Object.keys(productUsage).map(name => ({ name, value: productUsage[name] })).sort((a, b) => b.value - a.value).slice(0, 10);
        const trendList = Object.keys(monthlyTrendMap).map(date => ({ date, value: monthlyTrendMap[date] })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Generate forecast based on last few months
        const trendWithForecast = addForecast(trendList);

        // System Health & Active Warnings
        let activeWarnings = 0;
        let totalItems = productsData?.length || 1; // avoid divide by 0
        productsData?.forEach(p => {
            if (p.available_quantity <= p.low_stock_threshold) activeWarnings++;
        });
        const systemHealth = Math.round(((totalItems - activeWarnings) / totalItems) * 100);

        return NextResponse.json({
            data: {
                metrics: {
                    totalWorkOrders: workOrderCount || 0,
                    totalMaterialsConsumed,
                    activeWarnings,
                    systemHealth
                },
                categoryUsage: categoriesList,
                productUsage: productsList,
                trendWithForecast
            },
            isMock: false
        });

    } catch (err: any) {
        console.error('Analytics Fetch Error:', err);
        return NextResponse.json({ data: getMockAnalytics(), isMock: true, error: err.message });
    }
}

// Simple moving average forecast
function addForecast(trendData: { date: string, value: number }[]) {
    if (trendData.length === 0) return [];

    const augmented = trendData.map(t => ({ ...t, forecast: null as number | null }));

    // Calculate simple average of last 3 periods if possible
    const last3 = augmented.slice(-3);
    const avg = last3.reduce((sum, item) => sum + item.value, 0) / (last3.length || 1);

    // Create next month's forecast
    const lastDate = new Date(augmented[augmented.length - 1].date);
    lastDate.setMonth(lastDate.getMonth() + 1);
    const nextMonth = `${lastDate.toLocaleString('default', { month: 'short' })} ${lastDate.getFullYear()}`;

    augmented.push({ date: nextMonth, value: 0, forecast: Math.round(avg) });
    return augmented;
}

function getMockAnalytics() {
    return {
        metrics: {
            totalWorkOrders: 142,
            totalMaterialsConsumed: 3205,
            activeWarnings: 2,
            systemHealth: 92
        },
        categoryUsage: [
            { name: 'Raw Materials', value: 400 },
            { name: 'Fasteners', value: 850 },
            { name: 'Consumables', value: 120 }
        ],
        productUsage: [
            { name: 'Industrial Tungsten Bolts', value: 600 },
            { name: 'Aviation-Grade Aluminum 6061', value: 400 },
            { name: 'Premium Titanium Brackets', value: 250 },
            { name: 'High-Tensile Steel Screws', value: 250 },
            { name: 'Precision Micro-Bearings', value: 150 }
        ],
        trendWithForecast: [
            { date: 'Jan 2026', value: 320, forecast: null },
            { date: 'Feb 2026', value: 450, forecast: null },
            { date: 'Mar 2026', value: 600, forecast: null },
            { date: 'Apr 2026', value: 0, forecast: 457 }
        ]
    };
}
