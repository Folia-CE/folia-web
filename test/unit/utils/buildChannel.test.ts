import { describe, expect, it } from 'vitest';
import { isOfficialBuildBranch } from '../../../src/utils/buildChannel';

describe('isOfficialBuildBranch', () => {
    it('accepts main and release branches', () => {
        expect(isOfficialBuildBranch('main')).toBe(true);
        expect(isOfficialBuildBranch('release/0.7.22')).toBe(true);
        expect(isOfficialBuildBranch('  main  ')).toBe(true);
    });

    it('rejects work branches', () => {
        expect(isOfficialBuildBranch('feat/lattice')).toBe(false);
        expect(isOfficialBuildBranch('fix/qq-login')).toBe(false);
        expect(isOfficialBuildBranch('dev')).toBe(false);
        expect(isOfficialBuildBranch('release/0.7.22.1')).toBe(false);
    });

    // 分不清的取值一律按非正式版算：把非正式版认成正式版的代价更大。
    it('treats unknown or detached values as unofficial', () => {
        for (const value of ['', '   ', 'HEAD', 'unknown', 'UNKNOWN', null, undefined]) {
            expect(isOfficialBuildBranch(value)).toBe(false);
        }
    });
});
