export function getHighestMagnitudeRole(roles: string[] | null): string | null {
    if (!roles || roles.length === 0) return null;

    const magnitudePattern = /^Magnitude (\d+)(\.\d+)?$/;
    let highestMag = 0;

    roles.forEach(role => {
        const match = role.match(magnitudePattern);
        if (match) {
            const magValue = parseFloat(match[1] + (match[2] || ''));
            if (magValue > highestMag) {
                highestMag = magValue;
            }
        }
    });

    if (highestMag > 0) {
        // Return only the main digit for the icon filename (1-9)
        return `Magnitude ${highestMag.toFixed(1)}`;
    }

    return null;
}

export function getRoleIconPath(roleName: string | null): string | null {
    if (!roleName) return null;

    const magMatch = roleName.match(/^Magnitude (\d+)(\.\d+)?$/);
    if (magMatch) {
        const magnitude = parseInt(magMatch[1]); // Get integer part for file name
        // Ensure magnitude is within range 1-9 if your icons are limited
        if (magnitude >= 1 && magnitude <= 9) {
            return `/icon_role/mag${magnitude}.webp`;
        }
    }
    return null;
}

export function getHighestRoleIcon(roles: string[] | null): string | null {
    const highestRole = getHighestMagnitudeRole(roles);
    return getRoleIconPath(highestRole);
}
