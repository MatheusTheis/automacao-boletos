import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import { Boleto, Empresa } from '../tipos/boletos.js';
import { obterDiretorioBoletos } from './leitura-planilhas.js';

dayjs.extend(customParseFormat);

const MESES_ABA = [
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

const CABECALHO_PADRAO = ['CLIENTE', 'NOSSO NUMERO', 'VALOR', 'EMISSAO', 'VENCIMENTO', 'SITUACAO'];

function normalizarTexto(valor: string): string {
  return valor
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function obterNomeAbaReal(workbook: XLSX.WorkBook, nomeAba: string): string {
  return workbook.SheetNames.find(nomeAtual => normalizarTexto(nomeAtual) === normalizarTexto(nomeAba)) || nomeAba;
}

function formatarDataBrasileira(dataValor: string): string {
  return dayjs(dataValor).format('DD/MM/YYYY');
}

function interpretarDataFormulario(data: string): string | null {
  const dataParseada = dayjs(data, ['DD/MM/YYYY', 'D/M/YYYY', 'YYYY-MM-DD'], true);
  return dataParseada.isValid() ? dataParseada.format('YYYY-MM-DD') : null;
}

function interpretarValorFormulario(valor: string | number): number | null {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null;
  }

  const texto = valor.trim();
  if (!texto) {
    return null;
  }

  const ultimoPonto = texto.lastIndexOf('.');
  const ultimaVirgula = texto.lastIndexOf(',');
  const separadorDecimal = Math.max(ultimoPonto, ultimaVirgula);

  let parteInteira = texto;
  let parteDecimal = '';

  if (separadorDecimal >= 0) {
    parteInteira = texto.slice(0, separadorDecimal);
    parteDecimal = texto.slice(separadorDecimal + 1);
  }

  const inteiroLimpo = parteInteira.replace(/[^\d-]/g, '');
  const decimalLimpo = parteDecimal.replace(/[^\d]/g, '');
  const valorNormalizado = decimalLimpo ? `${inteiroLimpo}.${decimalLimpo}` : inteiroLimpo;
  const numero = Number.parseFloat(valorNormalizado);

  return Number.isFinite(numero) ? numero : null;
}

function garantirAba(workbook: XLSX.WorkBook, nomeAba: string): XLSX.WorkSheet {
  const nomeAbaExistente = obterNomeAbaReal(workbook, nomeAba);
  const abaExistente = workbook.Sheets[nomeAbaExistente];
  if (abaExistente) {
    return abaExistente;
  }

  const novaAba = XLSX.utils.aoa_to_sheet([CABECALHO_PADRAO]);
  workbook.SheetNames.push(nomeAba);
  workbook.Sheets[nomeAba] = novaAba;
  return novaAba;
}

function buscarDuplicado(workbook: XLSX.WorkBook, nossoNumero: string): string | null {
  const alvo = nossoNumero.replace(/[.\-\s]/g, '');

  for (const nomeAba of workbook.SheetNames) {
    const aba = workbook.Sheets[nomeAba];
    const linhas = XLSX.utils.sheet_to_json(aba, { header: 1 }) as unknown[][];

    for (let i = 1; i < linhas.length; i += 1) {
      const atual = linhas[i]?.[1]?.toString().replace(/[.\-\s]/g, '');
      if (atual && atual === alvo) {
        return nomeAba;
      }
    }
  }

  return null;
}

function encontrarLinhaCabecalho(linhas: unknown[][]): number {
  return linhas.findIndex(linha =>
    Array.isArray(linha) && linha.some(coluna => coluna !== undefined && coluna !== null && String(coluna).trim() !== '')
  );
}

export function atualizarBoletoNaPlanilha(
  arquivoExcel: string,
  nossoNumero: string,
  dadosPagamento: {
    dataPagamento?: string;
    valorPago?: number;
    situacao?: string;
  }
): boolean {
  try {
    const caminhoArquivo = path.join(obterDiretorioBoletos(), arquivoExcel);
    if (!fs.existsSync(caminhoArquivo)) {
      return false;
    }

    const workbook = XLSX.readFile(caminhoArquivo);
    let boletoAtualizado = false;

    for (const nomeAba of workbook.SheetNames) {
      const aba = workbook.Sheets[nomeAba];
      const linhas = XLSX.utils.sheet_to_json(aba, { header: 1 }) as unknown[][];
      const indiceCabecalho = encontrarLinhaCabecalho(linhas);
      if (indiceCabecalho === -1) continue;

      const cabecalho = linhas[indiceCabecalho];
      if (!Array.isArray(cabecalho) || cabecalho.length === 0) continue;

      const colunaNossoNumero = cabecalho.findIndex(coluna => coluna?.toString().toLowerCase().includes('nosso'));
      const colunaSituacao = cabecalho.findIndex(coluna => coluna?.toString().toLowerCase().includes('situ'));

      if (colunaNossoNumero === -1 || colunaSituacao === -1) continue;

      for (let i = indiceCabecalho + 1; i < linhas.length; i += 1) {
        const linha = linhas[i];
        const numeroLinha = linha?.[colunaNossoNumero]?.toString().replace(/[.\-\s]/g, '');
        const numeroBuscado = nossoNumero.replace(/[.\-\s]/g, '');

        if (numeroLinha === numeroBuscado) {
          linhas[i][colunaSituacao] =
            typeof dadosPagamento.situacao === 'string'
              ? dadosPagamento.situacao
              : dadosPagamento.dataPagamento
                ? `Pago ${formatarDataBrasileira(dadosPagamento.dataPagamento)}`
                : '';
          workbook.Sheets[nomeAba] = XLSX.utils.aoa_to_sheet(linhas);
          boletoAtualizado = true;
          break;
        }
      }

      if (boletoAtualizado) {
        break;
      }
    }

    if (!boletoAtualizado) {
      return false;
    }

    XLSX.writeFile(workbook, caminhoArquivo);
    return true;
  } catch (erro) {
    console.error('Erro ao atualizar boleto na planilha:', erro);
    return false;
  }
}

export function marcarComoPago(boleto: Boleto, dataPagamento: string, valorPago?: number): boolean {
  const ano = new Date(boleto.vencimento).getFullYear();
  const arquivoExcel = `${boleto.empresa}${ano}.xlsx`;

  return atualizarBoletoNaPlanilha(arquivoExcel, boleto.nossoNumero, {
    dataPagamento,
    valorPago: valorPago || boleto.valor,
    situacao: `Pago ${formatarDataBrasileira(dataPagamento)}`,
  });
}

export function desmarcarComoPago(boleto: Boleto): boolean {
  const ano = new Date(boleto.vencimento).getFullYear();
  const arquivoExcel = `${boleto.empresa}${ano}.xlsx`;

  return atualizarBoletoNaPlanilha(arquivoExcel, boleto.nossoNumero, {
    situacao: '',
  });
}

export function registrarNovoBoleto(dados: {
  empresa: Empresa;
  cliente: string;
  nossoNumero: string;
  valor: string | number;
  emissao: string;
  vencimento: string;
}): { sucesso: true; arquivo: string; aba: string } | { sucesso: false; erro: string } {
  try {
    const cliente = dados.cliente.trim();
    const nossoNumero = dados.nossoNumero.trim();
    const emissaoIso = interpretarDataFormulario(dados.emissao);
    const vencimentoIso = interpretarDataFormulario(dados.vencimento);
    const valorNumerico = interpretarValorFormulario(dados.valor);

    if (!cliente || !nossoNumero || !emissaoIso || !vencimentoIso || valorNumerico === null) {
      return { sucesso: false, erro: 'Dados invalidos para registrar o boleto.' };
    }

    const anoArquivo = dayjs(vencimentoIso).year();
    const arquivoExcel = `${dados.empresa}${anoArquivo}.xlsx`;
    const nomeAba = MESES_ABA[dayjs(vencimentoIso).month()];
    const diretorioBoletos = obterDiretorioBoletos();
    const caminhoArquivo = path.join(diretorioBoletos, arquivoExcel);

    if (!fs.existsSync(diretorioBoletos)) {
      fs.mkdirSync(diretorioBoletos, { recursive: true });
    }

    const workbook = fs.existsSync(caminhoArquivo) ? XLSX.readFile(caminhoArquivo) : XLSX.utils.book_new();
    const abaDuplicada = buscarDuplicado(workbook, nossoNumero);
    if (abaDuplicada) {
      return { sucesso: false, erro: `Nosso numero ja cadastrado na aba ${abaDuplicada}.` };
    }

    const nomeAbaReal = obterNomeAbaReal(workbook, nomeAba);
    const aba = garantirAba(workbook, nomeAbaReal);
    const linhas = XLSX.utils.sheet_to_json(aba, { header: 1 }) as unknown[][];
    if (linhas.length === 0) {
      linhas.push(CABECALHO_PADRAO);
    }

    linhas.push([
      cliente,
      nossoNumero,
      valorNumerico,
      formatarDataBrasileira(emissaoIso),
      formatarDataBrasileira(vencimentoIso),
      '',
    ]);

    workbook.Sheets[nomeAbaReal] = XLSX.utils.aoa_to_sheet(linhas);
    if (!workbook.SheetNames.includes(nomeAbaReal)) {
      workbook.SheetNames.push(nomeAbaReal);
    }

    XLSX.writeFile(workbook, caminhoArquivo);
    return { sucesso: true, arquivo: arquivoExcel, aba: nomeAbaReal };
  } catch (erro) {
    console.error('Erro ao registrar novo boleto:', erro);
    return { sucesso: false, erro: 'Falha interna ao registrar boleto.' };
  }
}
