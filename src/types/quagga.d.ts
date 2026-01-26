declare module 'quagga' {
    interface QuaggaJSConfigObject {
        inputStream?: {
            name?: string;
            type?: string;
            target?: string | HTMLElement;
            constraints?: {
                width?: number | { min?: number; max?: number };
                height?: number | { min?: number; max?: number };
                facingMode?: string;
                aspectRatio?: number | { min?: number; max?: number };
            };
        };
        decoder?: {
            readers?: string[];
            debug?: {
                drawBoundingBox?: boolean;
                showFrequency?: boolean;
                drawScanline?: boolean;
                showPattern?: boolean;
            };
        };
        locate?: boolean;
        numOfWorkers?: number;
    }

    interface QuaggaJSResultObject {
        codeResult: {
            code: string;
            format: string;
        };
    }

    function init(config: QuaggaJSConfigObject, callback: (err: any) => void): void;
    function start(): void;
    function stop(): void;
    function onDetected(callback: (data: QuaggaJSResultObject) => void): void;
    function offDetected(): void;

    export default {
        init,
        start,
        stop,
        onDetected,
        offDetected
    };
}
