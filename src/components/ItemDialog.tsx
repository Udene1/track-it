'use client';

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    CircularProgress
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { itemSchema, ItemFormValues } from '@/lib/validations';
import { createClient } from '@/lib/supabase-client';
import toast from 'react-hot-toast';
import { useState } from 'react';

interface ItemDialogProps {
    open: boolean;
    onClose: () => void;
    item?: any; // If provided, we are editing
    onSuccess: () => void;
}

export default function ItemDialog({ open, onClose, item, onSuccess }: ItemDialogProps) {
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<ItemFormValues>({
        resolver: zodResolver(itemSchema),
        defaultValues: item ? {
            name: item.name,
            description: item.description || '',
            price: Number(item.price),
            category: item.category || '',
            quantity: item.quantity,
        } : {
            name: '',
            description: '',
            price: 0,
            category: '',
            quantity: 0,
        },
    });

    const onSubmit = async (values: ItemFormValues) => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            if (item) {
                const { error } = await supabase
                    .from('items')
                    .update({
                        ...values,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', item.id);
                if (error) throw error;
                toast.success('Item updated successfully');
            } else {
                const { error } = await supabase
                    .from('items')
                    .insert([{
                        ...values,
                        user_id: user.id,
                    }]);
                if (error) throw error;
                toast.success('Item added successfully');
            }
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
                <DialogTitle>{item ? 'Edit Item' : 'Add New Item'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Item Name"
                            fullWidth
                            {...register('name')}
                            error={!!errors.name}
                            helperText={errors.name?.message}
                        />
                        <TextField
                            label="Category"
                            fullWidth
                            {...register('category')}
                            error={!!errors.category}
                            helperText={errors.category?.message}
                        />
                        <TextField
                            label="Price (₦)"
                            type="number"
                            fullWidth
                            {...register('price', { valueAsNumber: true })}
                            error={!!errors.price}
                            helperText={errors.price?.message}
                        />
                        {!item && (
                            <TextField
                                label="Initial Quantity"
                                type="number"
                                fullWidth
                                {...register('quantity', { valueAsNumber: true })}
                                error={!!errors.quantity}
                                helperText={errors.quantity?.message}
                            />
                        )}
                        <TextField
                            label="Description"
                            multiline
                            rows={3}
                            fullWidth
                            {...register('description')}
                            error={!!errors.description}
                            helperText={errors.description?.message}
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
                        {loading ? <CircularProgress size={24} /> : (item ? 'Update' : 'Add')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
