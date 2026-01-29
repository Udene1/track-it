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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Divider
} from '@mui/material';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { purchaseSchema, PurchaseFormValues } from '@/lib/validations';
import { createClient } from '@/lib/supabase-client';
import { formatStock } from '@/lib/utils';
import { calculateNewWeightedAverage } from '@/lib/valuation';
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
    } = useForm<PurchaseFormValues>({
        resolver: zodResolver(purchaseSchema),
        defaultValues: {
            quantity_purchased: 1,
            unit_type: 'base',
            unit_quantity: 1,
            cost: 0,
            supplier_name: '',
        },
    });

    const unitType = useWatch({ control, name: 'unit_type' });
    const unitQuantity = useWatch({ control, name: 'unit_quantity' }) || 0;

    useEffect(() => {
        if (selectedItem) {
            const conversionFactor = unitType === 'package' ? (selectedItem.units_per_package || 1) : 1;
            setValue('quantity_purchased', unitQuantity * conversionFactor);
        }
    }, [unitType, unitQuantity, selectedItem, setValue]);

    const quantityPurchased = useWatch({ control, name: 'quantity_purchased' }) || 0;

    const onSubmit = async (values: PurchaseFormValues) => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Calculate new weighted average cost
            if (selectedItem) {
                const updatedAvgCost = calculateNewWeightedAverage(
                    selectedItem.quantity || 0,
                    selectedItem.weighted_avg_cost || 0,
                    Number(values.quantity_purchased),
                    Number(values.cost)
                );

                const updateData: any = { weighted_avg_cost: updatedAvgCost };
                if (values.new_selling_price) {
                    updateData.price = values.new_selling_price;
                }

                const { error: itemUpdateError } = await supabase
                    .from('items')
                    .update(updateData)
                    .eq('id', selectedItem.id);

                if (itemUpdateError) throw itemUpdateError;
            }

            const { error } = await supabase
                .from('purchases')
                .insert([{
                    item_id: values.item_id,
                    quantity_purchased: values.quantity_purchased,
                    unit_type: values.unit_type,
                    unit_quantity: values.unit_quantity,
                    cost: values.cost,
                    supplier_name: values.supplier_name,
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
                            onChange={(_, value) => {
                                setValue('item_id', value?.id || '');
                                setSelectedItem(value);
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Select Item"
                                    error={!!errors.item_id}
                                    helperText={errors.item_id?.message || (selectedItem && `In stock: ${formatStock(selectedItem.quantity, selectedItem.packaging_unit, selectedItem.units_per_package, selectedItem.base_unit)}`)}
                                />
                            )}
                        />

                        {selectedItem && (
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Unit</InputLabel>
                                    <Select
                                        {...register('unit_type')}
                                        defaultValue="base"
                                        label="Unit"
                                    >
                                        <MenuItem value="base">{selectedItem.base_unit || 'Pieces'}</MenuItem>
                                        {selectedItem.packaging_unit && (
                                            <MenuItem value="package">{selectedItem.packaging_unit}</MenuItem>
                                        )}
                                    </Select>
                                </FormControl>
                                <TextField
                                    label="Quantity"
                                    type="number"
                                    fullWidth
                                    {...register('unit_quantity', { valueAsNumber: true })}
                                    error={!!errors.unit_quantity}
                                    helperText={errors.unit_quantity?.message}
                                />
                            </Box>
                        )}

                        {selectedItem && (
                            <Typography variant="body2" color="text.secondary">
                                Total: {quantityPurchased} {selectedItem.base_unit || 'Pieces'}
                            </Typography>
                        )}
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

                        <Divider sx={{ my: 1 }} />
                        <Typography variant="subtitle2" color="primary">Price Management</Typography>
                        <TextField
                            label="Update Selling Price (Optional)"
                            type="number"
                            fullWidth
                            {...register('new_selling_price', { valueAsNumber: true })}
                            error={!!errors.new_selling_price}
                            helperText={errors.new_selling_price?.message || (selectedItem && `Current Price: ₦${selectedItem.price}`)}
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
