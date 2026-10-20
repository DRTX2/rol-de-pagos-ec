/* Escritor mínimo de .xlsx (Office Open XML + ZIP sin compresión). Sin dependencias.
   App.xlsx.build([{ name, rows, widths, merges, freeze, heights, landscape }]) → Blob
   Celda: { v, f (fórmula), s (estilo: { font:{b,i,sz,color}, fill, border, fmt:'num'|'int'|'text', h, wrap }) } */
(function () {
  'use strict';
  const App = window.App;
  const enc = new TextEncoder();
  const x = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ---------- ZIP (método "stored") ---------- */
  const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const u16 = (n) => [n & 255, (n >> 8) & 255];
  const u32 = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  function zip(files) {
    const parts = [], central = []; let off = 0;
    files.forEach((f) => {
      const name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data), sz = data.length;
      const head = [0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(sz), ...u32(sz), ...u16(name.length), ...u16(0)];
      parts.push(new Uint8Array(head), name, data);
      central.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(sz), ...u32(sz), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), name);
      off += head.length + name.length + sz;
    });
    const cdSize = central.reduce((a, p) => a + p.length, 0);
    const end = new Uint8Array([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(off), ...u16(0)]);
    return new Blob([...parts, ...central, end], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /* ---------- Estilos ---------- */
  function Styles() {
    const fonts = ['<font><sz val="11"/><color rgb="FF0E1B2C"/><name val="Calibri"/></font>'];
    const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
    const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>'];
    const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
    const memo = {};
    const idx = (arr, v) => { let i = arr.indexOf(v); if (i < 0) { arr.push(v); i = arr.length - 1; } return i; };
    const side = (t, st, c) => `<${t} style="${st}"><color rgb="${c}"/></${t}>`;
    return {
      get(spec) {
        const key = JSON.stringify(spec || {});
        if (key in memo) return memo[key];
        const f = (spec && spec.font) || {};
        const font = `<font>${f.b ? '<b/>' : ''}${f.i ? '<i/>' : ''}<sz val="${f.sz || 11}"/><color rgb="${f.color || 'FF0E1B2C'}"/><name val="Calibri"/></font>`;
        const fill = spec && spec.fill ? `<fill><patternFill patternType="solid"><fgColor rgb="${spec.fill}"/><bgColor indexed="64"/></patternFill></fill>` : fills[0];
        const b = spec && spec.border;
        const border = !b ? borders[0] : `<border>${side('left', 'thin', 'FFD0D7DE')}${side('right', 'thin', 'FFD0D7DE')}${side('top', b === 'total' ? 'medium' : 'thin', b === 'total' ? 'FF0E1B2C' : 'FFD0D7DE')}${side('bottom', 'thin', 'FFD0D7DE')}<diagonal/></border>`;
        const nf = { num: 4, int: 1, text: 49 }[spec && spec.fmt] || 0;
        const align = `<alignment${spec && spec.h ? ` horizontal="${spec.h}"` : ''} vertical="center"${spec && spec.wrap ? ' wrapText="1"' : ''}/>`;
        const xf = `<xf numFmtId="${nf}" fontId="${idx(fonts, font)}" fillId="${idx(fills, fill)}" borderId="${idx(borders, border)}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${align}</xf>`;
        return (memo[key] = idx(xfs, xf));
      },
      xml: () => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="${borders.length}">${borders.join('')}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
    };
  }

  const colName = (i) => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };

  function sheetXml(sh, st) {
    const rows = sh.rows.map((row, r) => {
      const ht = sh.heights && sh.heights[r] ? ` ht="${sh.heights[r]}" customHeight="1"` : '';
      const cells = row.map((c, i) => {
        if (c === null || c === undefined) return '';
        const cell = typeof c === 'object' && !Array.isArray(c) ? c : { v: c };
        const ref = colName(i) + (r + 1), s = st.get(cell.s), sa = s ? ` s="${s}"` : '';
        if (cell.f) return `<c r="${ref}"${sa}><f>${x(cell.f)}</f>${cell.v !== undefined ? `<v>${cell.v}</v>` : ''}</c>`;
        if (cell.v === undefined || cell.v === '') return `<c r="${ref}"${sa}/>`;
        if (typeof cell.v === 'number') return `<c r="${ref}"${sa}><v>${cell.v}</v></c>`;
        return `<c r="${ref}"${sa} t="inlineStr"><is><t xml:space="preserve">${x(cell.v)}</t></is></c>`;
      }).join('');
      return `<row r="${r + 1}"${ht}>${cells}</row>`;
    }).join('');
    const fz = sh.freeze ? `<pane xSplit="${sh.freeze.c}" ySplit="${sh.freeze.r}" topLeftCell="${colName(sh.freeze.c)}${sh.freeze.r + 1}" activePane="bottomRight" state="frozen"/><selection pane="bottomRight"/>` : '';
    const cols = sh.widths ? `<cols>${sh.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
    const merges = sh.merges && sh.merges.length ? `<mergeCells count="${sh.merges.length}">${sh.merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView showGridLines="0" workbookViewId="0">${fz}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/>${cols}<sheetData>${rows}</sheetData>${merges}<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="${sh.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  }

  function build(sheets) {
    const st = Styles(), n = sheets.length;
    const files = [
      { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>` },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${x(s.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` },
      { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    ];
    sheets.forEach((s, i) => files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s, st) }));
    files.push({ name: 'xl/styles.xml', data: st.xml() }); // al final: los estilos se registran al generar las hojas
    return zip(files);
  }

  App.xlsx = { build, colName };
})();
