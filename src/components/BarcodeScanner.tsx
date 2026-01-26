'use client';

import { useEffect, useRef, useState } from 'react';
import Quagga from 'quagga';
import { Box, Typography, IconButton, CircularProgress } from '@mui/material';
import { X as CloseIcon } from 'lucide-react';

interface BarcodeScannerProps {
    onDetected: (code: string) => void;
    onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
    const scannerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!scannerRef.current) return;

        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: scannerRef.current,
                constraints: {
                    facingMode: "environment",
                },
            },
            decoder: {
                readers: ["ean_reader", "code_128_reader", "upc_reader", "code_39_reader"]
            }
        }, function (err) {
            if (err) {
                console.error(err);
                setError("Camera access denied or not supported.");
                setLoading(false);
                return;
            }
            Quagga.start();
            setLoading(false);
        });

        Quagga.onDetected((data) => {
            if (data.codeResult && data.codeResult.code) {
                onDetected(data.codeResult.code);
            }
        });

        return () => {
            Quagga.stop();
            Quagga.offDetected();
        };
    }, [onDetected]);

    return (
        <Box sx={{
            position: 'relative',
            width: '100%',
            height: '300px',
            bgcolor: 'black',
            borderRadius: 2,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div ref={scannerRef} style={{ width: '100%', height: '100%' }} />

            {loading && (
                <Box sx={{ position: 'absolute', textAlign: 'center', color: 'white' }}>
                    <CircularProgress color="inherit" />
                    <Typography variant="body2">Starting Camera...</Typography>
                </Box>
            )}

            {error && (
                <Box sx={{ position: 'absolute', p: 2, textAlign: 'center', color: 'error.main' }}>
                    <Typography variant="body2">{error}</Typography>
                </Box>
            )}

            <IconButton
                onClick={onClose}
                sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                }}
            >
                <CloseIcon size={20} />
            </IconButton>
        </Box>
    );
}
