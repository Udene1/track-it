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
    Alert,
    TextField
} from '@mui/material';
import { createClient } from '@/lib/supabase-client';
import toast from 'react-hot-toast';

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [valuationMethod, setValuationMethod] = useState<'FIFO' | 'WAC'>('FIFO');
    const [barcodeEnabled, setBarcodeEnabled] = useState<boolean>(true);
    const [vatEnabled, setVatEnabled] = useState<boolean>(true);
    const [externalUserId, setExternalUserId] = useState<string>('');
    const supabase = createClient();

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('settings')
                .select('valuation_method, barcode_enabled, vat_enabled, external_user_id')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
                toast.error('Failed to load settings');
            } else if (data) {
                setValuationMethod(data.valuation_method as 'FIFO' | 'WAC');
                setBarcodeEnabled(data.barcode_enabled ?? true);
                setVatEnabled(data.vat_enabled ?? true);
                setExternalUserId(data.external_user_id || '');
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
                    valuation_method: valuationMethod,
                    barcode_enabled: barcodeEnabled,
                    vat_enabled: vatEnabled,
                    external_user_id: externalUserId || null
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

                <Divider sx={{ my: 4 }} />

                <Typography variant="h6" gutterBottom>Feature Settings</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Enable or disable specific features based on your workflow needs.
                </Typography>

                <FormControl component="fieldset">
                    <FormLabel component="legend" sx={{ mb: 1, fontWeight: 'bold' }}>Barcodes</FormLabel>
                    <FormControlLabel
                        control={
                            <RadioGroup
                                row
                                value={barcodeEnabled ? 'enabled' : 'disabled'}
                                onChange={(e) => setBarcodeEnabled(e.target.value === 'enabled')}
                            >
                                <FormControlLabel value="enabled" control={<Radio />} label="Enabled" />
                                <FormControlLabel value="disabled" control={<Radio />} label="Disabled" />
                            </RadioGroup>
                        }
                        label=""
                    />
                    <Typography variant="caption" color="text.secondary">
                        When disabled, barcode scanning fields and buttons will be hidden across the app.
                    </Typography>
                </FormControl>
                <Divider sx={{ my: 4 }} />
                <Typography variant="h6" gutterBottom>Tax Compliance</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Configure how VAT is applied to your sales.
                </Typography>
                <FormControl component="fieldset">
                    <FormLabel component="legend" sx={{ mb: 1, fontWeight: 'bold' }}>VAT (Value Added Tax)</FormLabel>
                    <RadioGroup
                        row
                        value={vatEnabled ? 'enabled' : 'disabled'}
                        onChange={(e) => setVatEnabled(e.target.value === 'enabled')}
                    >
                        <FormControlLabel value="enabled" control={<Radio />} label="Enabled (7.5%)" />
                        <FormControlLabel value="disabled" control={<Radio />} label="Disabled" />
                    </RadioGroup>
                    <Typography variant="caption" color="text.secondary">
                        When enabled, a mandatory 7.5% VAT will be added to all sales.
                        Small businesses with turnover below the threshold may choose to disable this.
                    </Typography>
                </FormControl>
                <Divider sx={{ my: 4 }} />

                <Typography variant="h6" gutterBottom>External Integration</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Connect your account to external services like NEntreOS Nexus.
                </Typography>

                <Box sx={{ maxWidth: 400 }}>
                    <TextField
                        fullWidth
                        label="Nexus External ID"
                        value={externalUserId}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExternalUserId(e.target.value)}
                        placeholder="e.g. nexus_user_123"
                        helperText="Provide this ID to link your inventory with the NEntreOS terminal."
                    />
                </Box>
            </Paper>
        </Box>
    );
}
