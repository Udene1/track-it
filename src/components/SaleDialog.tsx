'use client';

import { useState, useEffect } from 'react';
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
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { saleSchema, SaleFormValues } from '@/lib/validations';
import { createClient } from '@/lib/supabase-client';
import { formatCurrency, formatStock, VAT_RATE } from '@/lib/utils';
import toast from 'react-hot-toast';
import BarcodeScanner from '@/components/BarcodeScanner';
import { Scan as ScanIcon } from 'lucide-react';

interface SaleDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function SaleDialog({ open, onClose, onSuccess }: SaleDialogProps) {
    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
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
            unit_type: 'base',
            unit_quantity: 1,
            customer_name: '',
        },
    });

    const handleBarcodeDetected = (code: string) => {
        const item = items.find(i => i.barcode === code);
        if (item) {
            setValue('item_id', item.id);
            setSelectedItem(item);
            setScanning(false);
            toast.success(`Selected: ${item.name}`);
        } else {
            toast.error(`No item found with barcode: ${code}`);
        }
    };

    const unitType = useWatch({ control, name: 'unit_type' });
    const unitQuantity = useWatch({ control, name: 'unit_quantity' }) || 0;

    // Synchronize quantity_sold
    useEffect(() => {
        if (selectedItem) {
            const conversionFactor = unitType === 'package' ? (selectedItem.units_per_package || 1) : 1;
            setValue('quantity_sold', unitQuantity * conversionFactor);
        }
    }, [unitType, unitQuantity, selectedItem, setValue]);

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

            // 1. Get user valuation preference
            const { data: settings } = await supabase
                .from('settings')
                .select('valuation_method')
                .eq('user_id', user.id)
                .single();

            const activeMethod = settings?.valuation_method || 'FIFO';

            // 2. Consume batches and calculate COGS (needed for both methods to keep batches synced)
            const { data: totalCost, error: cogsError } = await supabase.rpc('consume_stock_batches', {
                p_item_id: values.item_id,
                p_quantity_to_sell: values.quantity_sold,
                p_user_id: user.id
            });

            if (cogsError) throw cogsError;

            // 3. Determine the cost to log based on active method
            const costAtSale = activeMethod === 'FIFO'
                ? (Number(totalCost) / values.quantity_sold)
                : (Number(selectedItem.weighted_avg_cost) || 0);

            const { error } = await supabase
                .from('sales')
                .insert([{
                    item_id: values.item_id,
                    quantity_sold: values.quantity_sold,
                    unit_type: values.unit_type,
                    unit_quantity: values.unit_quantity,
                    customer_name: values.customer_name,
                    total_amount: total,
                    cost_at_sale: costAtSale,
                    valuation_method_used: activeMethod,
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
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                            <Autocomplete
                                fullWidth
                                options={items}
                                value={selectedItem}
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
                                        helperText={errors.item_id?.message || (selectedItem && `In stock: ${formatStock(selectedItem.quantity, selectedItem.packaging_unit, selectedItem.units_per_package, selectedItem.base_unit)}`)}
                                    />
                                )}
                            />
                            <Button
                                variant="outlined"
                                onClick={() => setScanning(!scanning)}
                                sx={{ height: 56, minWidth: 56 }}
                            >
                                <ScanIcon size={20} />
                            </Button>
                        </Box>

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

                        {scanning && (
                            <BarcodeScanner
                                onDetected={handleBarcodeDetected}
                                onClose={() => setScanning(false)}
                            />
                        )}
                        {selectedItem && (
                            <Typography variant="body2" color="text.secondary">
                                Total: {quantitySold} {selectedItem.base_unit || 'Pieces'}
                            </Typography>
                        )}
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
