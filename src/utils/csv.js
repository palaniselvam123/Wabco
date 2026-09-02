export function exportCSV(data, type) {
  if (!data.length) {
    alert('No data to export.');
    return;
  }

  const keys = Object.keys(data[0]);
  const rows = [
    keys.join(','),
    ...data.map((r) =>
      keys
        .map((k) => {
          const v = r[k];
          if (v == null) return '';
          const str = String(v).replace(/"/g, '""');
          return /[,"\n]/.test(str) ? `"${str}"` : str;
        })
        .join(',')
    ),
  ];

  const blob = new Blob(['\uFEFF' + rows.join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ZF_India_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
