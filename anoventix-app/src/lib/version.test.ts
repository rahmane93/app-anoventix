import { comparerVersions } from './version';

describe('comparerVersions', () => {
  it('compare partie par partie, en nombres', () => {
    expect(comparerVersions('1.0.0', '1.0.0')).toBe(0);
    expect(comparerVersions('1.2.0', '1.10.0')).toBeLessThan(0);
    expect(comparerVersions('2.0', '1.9.9')).toBeGreaterThan(0);
  });

  it('complète les parties manquantes et ignore les suffixes', () => {
    expect(comparerVersions('1.0', '1.0.0')).toBe(0);
    expect(comparerVersions('1.1.0-beta', '1.1.0')).toBe(0);
  });
});
