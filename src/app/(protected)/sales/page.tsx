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
    GridActionsCellItem
} from '@mui/x-data-grid';
import {
    Add as AddIcon,
    Refresh as RefreshIcon,
    Receipt as ReceiptIcon
} from '@mui/icons-material';
import { createClient } from '@/lib/supabase-client';
import { formatCurrency, formatDate } from '@/lib/utils';
import SaleDialog from '@/components/SaleDialog';
import toast from 'react-hot-toast';

export default function SalesPage() {
    const [sales, setSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const supabase = createClient();

    const fetchSales = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('sales')
            .select('*, items(name)')
            .order('sale_date', { ascending: false });

        if (error) {
            toast.error(error.message);
        } else {
            setSales(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSales();
    }, []);

    const handleDownloadInvoice = (saleId: string) => {
        window.open(`/api/invoice?id=${saleId}`, '_blank');
    };

    const columns: GridColDef[] = [
        { field: 'sale_date', headerName: 'Date', width: 150, valueFormatter: (value) => formatDate(value) },
        {
            field: 'item_name',
            headerName: 'Item',
            flex: 1,
            valueGetter: (_, row) => row.items?.name
        },
        { field: 'quantity_sold', headerName: 'Qty', width: 100 },
        {
            field: 'total_amount',
            headerName: 'Total (inc VAT)',
            width: 150,
            valueFormatter: (value) => formatCurrency(Number(value))
        },
        { field: 'customer_name', headerName: 'Customer', width: 200 },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Invoice',
            width: 100,
            getActions: (params) => [
                <GridActionsCellItem
                    icon={<ReceiptIcon />}
                    label="Download Invoice"
                    onClick={() => handleDownloadInvoice(params.id as string)}
                />,
            ],
        },
    ];

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">Sales Counter</Typography>
                <Box>
                    <IconButton onClick={fetchSales} sx={{ mr: 1 }}>
                        <RefreshIcon />
                    </IconButton>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setDialogOpen(true)}
                    >
                        New Sale
                    </Button>
                </Box>
            </Box>

            <Paper sx={{ height: 600, width: '100%' }}>
                <DataGrid
                    rows={sales}
                    columns={columns}
                    loading={loading}
                    disableRowSelectionOnClick
                    sx={{ border: 'none' }}
                />
            </Paper>

            <SaleDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                onSuccess={fetchSales}
            />
        </Box>
    );
}
