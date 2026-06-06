import { describe, expect, it } from 'vitest';
import {
    cleanSupabaseAuthRedirectUrl,
    getDiscordAuthRedirectUrl,
    getSupabaseAuthRedirectCleanUrl,
    normalizeSupabaseAuthRedirectUrl,
} from './authRedirect';

describe('auth redirect helpers', () => {
    it('returns a Discord redirect URL without a route hash', () => {
        expect(getDiscordAuthRedirectUrl('https://seismic.rizzgm.xyz')).toBe(
            'https://seismic.rizzgm.xyz/'
        );
    });

    it('normalizes Supabase tokens appended after the search route hash', () => {
        const normalized = normalizeSupabaseAuthRedirectUrl(
            'https://seismic.rizzgm.xyz/#search#access_token=abc&refresh_token=def&expires_in=3600&token_type=bearer'
        );

        expect(normalized).toEqual({
            authUrl:
                'https://seismic.rizzgm.xyz/#access_token=abc&refresh_token=def&expires_in=3600&token_type=bearer',
            cleanUrl: 'https://seismic.rizzgm.xyz/#search',
        });
    });

    it('ignores a normal Supabase auth fragment', () => {
        expect(
            normalizeSupabaseAuthRedirectUrl(
                'https://seismic.rizzgm.xyz/#access_token=abc&refresh_token=def&expires_in=3600&token_type=bearer'
            )
        ).toBeNull();
    });

    it('derives a clean search URL from a normal Supabase auth fragment', () => {
        expect(
            getSupabaseAuthRedirectCleanUrl(
                'https://seismic.rizzgm.xyz/#access_token=abc&refresh_token=def&expires_in=3600&token_type=bearer'
            )
        ).toBe('https://seismic.rizzgm.xyz/#search');
    });

    it('keeps query parameters when building a clean auth redirect URL', () => {
        expect(cleanSupabaseAuthRedirectUrl('https://seismic.rizzgm.xyz/?foo=bar#access_token=abc')).toBe(
            'https://seismic.rizzgm.xyz/?foo=bar#search'
        );
    });
});
