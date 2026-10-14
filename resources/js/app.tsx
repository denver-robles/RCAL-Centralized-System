import './bootstrap';
import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

const appName = 'RCAL PIMS';

// Resolve initial page data from either script element (Inertia v2/v3) or root dataset attribute
const getInitialPage = () => {
    const script = document.querySelector('script[data-page="app"][type="application/json"]');
    if (script?.textContent) {
        try {
            return JSON.parse(script.textContent);
        } catch (e) {
            console.error('Failed to parse script data-page:', e);
        }
    }

    const el = document.getElementById('app');
    if (el?.dataset?.page) {
        try {
            return JSON.parse(el.dataset.page);
        } catch (e) {
            console.error('Failed to parse element dataset.page:', e);
        }
    }

    return undefined;
};

const page = getInitialPage();

createInertiaApp({
    page,
    title: (title) => (title ? `${title} — ${appName}` : appName),
    resolve: (name) => resolvePageComponent(`./Pages/${name}.tsx`, import.meta.glob('./Pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(<App {...props} />);
    },
    progress: {
        color: '#f59e0b',
        showSpinner: true,
    },
});

const isProtectedPath = (pathname: string) =>
    pathname.startsWith('/portal') ||
    pathname.startsWith('/identity') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/records') ||
    pathname.startsWith('/certificates') ||
    pathname.startsWith('/schedules') ||
    pathname.startsWith('/clergy') ||
    pathname.startsWith('/users') ||
    pathname.startsWith('/audit') ||
    pathname.startsWith('/analytics');

let wasInProtectedRoute = isProtectedPath(window.location.pathname);

// Prevent restoring stale authenticated views from browser back-forward cache (BFCache)
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        window.location.reload();
    }
});

// Intercept browser back/forward navigation between protected and public routes
window.addEventListener('popstate', () => {
    const currentPath = window.location.pathname;
    const isNowProtected = isProtectedPath(currentPath);

    // If navigating backward OUT of protected portal into a public page (e.g. landing page or login)
    if (wasInProtectedRoute && !isNowProtected) {
        wasInProtectedRoute = false;
        // Automatically terminate session to prevent session hijacking on shared/public terminals
        const csrfToken =
            document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
                'X-Requested-With': 'XMLHttpRequest',
            },
        }).finally(() => {
            window.location.reload();
        });
        return;
    }

    // If navigating INTO a protected route via history traversal:
    if (isNowProtected) {
        wasInProtectedRoute = true;
        // Force server round-trip to verify session validity
        window.location.reload();
        return;
    }

    wasInProtectedRoute = isNowProtected;
});
