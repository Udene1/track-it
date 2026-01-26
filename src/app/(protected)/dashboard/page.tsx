'use client';

import { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Paper,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemText,
    Divider,
    Alert,
    Button
} from '@mui/material';
import {
    TrendingUp,
    Inventory,
    Warning,
    Receipt
} from '@mui/icons-material';
import { createClient } from '@/lib/supabase-client';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
    const [stats, setStats] = useState({
        totalInventory: 0,
        lowStockCount: 0,
        todaySales: 0,
        recentSales: [] as any[],
    });
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);

            const { data: items } = await supabase.from('items').select('quantity');
            const { data: sales } = await supabase
                .from('sales')
                .select('*, items(name)')
                .order('sale_date', { ascending: false })
                .limit(5);

            const totalInv = items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
            const lowStock = items?.filter(item => item.quantity < 10).length || 0;

            const today = new Date().toLocaleDateString();
            const todaySalesTotal = sales
                ?.filter(sale => new Date(sale.sale_date).toLocaleDateString() === today)
                ?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;

            setStats({
                totalInventory: totalInv,
                lowStockCount: lowStock,
                todaySales: todaySalesTotal,
                recentSales: sales || [],
            });
            setLoading(false);
        };

        fetchStats();
    }, []);

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 4 }}>
                Dashboard Overview
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Inventory fontSize="large" />
                            <Box>
                                <Typography variant="body2">Total Stock Items</Typography>
                                <Typography variant="h5" fontWeight="bold">{stats.totalInventory}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ bgcolor: stats.lowStockCount > 0 ? 'error.main' : 'success.main', color: 'white' }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Warning fontSize="large" />
                            <Box>
                                <Typography variant="body2">Low Stock Alerts</Typography>
                                <Typography variant="h5" fontWeight="bold">{stats.lowStockCount}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <TrendingUp fontSize="large" />
                            <Box>
                                <Typography variant="body2">Today's Revenue</Typography>
                                <Typography variant="h5" fontWeight="bold">{formatCurrency(stats.todaySales)}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Receipt fontSize="large" />
                            <Box>
                                <Typography variant="body2">Recent Transactions</Typography>
                                <Typography variant="h5" fontWeight="bold">{stats.recentSales.length}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {stats.lowStockCount > 0 && (
                <Alert severity="warning" sx={{ mb: 4 }}>
                    You have {stats.lowStockCount} items running low on stock. Please check the inventory page.
                </Alert>
            )}

            <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 7 }}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom fontWeight="bold">Recent Sales</Typography>
                        <List>
                            {stats.recentSales.length === 0 ? (
                                <Typography color="text.secondary">No sales recorded yet.</Typography>
                            ) : (
                                stats.recentSales.map((sale, index) => (
                                    <Box key={sale.id}>
                                        <ListItem sx={{ py: 1.5 }}>
                                            <ListItemText
                                                primary={sale.items?.name}
                                                secondary={new Date(sale.sale_date).toLocaleString()}
                                            />
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Typography fontWeight="bold" color="primary.main">
                                                    {formatCurrency(Number(sale.total_amount))}
                                                </Typography>
                                                <Typography variant="caption">{sale.quantity_sold} units</Typography>
                                            </Box>
                                        </ListItem>
                                        {index < stats.recentSales.length - 1 && <Divider />}
                                    </Box>
                                ))
                            )}
                        </List>
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                    <Paper sx={{ p: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                        <Typography variant="h6" gutterBottom fontWeight="bold">Tax Integration (Tax1)</Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            This app is ready for integration with @tax1nigeria. Your sales data is calculated with the mandatory 7.5% VAT for compliant reporting.
                        </Typography>
                        <Button variant="contained" color="secondary" fullWidth sx={{ fontWeight: 'bold' }}>
                            Export for Tax Return
                        </Button>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
