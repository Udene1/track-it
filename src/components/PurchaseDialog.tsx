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
    Autocomplete
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { purchaseSchema, PurchaseFormValues } from '@/lib/validations';
import { createClient } from '@/lib/supabase-client';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';

interface PurchaseDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function PurchaseDialog({ open, onClose, onSuccess }: PurchaseDialogProps) {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const supabase = createClient();

    useEffect(() => {
        if (open) {
            const fetchItems = async () => {
                const { data } = await supabase.from('items').select('id, name').order('name');
                setItems(data || []);
            };
            fetchItems();
        }
    }, [open]);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
        reset,
    } = useForm<PurchaseFormValues>({
        resolver: zodResolver(purchaseSchema),
        defaultValues: {
            quantity_purchased: 1,
            cost: 0,
            supplier_name: '',
        },
    });

    const onSubmit = async (values: PurchaseFormValues) => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('purchases')
                .insert([{
                    ...values,
                    user_id: user.id,
                }]);

            if (error) throw error;

            toast.success('Purchase logged and stock updated');
            reset();
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
                <DialogTitle>Log Purchase / Stock In</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <Autocomplete
                            options={items}
                            getOptionLabel={(option) => option.name}
                            onChange={(_, value) => setValue('item_id', value?.id || '')}
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
                            label="Quantity Purchased"
                            type="number"
                            fullWidth
                            {...register('quantity_purchased', { valueAsNumber: true })}
                            error={!!errors.quantity_purchased}
                            helperText={errors.quantity_purchased?.message}
                        />
                        <TextField
                            label="Total Cost (₦)"
                            type="number"
                            fullWidth
                            {...register('cost', { valueAsNumber: true })}
                            error={!!errors.cost}
                            helperText={errors.cost?.message}
                        />
                        <TextField
                            label="Supplier Name"
                            fullWidth
                            {...register('supplier_name')}
                            error={!!errors.supplier_name}
                            helperText={errors.supplier_name?.message}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button
                        variant="contained"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Log Purchase'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
