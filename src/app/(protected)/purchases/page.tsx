'use client';

import { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Typography,
    Paper,
    IconButton,
} from '@mui/material';
import {
    DataGrid,
    GridColDef,
} from '@mui/x-data-grid';
import {
    Add as AddIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { createClient } from '@/lib/supabase-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import PurchaseDialog from '@/components/PurchaseDialog';
import toast from 'react-hot-toast';

export default function PurchasesPage() {
    const [purchases, setPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const supabase = createClient();

    const fetchPurchases = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('purchases')
            .select('*, items(name)')
            .order('purchase_date', { ascending: false });

        if (error) {
            toast.error(error.message);
        } else {
            setPurchases(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPurchases();
    }, []);

    const columns: GridColDef[] = [
        { field: 'purchase_date', headerName: 'Date', width: 150, valueFormatter: (value) => formatDate(value) },
        {
            field: 'item_name',
            headerName: 'Item',
            flex: 1,
            valueGetter: (_, row) => row.items?.name
        },
        { field: 'quantity_purchased', headerName: 'Qty', width: 100 },
        {
            field: 'cost',
            headerName: 'Total Cost',
            width: 150,
            valueFormatter: (value) => formatCurrency(Number(value))
        },
        { field: 'supplier_name', headerName: 'Supplier', width: 200 },
    ];

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">Purchases Log</Typography>
                <Box>
                    <IconButton onClick={fetchPurchases} sx={{ mr: 1 }}>
                        <RefreshIcon />
                    </IconButton>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setDialogOpen(true)}
                    >
                        Log Purchase
                    </Button>
                </Box>
            </Box>

            <Paper sx={{ height: 600, width: '100%' }}>
                <DataGrid
                    rows={purchases}
                    columns={columns}
                    loading={loading}
                    disableRowSelectionOnClick
                    sx={{ border: 'none' }}
                />
            </Paper>

            <PurchaseDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSuccess={fetchPurchases}
            />
        </Box>
    );
}
