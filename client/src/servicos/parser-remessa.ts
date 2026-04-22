export interface RegistroRemessa {
  cliente: string;
  nossoNumero: string;
  valor: number;
  emissao: string;
  vencimento: string;
}

export interface ResultadoParseRemessa {
  registros: RegistroRemessa[];
  totalLinhasDetalhe: number;
  linhasInvalidas: number;
}

const POSICOES_REMESSA = {
  nossoNumeroInicio: 62,
  nossoNumeroTamanho: 10,
  vencimentoInicio: 120,
  vencimentoTamanho: 6,
  valorInicio: 126,
  valorTamanho: 13,
  emissaoInicio: 150,
  emissaoTamanho: 6,
  clienteInicio: 234,
  clienteTamanho: 40,
} as const;

function extrairCampo(linha: string, inicio: number, tamanho: number): string {
  if (linha.length < inicio + tamanho) {
    return '';
  }

  return linha.slice(inicio, inicio + tamanho).trim();
}

function converterDataDdmmaaParaIso(dataTexto: string): string | null {
  if (!/^\d{6}$/.test(dataTexto)) {
    return null;
  }

  const dia = Number.parseInt(dataTexto.slice(0, 2), 10);
  const mes = Number.parseInt(dataTexto.slice(2, 4), 10);
  const ano = 2000 + Number.parseInt(dataTexto.slice(4, 6), 10);

  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) {
    return null;
  }

  const data = new Date(ano, mes - 1, dia);
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) {
    return null;
  }

  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function converterValorCentavos(valorTexto: string): number | null {
  const apenasDigitos = valorTexto.replace(/\D/g, '');
  if (!apenasDigitos) {
    return null;
  }

  const valorEmCentavos = Number.parseInt(apenasDigitos, 10);
  if (!Number.isFinite(valorEmCentavos)) {
    return null;
  }

  return valorEmCentavos / 100;
}

function formatarNomeComIniciaisMaiusculas(nome: string): string {
  return nome
    .toLowerCase()
    .split(/\s+/)
    .filter(parte => parte.length > 0)
    .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ')
    .trim();
}

function montarRegistroDetalhe(linha: string): RegistroRemessa | null {
  const nossoNumero = extrairCampo(
    linha,
    POSICOES_REMESSA.nossoNumeroInicio,
    POSICOES_REMESSA.nossoNumeroTamanho
  );
  const vencimentoTexto = extrairCampo(linha, POSICOES_REMESSA.vencimentoInicio, POSICOES_REMESSA.vencimentoTamanho);
  const valorTexto = extrairCampo(linha, POSICOES_REMESSA.valorInicio, POSICOES_REMESSA.valorTamanho);
  const emissaoTexto = extrairCampo(linha, POSICOES_REMESSA.emissaoInicio, POSICOES_REMESSA.emissaoTamanho);
  const cliente = extrairCampo(linha, POSICOES_REMESSA.clienteInicio, POSICOES_REMESSA.clienteTamanho);

  if (!nossoNumero || !nossoNumero.startsWith('000')) {
    return null;
  }

  const vencimento = converterDataDdmmaaParaIso(vencimentoTexto);
  const emissao = converterDataDdmmaaParaIso(emissaoTexto);
  const valor = converterValorCentavos(valorTexto);

  if (!vencimento || !emissao || valor === null) {
    return null;
  }

  return {
    cliente: formatarNomeComIniciaisMaiusculas(cliente.trim()),
    nossoNumero: nossoNumero.trim(),
    valor,
    emissao,
    vencimento,
  };
}

export function parsearArquivoRemessa(conteudoArquivo: string): ResultadoParseRemessa {
  const linhas = conteudoArquivo
    .split(/\r?\n/)
    .map(linha => linha.replace(/\r/g, ''))
    .filter(linha => linha.trim().length > 0);

  if (linhas.length === 0) {
    return {
      registros: [],
      totalLinhasDetalhe: 0,
      linhasInvalidas: 0,
    };
  }

  const detalhes = linhas.filter(linha => linha.startsWith('1'));
  const registros: RegistroRemessa[] = [];

  for (const linha of detalhes) {
    const registro = montarRegistroDetalhe(linha);
    if (registro) {
      registros.push(registro);
    }
  }

  return {
    registros,
    totalLinhasDetalhe: detalhes.length,
    linhasInvalidas: detalhes.length - registros.length,
  };
}
