/**
 * ClimateGuard - PWA registration (graceful, page-depth aware).
 * The worker lives next to the site root; deriving its URL from this
 * script's URL keeps registration working at any deploy sub-path.
 */
const PWA = (function() {
    function swUrl() {
        try {
            if (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) {
                return new URL('../service-worker.js', document.currentScript.src).href;
            }
        } catch { /* fall through to relative default */ }
        return 'service-worker.js';
    }

    // 'registered' | 'failed' | 'unsupported' — never throws.
    async function register() {
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
            return 'unsupported';
        }
        try {
            await navigator.serviceWorker.register(swUrl());
            console.log('✅ Service worker registered');
            return 'registered';
        } catch (err) {
            console.warn('Service worker registration failed:', err);
            return 'failed';
        }
    }

    if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('DOMContentLoaded', () => { register(); });
    }

    return { register, swUrl };
})();
