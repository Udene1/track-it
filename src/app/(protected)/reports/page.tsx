'use client';

import { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Paper,
    CircularProgress
} from '@mui/material';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { createClient } from '@/lib/supabase-client';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function ReportsPage() {
    const [loading, setLoading] = useState(true);
    const [salesData, setSalesData] = useState<any[]>([]);
    const [itemsData, setItemsData] = useState<any[]>([]);
    const supabase = createClient();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: sales, error: salesError } = await supabase
                .from('sales')
                .select('*, items(name)')
                .order('sale_date', { ascending: true });

            const { data: items, error: itemsError } = await supabase
                .from('items')
                .select('*');

            if (salesError || itemsError) {
                toast.error('Failed to load chart data');
            } else {
                setSalesData(sales || []);
                setItemsData(items || []);
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    // Prepare Daily Revenue Chart Data
    const dailyRevenue = salesData.reduce((acc: any, sale: any) => {
        const date = new Date(sale.sale_date).toLocaleDateString();
        acc[date] = (acc[date] || 0) + Number(sale.total_amount);
        return acc;
    }, {});

    const revenueChartData = {
        labels: Object.keys(dailyRevenue),
        datasets: [
            {
                label: 'Daily Revenue (₦)',
                data: Object.values(dailyRevenue),
                borderColor: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.5)',
                tension: 0.3,
            },
        ],
    };

    // Prepare Top Items Chart Data
    const itemSales = salesData.reduce((acc: any, sale: any) => {
        const name = sale.items?.name || 'Unknown';
        acc[name] = (acc[name] || 0) + sale.quantity_sold;
        return acc;
    }, {});

    const topItemsData = {
        labels: Object.keys(itemSales),
        datasets: [
            {
                label: 'Quantity Sold',
                data: Object.values(itemSales),
                backgroundColor: '#dc004e',
            },
        ],
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
            </Box>
        );
    }

    const totalRevenue = salesData.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
    const totalItemsSold = salesData.reduce((sum, sale) => sum + sale.quantity_sold, 0);

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>Reports & Analytics</Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography color="text.secondary" gutterBottom>Total Revenue</Typography>
                        <Typography variant="h3" fontWeight="bold" color="primary.main">
                            {formatCurrency(totalRevenue)}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography color="text.secondary" gutterBottom>Total Items Sold</Typography>
                        <Typography variant="h3" fontWeight="bold" color="secondary.main">
                            {totalItemsSold}
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                <Grid item xs={12} lg={8}>
                    <Paper sx={{ p: 3, height: 400 }}>
                        <Typography variant="h6" gutterBottom>Revenue Over Time</Typography>
                        <Line
                            data={revenueChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { position: 'bottom' } }
                            }}
                        />
                    </Paper>
                </Grid>
                <Grid item xs={12} lg={4}>
                    <Paper sx={{ p: 3, height: 400 }}>
                        <Typography variant="h6" gutterBottom>Top Selling Items</Typography>
                        <Bar
                            data={topItemsData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } }
                            }}
                        />
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
