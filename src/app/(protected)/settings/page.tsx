'use client';

import { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    Button,
    CircularProgress,
    Divider,
    Alert
} from '@mui/material';
import { createClient } from '@/lib/supabase-client';
import toast from 'react-hot-toast';

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [valuationMethod, setValuationMethod] = useState<'FIFO' | 'WAC'>('FIFO');
    const supabase = createClient();

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('settings')
                .select('valuation_method')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
                toast.error('Failed to load settings');
            } else if (data) {
                setValuationMethod(data.valuation_method as 'FIFO' | 'WAC');
            }
            setLoading(false);
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('settings')
                .upsert({
                    user_id: user.id,
                    valuation_method: valuationMethod
                });

            if (error) throw error;
            toast.success('Settings saved successfully');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box maxWidth="md">
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>Settings</Typography>

            <Paper sx={{ p: 4 }}>
                <Typography variant="h6" gutterBottom>Inventory Valuation</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Choose the method used to calculate your Cost of Goods Sold (COGS) and profit margins.
                    FIFO is generally preferred for tax compliance.
                </Typography>

                <FormControl component="fieldset">
                    <FormLabel component="legend" sx={{ mb: 1, fontWeight: 'bold' }}>Valuation Method</FormLabel>
                    <RadioGroup
                        value={valuationMethod}
                        onChange={(e) => setValuationMethod(e.target.value as 'FIFO' | 'WAC')}
                    >
                        <FormControlLabel
                            value="FIFO"
                            control={<Radio />}
                            label={
                                <Box>
                                    <Typography variant="body1">FIFO (First-In, First-Out)</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Assumes the oldest stock is sold first. Most accurate for reporting.
                                    </Typography>
                                </Box>
                            }
                        />
                        <Box sx={{ my: 1 }} />
                        <FormControlLabel
                            value="WAC"
                            control={<Radio />}
                            label={
                                <Box>
                                    <Typography variant="body1">Weighted Average Cost (WAC)</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Average cost of all available stock. Easier for high-volume, uniform goods.
                                    </Typography>
                                </Box>
                            }
                        />
                    </RadioGroup>
                </FormControl>

                <Alert severity="info" sx={{ mt: 3, mb: 1 }}>
                    Changes will apply to all future sales. Historical sales will keep the method used at their time of entry.
                </Alert>

                <Divider sx={{ my: 4 }} />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? <CircularProgress size={24} /> : 'Save Changes'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}
