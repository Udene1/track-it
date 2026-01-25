'use client';

import { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Typography,
    Paper,
    IconButton,
    Tooltip,
    Alert
} from '@mui/material';
import {
    DataGrid,
    GridColDef,
    GridActionsCellItem
} from '@mui/x-data-grid';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { createClient } from '@/lib/supabase-client';
import { formatCurrency } from '@/lib/utils';
import ItemDialog from '@/components/ItemDialog';
import toast from 'react-hot-toast';

export default function InventoryPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const supabase = createClient();

    const fetchItems = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error(error.message);
        } else {
            setItems(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchItems();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('inventory-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'items'
            }, () => {
                fetchItems();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleEdit = (item: any) => {
        setSelectedItem(item);
        setDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this item?')) {
            const { error } = await supabase.from('items').delete().eq('id', id);
            if (error) {
                toast.error(error.message);
            } else {
                toast.success('Item deleted');
            }
        }
    };

    const columns: GridColDef[] = [
        { field: 'name', headerName: 'Item Name', flex: 1 },
        { field: 'category', headerName: 'Category', width: 150 },
        {
            field: 'quantity',
            headerName: 'Stock',
            width: 100,
            renderCell: (params) => (
                <Typography
                    color={params.value < 10 ? 'error' : 'inherit'}
                    fontWeight={params.value < 10 ? 'bold' : 'normal'}
                >
                    {params.value}
                </Typography>
            )
        },
        {
            field: 'price',
            headerName: 'Price',
            width: 150,
            valueFormatter: (value) => formatCurrency(Number(value))
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 100,
            getActions: (params) => [
                <GridActionsCellItem
                    icon={<EditIcon />}
                    label="Edit"
                    onClick={() => handleEdit(params.row)}
                />,
                <GridActionsCellItem
                    icon={<DeleteIcon />}
                    label="Delete"
                    onClick={() => handleDelete(params.id as string)}
                />,
            ],
        },
    ];

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">Inventory</Typography>
                <Box>
                    <IconButton onClick={fetchItems} sx={{ mr: 1 }}>
                        <RefreshIcon />
                    </IconButton>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => {
                            setSelectedItem(null);
                            setDialogOpen(true);
                        }}
                    >
                        Add Item
                    </Button>
                </Box>
            </Box>

            {items.some(item => item.quantity < 10) && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Some items are low on stock (less than 10 units remaining).
                </Alert>
            )}

            <Paper sx={{ height: 600, width: '100%' }}>
                <DataGrid
                    rows={items}
                    columns={columns}
                    loading={loading}
                    disableRowSelectionOnClick
                    sx={{ border: 'none' }}
                />
            </Paper>

            <ItemDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                item={selectedItem}
                onSuccess={fetchItems}
            />
        </Box>
    );
}
