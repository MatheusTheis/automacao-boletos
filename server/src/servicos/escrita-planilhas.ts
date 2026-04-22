import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import { Boleto, Empresa } from '../tipos/boletos.js';
import { lerArquivosBoletos, obterDiretorioBoletos } from './leitura-planilhas.js';
import { normalizarIdEmpresa } from './empresas.js';

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

function montarNomeArquivoEmpresa(empresa: string, ano: number): string {
  return `${normalizarIdEmpresa(empresa)}${ano}.xlsx`;
}

export function obterCaminhoArquivoEmpresaAno(empresa: string, ano: number): string {
  return path.join(obterDiretorioBoletos(), montarNomeArquivoEmpresa(empresa, ano));
}

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
  const arquivoExcel = montarNomeArquivoEmpresa(boleto.empresa, ano);

  return atualizarBoletoNaPlanilha(arquivoExcel, boleto.nossoNumero, {
    dataPagamento,
    valorPago: valorPago || boleto.valor,
    situacao: `Pago ${formatarDataBrasileira(dataPagamento)}`,
  });
}

export function desmarcarComoPago(boleto: Boleto): boolean {
  const ano = new Date(boleto.vencimento).getFullYear();
  const arquivoExcel = montarNomeArquivoEmpresa(boleto.empresa, ano);

  return atualizarBoletoNaPlanilha(arquivoExcel, boleto.nossoNumero, {
    situacao: '',
  });
}

