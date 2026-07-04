import { describe, expect, it } from 'vitest';
import { getOperationCopy } from '../src/shared/operation-copy.js';

describe('operation confirmation copy', () => {
  it('explains rename operations before applying them to files', () => {
    expect(getOperationCopy('rename', 12)).toMatchObject({
      buttonLabel: '应用改名',
      confirmTitle: '确认改名 12 个文件？',
      successText: '改名成功',
      dangerText: '确认后会直接修改真实文件名，请先确认预览结果。'
    });
  });

  it('explains move operations before applying them to files', () => {
    expect(getOperationCopy('move', 3)).toMatchObject({
      buttonLabel: '应用移动',
      confirmTitle: '确认移动 3 个文件？',
      successText: '移动成功',
      dangerText: '确认后会直接移动真实文件，请先确认目标文件夹。'
    });
  });

  it('explains combined rename and move operations', () => {
    expect(getOperationCopy('rename-move', 5)).toMatchObject({
      buttonLabel: '应用改名并移动',
      confirmTitle: '确认改名并移动 5 个文件？',
      successText: '改名并移动成功'
    });
  });
});
