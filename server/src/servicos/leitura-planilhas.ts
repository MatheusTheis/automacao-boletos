import fs from 'fs';
import XLSX from 'xlsx';
import dayjs from 'dayjs';
import { fileURLToPath } from 'url';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import { Boleto, Empresa, ResumoBoletos, StatusBoleto } from '../tipos/boletos.js';

dayjs.extend(customParseFormat);

const MESES_VALIDOS = [
  'JANEIRO',
  'FEVEREIRO',
  'MARCO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
];

function normalizarTexto(valor: string): string {
  return valor
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function obterDiretorioBoletos(): string {
  return process.env.BOLETOS_DIR || fileURLToPath(new URL('../../../boletos/', import.meta.url));
}

export function lerArquivosBoletos(): string[] {
  const diretorio = obterDiretorioBoletos();

  return fs.readdirSync(diretorio).filter(nomeArquivo => {
    if (!nomeArquivo.endsWith('.xlsx')) return false;
    if (nomeArquivo.toUpperCase().includes('NAN')) return false;
    return /^(CEMAVI|MB)(20\d{2})\.XLSX$/i.test(nomeArquivo);
  });
}

function converterDataBrasileira(valor: unknown): Date | null {
  if (!valor) return null;

  if (valor instanceof Date) {
    const data = new Date(valor);
    data.setHours(0, 0, 0, 0);
    return data;
  }

  if (typeof valor === 'number') {
    const data = XLSX.SSF.parse_date_code(valor);
    return new Date(data.y, data.m - 1, data.d, 0, 0, 0, 0);
  }

  if (typeof valor === 'string') {
    const data = dayjs(valor, ['DD/MM/YYYY', 'D/M/YYYY', 'DD/MM/YY', 'D/M/YY', 'YYYY-MM-DD'], true);
    if (data.isValid()) {
      return data.toDate();
    }
  }

  return null;
}

function converterValorBrasileiro(valor: unknown): number {
  if (typeof valor === 'number') return valor;
  if (!valor) return 0;

  const texto = valor
    .toString()
    .replace(/R\$\s*/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();

  const numero = parseFloat(texto);
  return Number.isNaN(numero) ? 0 : numero;
}

function normalizarSituacao(situacao: unknown): { pago: boolean; dataPagamento?: Date } {
  if (!situacao) return { pago: false };

  const texto = situacao.toString().trim().toLowerCase();
  const semAcentos = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (!semAcentos.startsWith('pago')) {
    return { pago: false };
  }

  const match = texto.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!match) {
    return { pago: true };
  }

  const dataPagamento = converterDataBrasileira(match[0]);
  return { pago: true, dataPagamento: dataPagamento || undefined };
}

function definirStatus(situacao: unknown, vencimento: Date, hoje: Date = new Date()): StatusBoleto {
  hoje.setHours(0, 0, 0, 0);
  vencimento.setHours(0, 0, 0, 0);

  if (normalizarSituacao(situacao).pago) return 'pago';

  const vencimentoTime = vencimento.getTime();
  const hojeTime = hoje.getTime();

  if (vencimentoTime < hojeTime) return 'atrasado';
  if (vencimentoTime === hojeTime) return 'vence_hoje';
  return 'em_aberto';
}

export function lerBoletos(caminhoArquivo: string, empresa: Empresa): Boleto[] {
  const workbook = XLSX.readFile(caminhoArquivo);
  const boletos: Boleto[] = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  for (const nomeAba of workbook.SheetNames) {
    const mesOriginal = nomeAba.trim().toUpperCase();
    const mesNormalizado = normalizarTexto(nomeAba);
    if (!MESES_VALIDOS.includes(mesNormalizado)) continue;

    const sheet = workbook.Sheets[nomeAba];
    const linhas = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

    for (let i = 1; i < linhas.length; i += 1) {
      const linha = linhas[i];
      if (!linha || linha.length === 0) continue;

      const [cliente, nossoNumero, valor, emissao, vencimento, situacao] = linha;
      if (!cliente && !nossoNumero) continue;

      const emissaoDate = converterDataBrasileira(emissao);
      const vencimentoDate = converterDataBrasileira(vencimento);

      if (!vencimentoDate) continue;

      const situacaoNormalizada = normalizarSituacao(situacao);

      boletos.push({
        empresa,
        cliente: cliente?.toString() || '',
        nossoNumero: nossoNumero?.toString() || '',
        valor: converterValorBrasileiro(valor),
        emissao: emissaoDate ? emissaoDate.toISOString() : '',
        vencimento: vencimentoDate.toISOString(),
        situacao: situacao ? situacao.toString() : null,
        dataPagamento: situacaoNormalizada.dataPagamento?.toISOString(),
        mesAba: mesOriginal,
        status: definirStatus(situacao, vencimentoDate, hoje),
      });
    }
  }

  return boletos;
}

export function calcularResumo(boletos: Boleto[]): ResumoBoletos {
  const totais = {
    linhas: boletos.length,
    pagos: 0,
    emAberto: 0,
    atrasados: 0,
    vencemHoje: 0,
  };

  const valores = {
    total: 0,
    pago: 0,
    emAberto: 0,
    atrasado: 0,
  };

  const mapaMeses = new Map<string, ResumoBoletos['porMes'][number]>();

  boletos.forEach(boleto => {
    valores.total += boleto.valor;

    switch (boleto.status) {
      case 'pago':
        totais.pagos += 1;
        valores.pago += boleto.valor;
        break;
      case 'atrasado':
        totais.atrasados += 1;
        totais.emAberto += 1;
        valores.emAberto += boleto.valor;
        valores.atrasado += boleto.valor;
        break;
      case 'vence_hoje':
        totais.vencemHoje += 1;
        totais.emAberto += 1;
        valores.emAberto += boleto.valor;
        break;
      case 'em_aberto':
        totais.emAberto += 1;
        valores.emAberto += boleto.valor;
        break;
    }

    if (!mapaMeses.has(boleto.mesAba)) {
      mapaMeses.set(boleto.mesAba, {
        mesAba: boleto.mesAba,
        linhas: 0,
        pagos: 0,
        emAberto: 0,
        atrasados: 0,
        vencemHoje: 0,
        valorTotal: 0,
      });
    }

    const resumoMes = mapaMeses.get(boleto.mesAba)!;
    resumoMes.linhas += 1;
    resumoMes.valorTotal += boleto.valor;

    if (boleto.status === 'pago') resumoMes.pagos += 1;
    if (boleto.status === 'atrasado') {
      resumoMes.atrasados += 1;
      resumoMes.emAberto += 1;
    }
    if (boleto.status === 'vence_hoje') {
      resumoMes.vencemHoje += 1;
      resumoMes.emAberto += 1;
    }
    if (boleto.status === 'em_aberto') resumoMes.emAberto += 1;
  });

  return {
    totais,
    valores,
    porMes: Array.from(mapaMeses.values()),
  };
}