export function excluirBoletoDaPlanilha(boleto: Boleto): boolean {
  try {
    const ano = new Date(boleto.vencimento).getFullYear();
    const arquivoExcel = montarNomeArquivoEmpresa(boleto.empresa, ano);
    const caminhoArquivo = path.join(obterDiretorioBoletos(), arquivoExcel);

    if (!fs.existsSync(caminhoArquivo)) {
      return false;
    }

    const workbook = XLSX.readFile(caminhoArquivo);
    const numeroBuscado = boleto.nossoNumero.replace(/[.\-\s]/g, '');
    let boletoExcluido = false;

    for (const nomeAba of workbook.SheetNames) {
      const aba = workbook.Sheets[nomeAba];
      const linhas = XLSX.utils.sheet_to_json(aba, { header: 1 }) as unknown[][];
      const indiceCabecalho = encontrarLinhaCabecalho(linhas);

      if (indiceCabecalho === -1) continue;

      const cabecalho = linhas[indiceCabecalho];
      if (!Array.isArray(cabecalho) || cabecalho.length === 0) continue;

      const colunaNossoNumero = cabecalho.findIndex(coluna => coluna?.toString().toLowerCase().includes('nosso'));
      if (colunaNossoNumero === -1) continue;

      for (let i = indiceCabecalho + 1; i < linhas.length; i += 1) {
        const linha = linhas[i];
        const numeroLinha = linha?.[colunaNossoNumero]?.toString().replace(/[.\-\s]/g, '');

        if (numeroLinha === numeroBuscado) {
          linhas.splice(i, 1);
          workbook.Sheets[nomeAba] = XLSX.utils.aoa_to_sheet(linhas.length > 0 ? linhas : [CABECALHO_PADRAO]);
          boletoExcluido = true;
          break;
        }
      }

      if (boletoExcluido) {
        break;
      }
    }

    if (!boletoExcluido) {
      return false;
    }

    XLSX.writeFile(workbook, caminhoArquivo);
    return true;
  } catch (erro) {
    console.error('Erro ao excluir boleto da planilha:', erro);
    return false;
  }
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
    const arquivoExcel = montarNomeArquivoEmpresa(dados.empresa, anoArquivo);
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

export function listarPeriodosEmpresa(empresa: string): number[] {
  const empresaNormalizada = normalizarIdEmpresa(empresa);
  if (!empresaNormalizada) {
    return [];
  }

  const periodos = lerArquivosBoletos()
    .map(nomeArquivo => nomeArquivo.match(/^(.*?)(20\d{2})\.xlsx$/i))
    .filter(Boolean)
    .filter(match => normalizarIdEmpresa(match?.[1] || '') === empresaNormalizada)
    .map(match => Number(match?.[2]))
    .filter(ano => Number.isFinite(ano));

  return Array.from(new Set(periodos)).sort((a, b) => a - b);
}

export function criarPeriodoEmBranco({
  empresa,
  ano,
}: {
  empresa: string;
  ano: number;
}): { sucesso: true; arquivo: string } | { sucesso: false; erro: string } {
  try {
    if (!Number.isInteger(ano)) {
      return { sucesso: false, erro: 'Periodo invalido.' };
    }

    const empresaId = normalizarIdEmpresa(empresa);
    if (!empresaId) {
      return { sucesso: false, erro: 'Empresa invalida.' };
    }

    const diretorioBoletos = obterDiretorioBoletos();
    if (!fs.existsSync(diretorioBoletos)) {
      fs.mkdirSync(diretorioBoletos, { recursive: true });
    }

    const arquivo = montarNomeArquivoEmpresa(empresaId, ano);
    const caminhoArquivo = path.join(diretorioBoletos, arquivo);

    if (fs.existsSync(caminhoArquivo)) {
      return { sucesso: false, erro: 'Ja existe um arquivo para esse periodo.' };
    }

    const workbook = XLSX.utils.book_new();
    for (const mes of MESES_ABA) {
      const aba = XLSX.utils.aoa_to_sheet([CABECALHO_PADRAO]);
      XLSX.utils.book_append_sheet(workbook, aba, mes);
    }

    XLSX.writeFile(workbook, caminhoArquivo);
    return { sucesso: true, arquivo };
  } catch (erro) {
    console.error('Erro ao criar periodo em branco:', erro);
    return { sucesso: false, erro: 'Falha ao criar periodo em branco.' };
  }
}

function normalizarNomeAbaParaComparacao(nomeAba: string): string {
  return nomeAba
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function gerarWorkbookConsolidadoEmpresa(empresa: string): XLSX.WorkBook {
  const empresaId = normalizarIdEmpresa(empresa);
  const periodos = listarPeriodosEmpresa(empresaId);
  const workbookDestino = XLSX.utils.book_new();

  for (const ano of periodos) {
    const caminhoArquivo = obterCaminhoArquivoEmpresaAno(empresaId, ano);
    if (!fs.existsSync(caminhoArquivo)) {
      continue;
    }

    const workbookOrigem = XLSX.readFile(caminhoArquivo);

    for (const nomeAba of workbookOrigem.SheetNames) {
      const aba = workbookOrigem.Sheets[nomeAba];
      const linhas = XLSX.utils.sheet_to_json(aba, { header: 1 }) as unknown[][];
      if (!linhas || linhas.length === 0) {
        continue;
      }

      const nomeAbaConsolidada = `${ano}-${normalizarNomeAbaParaComparacao(nomeAba).slice(0, 20)}`;
      const abaDestino = XLSX.utils.aoa_to_sheet(linhas);
      XLSX.utils.book_append_sheet(workbookDestino, abaDestino, nomeAbaConsolidada.slice(0, 31));
    }
  }

  if (workbookDestino.SheetNames.length === 0) {
    const abaVazia = XLSX.utils.aoa_to_sheet([CABECALHO_PADRAO]);
    XLSX.utils.book_append_sheet(workbookDestino, abaVazia, 'DADOS');
  }

  return workbookDestino;
}

function limparDadosWorkbook(workbook: XLSX.WorkBook) {
  for (const nomeAba of workbook.SheetNames) {
    const aba = workbook.Sheets[nomeAba];
    const linhas = XLSX.utils.sheet_to_json(aba, { header: 1 }) as unknown[][];
    const indiceCabecalho = encontrarLinhaCabecalho(linhas);

    if (indiceCabecalho === -1) {
      workbook.Sheets[nomeAba] = XLSX.utils.aoa_to_sheet([CABECALHO_PADRAO]);
      continue;
    }

    const linhasMantidas = linhas.slice(0, indiceCabecalho + 1);
    workbook.Sheets[nomeAba] = XLSX.utils.aoa_to_sheet(linhasMantidas.length > 0 ? linhasMantidas : [CABECALHO_PADRAO]);
  }
}

export function duplicarPeriodoExcel({
  empresa,
  anoOrigem,
  anoDestino,
  limparDados = true,
}: {
  empresa: string;
  anoOrigem: number;
  anoDestino: number;
  limparDados?: boolean;
}): { sucesso: true; arquivo: string } | { sucesso: false; erro: string } {
  try {
    if (!Number.isInteger(anoOrigem) || !Number.isInteger(anoDestino)) {
      return { sucesso: false, erro: 'Periodo invalido.' };
    }

    if (anoOrigem === anoDestino) {
      return { sucesso: false, erro: 'Periodo de origem e destino devem ser diferentes.' };
    }

    const empresaId = normalizarIdEmpresa(empresa);
    if (!empresaId) {
      return { sucesso: false, erro: 'Empresa invalida.' };
    }

    const diretorioBoletos = obterDiretorioBoletos();
    const arquivoOrigem = montarNomeArquivoEmpresa(empresaId, anoOrigem);
    const arquivoDestino = montarNomeArquivoEmpresa(empresaId, anoDestino);
    const caminhoOrigem = path.join(diretorioBoletos, arquivoOrigem);
    const caminhoDestino = path.join(diretorioBoletos, arquivoDestino);

    if (!fs.existsSync(caminhoOrigem)) {
      return { sucesso: false, erro: 'Arquivo de origem nao encontrado.' };
    }

    if (fs.existsSync(caminhoDestino)) {
      return { sucesso: false, erro: 'Ja existe um arquivo para o periodo de destino.' };
    }

    const workbook = XLSX.readFile(caminhoOrigem);
    if (limparDados) {
      limparDadosWorkbook(workbook);
    }

    XLSX.writeFile(workbook, caminhoDestino);
    return { sucesso: true, arquivo: arquivoDestino };
  } catch (erro) {
    console.error('Erro ao duplicar periodo de Excel:', erro);
    return { sucesso: false, erro: 'Falha ao duplicar arquivo de periodo.' };
  }
}
