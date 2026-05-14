import { describe, it, expect } from 'vitest';
import { getHighestMagnitudeRole, getRoleIconPath } from './roleUtils';

describe('Role Utilities Logic', () => {
    
    describe('getHighestMagnitudeRole', () => {
        it('harus mengembalikan Magnitude tertinggi dari list role', () => {
            const roles = ['Magnitude 1.0', 'Magnitude 5.0', 'Magnitude 2.0'];
            expect(getHighestMagnitudeRole(roles)).toBe('Magnitude 5.0');
        });

        it('harus bisa menangani angka desimal (Magnitude 1.5 > 1.0)', () => {
            const roles = ['Magnitude 1.0', 'Magnitude 1.5'];
            expect(getHighestMagnitudeRole(roles)).toBe('Magnitude 1.5');
        });

        it('harus mengembalikan null jika inputnya kosong atau null', () => {
            expect(getHighestMagnitudeRole([])).toBeNull();
            expect(getHighestMagnitudeRole(null)).toBeNull();
        });

        it('harus mengabaikan role yang tidak sesuai format "Magnitude X"', () => {
            const roles = ['Admin', 'Magnitude 3.0', 'Moderator'];
            expect(getHighestMagnitudeRole(roles)).toBe('Magnitude 3.0');
        });
    });

    describe('getRoleIconPath', () => {
        it('harus mengembalikan path gambar yang benar berdasarkan Magnitude', () => {
            expect(getRoleIconPath('Magnitude 3.0')).toBe('/icon_role/mag3.webp');
            expect(getRoleIconPath('Magnitude 9.0')).toBe('/icon_role/mag9.webp');
        });

        it('harus mengembalikan null jika Magnitude di luar range 1-9', () => {
            expect(getRoleIconPath('Magnitude 12.0')).toBeNull();
            expect(getRoleIconPath('Magnitude 0.0')).toBeNull();
        });

        it('harus mengembalikan null jika inputnya bukan format Magnitude', () => {
            expect(getRoleIconPath('Supreme Leader')).toBeNull();
        });
    });
});
