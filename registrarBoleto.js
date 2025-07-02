// registrarBoleto.js
import ExcelJS from 'exceljs';
import dayjs   from 'dayjs';
import fs      from 'fs/promises';
import path    from 'path';

export const DIR_PLANILHAS = 'boletos';
export const EMPRESAS     = ['CEMAVI', 'MB'];
export const MESES_PT     = [
  'JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
  'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'
];

// ---------- função principal ----------
export async function registrarBoleto(data) {
  // ••• validações simples •••
  if (!EMPRESAS.includes(data.empresa)) throw new Error('Empresa inválida');
  const vencDate = dayjs(data.venc , 'DD/MM/YYYY', true);
  const emiDate  = dayjs(data.emiss, 'DD/MM/YYYY', true);
  if (!vencDate.isValid() || !emiDate.isValid()) throw new Error('Datas no formato DD/MM/AAAA');

  const ano    = vencDate.year();
  const mesIdx = vencDate.month();             // 0 = janeiro
  await fs.mkdir(DIR_PLANILHAS, { recursive:true });
  const plan   = path.join(DIR_PLANILHAS, `${data.empresa}${ano}.xlsx`);

  // abre ou cria
  const wb = new ExcelJS.Workbook();
  try { await fs.access(plan); await wb.xlsx.readFile(plan); } catch {/*planilha nova*/}

  // garante aba
  const abaNome = MESES_PT[mesIdx];
  let ws = wb.getWorksheet(abaNome);
  if (!ws) {
    ws = wb.addWorksheet(abaNome);
    const header = ['CLIENTE','NOSSO NÚMERO','VALOR','EMISSÃO','VENCIMENTO','SITUAÇÃO'];
    ws.addRow(header);
    formatarCabecalho(ws);
  }

  // insere ordenado
  const nova = {
    cliente : data.cliente,
    nosso   : data.nosso,
    valor   : parseFloat(data.valor.replace('.', '').replace(',', '.')),
    emissao : emiDate.toDate(),
    venc    : vencDate.toDate(),
    situ    : data.pago ? 'PAGO' : ''
  };
  inserirOrdenado(ws, nova, vencDate.toDate());
  aplicarFormatos(ws);

  await wb.xlsx.writeFile(plan);
  return { arquivo: path.basename(plan), aba: abaNome };
}

// ---------- helpers ----------
function inserirOrdenado(ws, rowObj, vencJSDate) {
  const linhas = ws.getRows(2, ws.rowCount - 1) || [];
  let idx = linhas.length + 2;
  for (let i = 0; i < linhas.length; i++) {
    const cel = linhas[i].getCell(5).value;
    if (cel && dayjs(cel).isAfter(vencJSDate)) { idx = i + 2; break; }
  }
  ws.spliceRows(idx, 0, [
    rowObj.cliente, rowObj.nosso, rowObj.valor,
    rowObj.emissao, rowObj.venc,  rowObj.situ
  ]);
}

function formatarCabecalho(ws) {
  const headerRow = ws.getRow(1);
  headerRow.eachCell(cell => {
    cell.font = { name: 'Comic Sans MS', size: 12, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9D9D9' }
    };
    cell.border = {
      top:    { style: 'thin' },
      left:   { style: 'thin' },
      bottom: { style: 'thin' },
      right:  { style: 'thin' }
    };
  });

  ws.columns = [
    { width: 35 }, // CLIENTE
    { width: 20 }, // NOSSO NÚMERO
    { width: 14 }, // VALOR
    { width: 14 }, // EMISSÃO
    { width: 14 }, // VENCIMENTO
    { width: 14 }  // SITUAÇÃO
  ];
}


function aplicarFormatos(ws) {
  ws.getColumn(3).numFmt = 'R$ #,##0.00';
  ws.getColumn(4).numFmt = ws.getColumn(5).numFmt = 'dd/mm/yyyy';

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i);
    row.eachCell(cell => {
      cell.font = { name: 'Comic Sans MS', size: 12 };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top:    { style: 'thin' },
        left:   { style: 'thin' },
        bottom: { style: 'thin' },
        right:  { style: 'thin' }
      };
    });
  }
}


const bordaFina = () => ({
  top:{style:'thin'}, left:{style:'thin'},
  bottom:{style:'thin'}, right:{style:'thin'}
});
