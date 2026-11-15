import { describe, expect, it } from 'vitest';
import { previewStorageNamespace } from '../../src/app/controller';

describe('isolation of review and game saves by application path', () => {
  it('retains the existing live V3.0 save without a preview prefix', () => {
    expect(previewStorageNamespace('/Library-Tycoon/v30/')).toBeNull();
    expect(previewStorageNamespace('/')).toBeNull();
    expect(previewStorageNamespace('/Library-Tycoon/v32-assets/')).toBeNull();
  });
  it('isolates V3.2 preview saves and settings from V3.0 and V3.1', () => {
    expect(previewStorageNamespace('/Library-Tycoon/v32/')).toBe('v32');
    expect(previewStorageNamespace('/Library-Tycoon/v32-jabir/')).toBe('v32-jabir');
    expect(previewStorageNamespace('/v32/index.html')).toBe('v32');
    expect(previewStorageNamespace('/Library-Tycoon/v31/')).toBe('v31');
    expect(previewStorageNamespace('/Library-Tycoon/v31-shelves/')).toBe('v31-shelves');
  });
  it('treats path components literally, not partial matches', () => {
    expect(previewStorageNamespace('/my-v32-preview/')).toBeNull();
    expect(previewStorageNamespace('/V32/')).toBeNull();
    expect(previewStorageNamespace('/v32-preview/')).toBeNull();
  });
});
