'use client';

import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PublicNav() {
    return (
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Container maxWidth="lg">
                <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
                    <Typography
                        variant="h6"
                        component={Link}
                        href="/"
                        sx={{
                            fontWeight: 'bold',
                            color: 'primary.main',
                            textDecoration: 'none'
                        }}
                    >
                        Tax1 Tracker
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button color="inherit" component={Link} href="/login">
                            Login
                        </Button>
                        <Button variant="contained" component={Link} href="/signup">
                            Sign Up
                        </Button>
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
}
