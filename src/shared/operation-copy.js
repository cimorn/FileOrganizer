const operationCopies = {
  rename: {
    verb: '改名',
    buttonLabel: '应用改名',
    confirmVerb: '改名',
    successText: '改名成功',
    dangerText: '确认后会直接修改真实文件名，请先确认预览结果。'
  },
  move: {
    verb: '移动',
    buttonLabel: '应用移动',
    confirmVerb: '移动',
    successText: '移动成功',
    dangerText: '确认后会直接移动真实文件，请先确认目标文件夹。'
  },
  'rename-move': {
    verb: '改名并移动',
    buttonLabel: '应用改名并移动',
    confirmVerb: '改名并移动',
    successText: '改名并移动成功',
    dangerText: '确认后会直接修改真实文件名并移动文件，请先确认预览结果和目标文件夹。'
  }
};

export function getOperationCopy(mode, count) {
  const copy = operationCopies[mode] ?? operationCopies.rename;
  return {
    ...copy,
    confirmTitle: `确认${copy.confirmVerb} ${count} 个文件？`
  };
}
