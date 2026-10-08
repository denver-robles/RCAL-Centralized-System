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
