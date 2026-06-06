const AUTH_FRAGMENT_MARKERS = [
    'access_token=',
    'refresh_token=',
    'expires_in=',
    'error=',
    'error_description=',
    'error_code=',
];

export const SEARCH_SECTION_HASH = '#search';
export const AUTH_REDIRECT_CLEAN_URL_KEY = 'seismic-auth-clean-url';

export function getDiscordAuthRedirectUrl(origin: string) {
    return `${origin}/`;
}

export function normalizeSupabaseAuthRedirectUrl(currentUrl: string) {
    const url = new URL(currentUrl);
    const hash = url.hash;

    if (!hash || !AUTH_FRAGMENT_MARKERS.some((marker) => hash.includes(marker))) {
        return null;
    }

    const authFragmentStart = hash.indexOf('#', 1);
    if (authFragmentStart < 0) {
        return null;
    }

    const tokenFragment = hash.slice(authFragmentStart + 1);
    const routeHash = hash.slice(0, authFragmentStart);

    if (!AUTH_FRAGMENT_MARKERS.some((marker) => tokenFragment.includes(marker))) {
        return null;
    }

    url.hash = tokenFragment;

    return {
        authUrl: url.toString(),
        cleanUrl: `${url.origin}${url.pathname}${url.search}${routeHash || SEARCH_SECTION_HASH}`,
    };
}

export function getSupabaseAuthRedirectCleanUrl(currentUrl: string) {
    const normalizedAuthRedirect = normalizeSupabaseAuthRedirectUrl(currentUrl);
    if (normalizedAuthRedirect) {
        return normalizedAuthRedirect.cleanUrl;
    }

    const url = new URL(currentUrl);
    if (!url.hash || !AUTH_FRAGMENT_MARKERS.some((marker) => url.hash.includes(marker))) {
        return null;
    }

    return cleanSupabaseAuthRedirectUrl(currentUrl);
}

export function cleanSupabaseAuthRedirectUrl(currentUrl: string, sectionHash = SEARCH_SECTION_HASH) {
    const url = new URL(currentUrl);
    return `${url.origin}${url.pathname}${url.search}${sectionHash}`;
}

export function rememberAuthRedirectCleanUrl(cleanUrl: string) {
    if (typeof window === 'undefined') return;
    try {
        window.sessionStorage.setItem(AUTH_REDIRECT_CLEAN_URL_KEY, cleanUrl);
    } catch {
        // Session storage can be blocked by browser privacy settings.
    }
}

export function takeAuthRedirectCleanUrl() {
    if (typeof window === 'undefined') return null;

    try {
        const cleanUrl = window.sessionStorage.getItem(AUTH_REDIRECT_CLEAN_URL_KEY);
        if (cleanUrl) {
            window.sessionStorage.removeItem(AUTH_REDIRECT_CLEAN_URL_KEY);
        }

        return cleanUrl;
    } catch {
        return null;
    }
}
