'use client';

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    CircularProgress,
    Autocomplete,
    Typography,
    Divider
} from '@mui/material';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { saleSchema, SaleFormValues } from '@/lib/validations';
import { createClient } from '@/lib/supabase-client';
import { formatCurrency, VAT_RATE } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';

interface SaleDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function SaleDialog({ open, onClose, onSuccess }: SaleDialogProps) {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const supabase = createClient();

    useEffect(() => {
        if (open) {
            const fetchItems = async () => {
                const { data } = await supabase.from('items').select('*').order('name');
                setItems(data || []);
            };
            fetchItems();
        }
    }, [open]);

    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors },
        reset,
    } = useForm<SaleFormValues>({
        resolver: zodResolver(saleSchema),
        defaultValues: {
            quantity_sold: 1,
            customer_name: '',
        },
    });

    const quantitySold = useWatch({ control, name: 'quantity_sold' }) || 0;
    const subtotal = selectedItem ? selectedItem.price * quantitySold : 0;
    const vat = subtotal * VAT_RATE;
    const total = subtotal + vat;

    const onSubmit = async (values: SaleFormValues) => {
        if (selectedItem && values.quantity_sold > selectedItem.quantity) {
            toast.error(`Not enough stock. Available: ${selectedItem.quantity}`);
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('sales')
                .insert([{
                    ...values,
                    total_amount: total,
                    user_id: user.id,
                }]);

            if (error) throw error;

            toast.success('Sale recorded and stock updated');
            reset();
            setSelectedItem(null);
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <form onSubmit={handleSubmit(onSubmit)}>
                <DialogTitle>New Sale / Checkout</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <Autocomplete
                            options={items}
                            getOptionLabel={(option) => `${option.name} (${option.quantity} in stock)`}
                            onChange={(_, value) => {
                                setValue('item_id', value?.id || '');
                                setSelectedItem(value);
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Select Item"
                                    error={!!errors.item_id}
                                    helperText={errors.item_id?.message}
                                />
                            )}
                        />
                        <TextField
                            label="Quantity Sold"
                            type="number"
                            fullWidth
                            {...register('quantity_sold', { valueAsNumber: true })}
                            error={!!errors.quantity_sold}
                            helperText={errors.quantity_sold?.message}
                        />
                        <TextField
                            label="Customer Name"
                            fullWidth
                            {...register('customer_name')}
                            error={!!errors.customer_name}
                            helperText={errors.customer_name?.message}
                        />

                        <Divider sx={{ my: 1 }} />

                        <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography>Subtotal:</Typography>
                                <Typography fontWeight="medium">{formatCurrency(subtotal)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography>VAT (7.5%):</Typography>
                                <Typography fontWeight="medium">{formatCurrency(vat)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="h6">Total:</Typography>
                                <Typography variant="h6" fontWeight="bold" color="primary.main">
                                    {formatCurrency(total)}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button
                        variant="contained"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Complete Sale'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
