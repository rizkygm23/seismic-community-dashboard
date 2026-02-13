// Magnitude color theme mapping — single source of truth
// Used by UserCard, Promotion page, and any magnitude-related component
export const MAGNITUDE_COLORS: Record<number, string> = {
    1: '#F9EC9E',
    2: '#64CCA9',
    3: '#30C82B',
    4: '#79E20A',
    5: '#8BA411',
    6: '#C89A03',
    7: '#955200',
    8: '#C9442E',
    9: '#00ADE0',
};

// Default color for users without magnitude
export const DEFAULT_THEME_COLOR = '#A6924D';

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
