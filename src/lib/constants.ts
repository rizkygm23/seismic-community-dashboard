// Magnitude color theme mapping — single source of truth
// Used by UserCard, Promotion page, and any magnitude-related component
export const MAGNITUDE_COLORS: Record<number, string> = {
    1: '#a4a3a1',
    2: '#8f8d8a',
    3: '#825a6d',
    4: '#765264',
    5: '#684858',
    6: '#5d3f4e',
    7: '#523542',
    8: '#3d2731',
    9: '#282826',
};

// Default color for users without magnitude
export const DEFAULT_THEME_COLOR = '#825a6d';

// Get theme color from magnitude value
export function getMagnitudeColor(magnitude: number): string {
    return MAGNITUDE_COLORS[Math.floor(magnitude)] || DEFAULT_THEME_COLOR;
}

// Get magnitude value from roles array
export function getMagnitudeFromRoles(roles: string[] | null): number {
    if (!roles) return 0;
    let max = 0;
    const regex = /^Magnitude (\d+\.?\d*)$/;
    roles.forEach(r => {
        const m = r.match(regex);
        if (m) max = Math.max(max, parseFloat(m[1]));
    });
    return max;
}
