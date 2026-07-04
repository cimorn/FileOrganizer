import { describe, expect, it } from 'vitest';
import { DEFAULT_FOLDER_TEMPLATE, DEFAULT_NAME_TEMPLATE } from '../src/shared/default-templates.js';

describe('default album templates', () => {
  it('uses short date folders and indexed original names by default', () => {
    expect(DEFAULT_FOLDER_TEMPLATE).toBe('{yy}{MM}{dd}_{name}');
    expect(DEFAULT_NAME_TEMPLATE).toBe('{index}_{name}');
  });
});
