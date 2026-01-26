'use client';

import { Box, Button, Container, Typography, Grid, Paper, Stack } from '@mui/material';
import {
  TrendingUp,
  Receipt,
  ListChecks,
  ShieldCheck,
  ArrowRight,
  Download
} from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <PublicNav />

      {/* Hero Section */}
      <Box sx={{
        py: { xs: 8, md: 15 },
        background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
        color: 'white',
        textAlign: 'center'
      }}>
        <Container maxWidth="md">
          <Typography variant="h2" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '2.5rem', md: '3.75rem' } }}>
            Take Control of Your Nigerian Business Inventory
          </Typography>
          <Typography variant="h5" sx={{ mb: 6, opacity: 0.9 }}>
            The advanced inventory management system built for local compliance, professional invoicing, and real-time stock tracking.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              color="secondary"
              size="large"
              component={Link}
              href="/signup"
              endIcon={<ArrowRight size={20} />}
              sx={{ px: 4, py: 1.5, fontWeight: 'bold' }}
            >
              Get Started Free
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              size="large"
              component={Link}
              href="/login"
              sx={{ px: 4, py: 1.5, borderWidth: 2, '&:hover': { borderWidth: 2 } }}
            >
              Login to Dashboard
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 12 }}>
        <Typography variant="h3" textAlign="center" fontWeight="bold" gutterBottom>
          Everything you need to scale
        </Typography>
        <Typography variant="h6" textAlign="center" color="text.secondary" sx={{ mb: 8 }}>
          Designed specifically for the Nigerian business landscape.
        </Typography>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ p: 4, height: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
              <TrendingUp size={48} color="#1976d2" style={{ marginBottom: '1.5rem' }} />
              <Typography variant="h5" fontWeight="bold" gutterBottom>Automated 7.5% VAT</Typography>
              <Typography color="text.secondary">
                Stop calculating tax by hand. Our sales counter automatically adds the mandatory 7.5% VAT to every transaction, keeping you compliant.
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ p: 4, height: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
              <Receipt size={48} color="#1976d2" style={{ marginBottom: '1.5rem' }} />
              <Typography variant="h5" fontWeight="bold" gutterBottom>Professional NGN Invoices</Typography>
              <Typography color="text.secondary">
                Generate beautiful PDF receipts in Naira (₦) instantly. Send professional digital invoices to your customers straight from the dashboard.
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ p: 4, height: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
              <Download size={48} color="#1976d2" style={{ marginBottom: '1.5rem' }} />
              <Typography variant="h5" fontWeight="bold" gutterBottom>Tax1 Ready Exports</Typography>
              <Typography color="text.secondary">
                Export your inventory and sales data in a format ready for tax consultants and @tax1nigeria reporting. Tax season simplified.
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ p: 4, height: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
              <ListChecks size={48} color="#1976d2" style={{ marginBottom: '1.5rem' }} />
              <Typography variant="h5" fontWeight="bold" gutterBottom>Stock Alerts</Typography>
              <Typography color="text.secondary">
                Never run out of your best-selling items. Get real-time alerts when stock levels are low and manage purchases effortlessly.
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ p: 4, height: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
              <ShieldCheck size={48} color="#1976d2" style={{ marginBottom: '1.5rem' }} />
              <Typography variant="h5" fontWeight="bold" gutterBottom>Secure Data</Typography>
              <Typography color="text.secondary">
                Your business data is protected by Supabase enterprise-grade security. Only you can access your inventory and sales records.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Bottom CTA */}
      <Box sx={{ bgcolor: 'grey.50', py: 10 }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Ready to automate your business?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Join hundreds of Nigerian entrepreneurs managing their stock correctly.
          </Typography>
          <Button
            variant="contained"
            size="large"
            component={Link}
            href="/signup"
            sx={{ px: 6, py: 2, borderRadius: 3, fontWeight: 'bold' }}
          >
            Sign Up For Free Now
          </Button>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 6, borderTop: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} Tax1 Inventory Tracker. All rights reserved. Built for Nigerian Businesses.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}

