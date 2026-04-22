import express from 'express';
import cors from 'cors';
import path from 'path';
import dayjs from 'dayjs';
import { gerarPdfAtrasos } from './servicos/geracao-pdf-atrasos.js';
import { calcularResumo, lerArquivosBoletos, lerBoletos, obterDiretorioBoletos } from './servicos/leitura-planilhas.js';
import {
  criarPeriodoEmBranco,
  desmarcarComoPago,
  duplicarPeriodoExcel,
  excluirBoletoDaPlanilha,
  gerarWorkbookConsolidadoEmpresa,
  listarPeriodosEmpresa,
  obterCaminhoArquivoEmpresaAno,
  marcarComoPago,
  registrarNovoBoleto,
} from './servicos/escrita-planilhas.js';
import { cadastrarEmpresaComConfiguracao, listarEmpresas, normalizarIdEmpresa } from './servicos/empresas.js';
import XLSX from 'xlsx';
import fs from 'fs';
import { Boleto, Empresa, RespostaBoletos } from './tipos/boletos.js';

const app = express();
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3001);
const CACHE_TTL = 10000;

let cache: { boletos: Boleto[]; timestamp: number } | null = null;

app.use(cors());
app.use(express.json());

function obterBoletos(): Boleto[] {
  const agora = Date.now();
  if (cache && agora - cache.timestamp < CACHE_TTL) {
    return cache.boletos;
  }

  const diretorioBoletos = obterDiretorioBoletos();

  try {
    const arquivos = lerArquivosBoletos();
    let todosBoletos: Boleto[] = [];

    for (const arquivo of arquivos) {
      const caminhoArquivo = path.join(diretorioBoletos, arquivo);
      const match = arquivo.match(/^(.*?)(20\d{2})\.xlsx$/i);
      if (!match) continue;

      const empresa = normalizarIdEmpresa(match[1] || '');
      const ano = Number(match[2]);
      if (!empresa) continue;
      if (!Number.isFinite(ano)) continue;

      todosBoletos = todosBoletos.concat(lerBoletos(caminhoArquivo, empresa, ano));
    }

    cache = { boletos: todosBoletos, timestamp: agora };
    return todosBoletos;
  } catch (erro) {
    console.error('Erro ao carregar boletos:', erro);
    return [];
  }
}

function calcularEstatisticasEmpresa(empresa: Empresa, ano?: number) {
  const boletos = obterBoletos().filter(
    boleto => boleto.empresa === empresa && (ano === undefined || boleto.ano === ano)
  );
  return {
    abertos: boletos.filter(boleto => boleto.status === 'em_aberto').length,
    pagos: boletos.filter(boleto => boleto.status === 'pago').length,
    vencendo: boletos.filter(boleto => boleto.status === 'vence_hoje').length,
    vencidos: boletos.filter(boleto => boleto.status === 'atrasado').length,
  };
}

function obterValorOrdenacao(boleto: Boleto, campo: string): number | string {
  switch (campo) {
    case 'cliente':
      return boleto.cliente.toLowerCase();
    case 'nossoNumero':
      return boleto.nossoNumero.toLowerCase();
    case 'valor':
      return boleto.valor;
    case 'emissao':
      return boleto.emissao ? new Date(boleto.emissao).getTime() : 0;
    case 'situacao':
      return (boleto.situacao || '').toLowerCase();
    case 'status':
      return boleto.status;
    default:
      return new Date(boleto.vencimento).getTime();
  }
}

function normalizarNossoNumero(valor: string): string {
  return valor.replace(/[.\-\s]/g, '');
}

function normalizarEmpresa(valor: string): string {
  return normalizarIdEmpresa(valor);
}

app.get('/api/empresas', (_req, res) => {
  try {
    const empresas = listarEmpresas();
    return res.json(empresas);
  } catch (erro) {
    console.error('Erro ao listar empresas:', erro);
    return res.status(500).json({ erro: 'Erro ao listar empresas' });
  }
});

app.post('/api/empresas', (req, res) => {
  try {
    const { nome, camposPadrao, tabelas } = req.body || {};
    const resultado = cadastrarEmpresaComConfiguracao({
      nome: typeof nome === 'string' ? nome : '',
      camposPadrao: Array.isArray(camposPadrao) ? camposPadrao : undefined,
      tabelas: Array.isArray(tabelas) ? tabelas : undefined,
    });

    if (!resultado.sucesso) {
      return res.status(400).json({ erro: resultado.erro });
    }

    return res.status(201).json(resultado);
  } catch (erro) {
    console.error('Erro ao cadastrar empresa:', erro);
    return res.status(500).json({ erro: 'Erro ao cadastrar empresa' });
  }
});

app.get('/api/boletos', (req, res) => {
  try {
    let boletos = obterBoletos();
    const { empresa, ano, mes, status, q, sort = 'vencimento', dir = 'asc', page = '1', pageSize = '50' } = req.query;

    if (empresa && typeof empresa === 'string') {
      const empresaNormalizada = normalizarEmpresa(empresa);
      if (empresaNormalizada) {
        boletos = boletos.filter(boleto => boleto.empresa === empresaNormalizada);
      }
    }

    if (typeof ano === 'string' && ano.trim().length > 0) {
      const anoNumerico = Number.parseInt(ano, 10);
      if (!Number.isNaN(anoNumerico)) {
        boletos = boletos.filter(boleto => boleto.ano === anoNumerico);
      }
    }

    if (mes && typeof mes === 'string') {
      boletos = boletos.filter(boleto => boleto.mesAba === mes.trim().toUpperCase());
    }

    if (status && typeof status === 'string') {
      boletos = boletos.filter(boleto => boleto.status === status);
    }

    if (q && typeof q === 'string') {
      const termo = q.toLowerCase();
      boletos = boletos.filter(
        boleto => boleto.cliente.toLowerCase().includes(termo) || boleto.nossoNumero.toLowerCase().includes(termo)
      );
    }

    const direcao = dir === 'desc' ? -1 : 1;
    boletos.sort((primeiro, segundo) => {
      const valorA = obterValorOrdenacao(primeiro, sort as string);
      const valorB = obterValorOrdenacao(segundo, sort as string);

      if (valorA < valorB) return -1 * direcao;
      if (valorA > valorB) return 1 * direcao;
      return 0;
    });

    const resumo = calcularResumo(boletos);
    const paginaAtual = parseInt(page as string, 10) || 1;
    const tamanhoPagina = parseInt(pageSize as string, 10) || 50;
    const total = boletos.length;
    const totalPaginas = Math.ceil(total / tamanhoPagina);
    const inicio = (paginaAtual - 1) * tamanhoPagina;
    const boletosPaginados = boletos.slice(inicio, inicio + tamanhoPagina);

    const resposta: RespostaBoletos = {
      boletos: boletosPaginados,
      resumo,
      pagination: {
        page: paginaAtual,
        pageSize: tamanhoPagina,
        total,
        totalPages: totalPaginas,
      },
    };

    res.json(resposta);
  } catch (erro) {
    console.error('Erro ao listar boletos:', erro);
    res.status(500).json({ erro: 'Erro ao processar boletos' });
  }
});

app.post('/api/boletos', (req, res) => {
  try {
    const { empresa, cliente, nosso, valor, emiss, venc } = req.body;
    const empresaNormalizada = normalizarEmpresa(empresa || '');

    if (!empresaNormalizada) {
      return res.status(400).json({ erro: 'Empresa invalida' });
    }

    if (!cliente || !nosso || !valor || !emiss || !venc) {
      return res.status(400).json({ erro: 'Dados obrigatorios nao informados' });
    }

    const resultado = registrarNovoBoleto({
      empresa: empresaNormalizada,
      cliente,
      nossoNumero: nosso,
      valor,
      emissao: emiss,
      vencimento: venc,
    });

    if (!resultado.sucesso) {
      return res.status(400).json({ erro: resultado.erro });
    }

    cache = null;
    return res.status(201).json(resultado);
  } catch (erro) {
    console.error('Erro ao registrar boleto:', erro);
    return res.status(500).json({ erro: 'Erro ao registrar boleto' });
  }
});

app.delete('/api/boletos', (req, res) => {
  try {
    const { nossoNumero, empresa, vencimento } = req.body;
    const empresaNormalizada = normalizarEmpresa(empresa || '');

    if (!nossoNumero || !empresaNormalizada) {
      return res.status(400).json({ erro: 'Dados incompletos' });
    }

    const boleto = obterBoletos().find(
      item =>
        normalizarNossoNumero(item.nossoNumero) === normalizarNossoNumero(nossoNumero) &&
        item.empresa === empresaNormalizada &&
        (!vencimento || item.vencimento === vencimento)
    );

    if (!boleto) {
      return res.status(404).json({ erro: 'Boleto nao encontrado' });
    }

    const sucesso = excluirBoletoDaPlanilha(boleto);
    if (!sucesso) {
      return res.status(500).json({ erro: 'Erro ao excluir boleto' });
    }

    cache = null;
    return res.json({ sucesso: true, mensagem: 'Boleto excluido com sucesso' });
  } catch (erro) {
    console.error('Erro ao excluir boleto:', erro);
    return res.status(500).json({ erro: 'Erro ao excluir boleto' });
  }
});

app.get('/api/meses', (req, res) => {
  try {
    let boletos = obterBoletos();
    const empresa = req.query.empresa;
    const ano = req.query.ano;

    if (typeof empresa === 'string') {
      const empresaNormalizada = normalizarEmpresa(empresa);
      if (empresaNormalizada) {
        boletos = boletos.filter(boleto => boleto.empresa === empresaNormalizada);
      }
    }

    if (typeof ano === 'string' && ano.trim().length > 0) {
      const anoNumerico = Number.parseInt(ano, 10);
      if (!Number.isNaN(anoNumerico)) {
        boletos = boletos.filter(boleto => boleto.ano === anoNumerico);
      }
    }

    const meses = [...new Set(boletos.map(boleto => boleto.mesAba))];
    res.json(meses);
  } catch (erro) {
    console.error('Erro ao obter meses:', erro);
    res.status(500).json({ erro: 'Erro ao obter meses' });
  }
});

app.get('/api/estatisticas/:empresa', (req, res) => {
  try {
    const empresa = normalizarEmpresa(req.params.empresa || '');
    const anoQuery = typeof req.query.ano === 'string' ? Number.parseInt(req.query.ano, 10) : NaN;
    const ano = Number.isNaN(anoQuery) ? undefined : anoQuery;
    if (!empresa) {
      return res.status(400).json({ erro: 'Empresa invalida' });
    }

    return res.json(calcularEstatisticasEmpresa(empresa, ano));
  } catch (erro) {
    console.error('Erro ao obter estatisticas:', erro);
    return res.status(500).json({ erro: 'Erro ao obter estatisticas' });
  }
});

app.get('/api/boletos/atrasos.pdf', (req, res) => {
  try {
    let boletos = obterBoletos();
    const empresa = typeof req.query.empresa === 'string' ? normalizarEmpresa(req.query.empresa) : '';
    const ano = typeof req.query.ano === 'string' ? Number.parseInt(req.query.ano, 10) : NaN;

    if (empresa) {
      boletos = boletos.filter(boleto => boleto.empresa === empresa);
    }
    if (!Number.isNaN(ano)) {
      boletos = boletos.filter(boleto => boleto.ano === ano);
    }

    const dataArquivo = dayjs().format('YYYY-MM-DD');
    res.setHeader('Content-Type', 'application/pdf');
    const sufixoEmpresa = empresa ? `_${empresa.toLowerCase()}` : '';
    const sufixoAno = !Number.isNaN(ano) ? `_${ano}` : '';
    res.setHeader('Content-Disposition', `attachment; filename="boletos_atrasados${sufixoEmpresa}${sufixoAno}_${dataArquivo}.pdf"`);
    gerarPdfAtrasos(boletos).pipe(res);
  } catch (erro) {
    console.error('Erro ao gerar PDF:', erro);
    res.status(500).json({ erro: 'Erro ao gerar PDF de boletos em atraso' });
  }
});

app.post('/api/boletos/marcar-pago', (req, res) => {
  try {
    const { nossoNumero, empresa, dataPagamento, valorPago, vencimento } = req.body;
    const empresaNormalizada = normalizarEmpresa(empresa || '');
    const anoVencimento =
      typeof vencimento === 'string' && vencimento.trim().length > 0
        ? new Date(vencimento).getFullYear()
        : undefined;

    if (!nossoNumero || !empresaNormalizada || !dataPagamento) {
      return res.status(400).json({ erro: 'Dados incompletos' });
    }

    const boleto = obterBoletos().find(
      item =>
        normalizarNossoNumero(item.nossoNumero) === normalizarNossoNumero(nossoNumero) &&
        item.empresa === empresaNormalizada &&
        (anoVencimento === undefined || item.ano === anoVencimento)
    );

    if (!boleto) {
      return res.status(404).json({ erro: 'Boleto nao encontrado' });
    }

    const sucesso = marcarComoPago(boleto, dataPagamento, valorPago);
    if (!sucesso) {
      return res.status(500).json({ erro: 'Erro ao marcar boleto como pago' });
    }

    cache = null;
    return res.json({ sucesso: true, mensagem: 'Boleto marcado como pago com sucesso' });
  } catch (erro) {
    console.error('Erro ao marcar boleto como pago:', erro);
    return res.status(500).json({ erro: 'Erro ao marcar boleto como pago' });
  }
});

app.post('/api/boletos/desmarcar-pago', (req, res) => {
  try {
    const { nossoNumero, empresa, vencimento } = req.body;
    const empresaNormalizada = normalizarEmpresa(empresa || '');
    const anoVencimento =
      typeof vencimento === 'string' && vencimento.trim().length > 0
        ? new Date(vencimento).getFullYear()
        : undefined;

    if (!nossoNumero || !empresaNormalizada) {
      return res.status(400).json({ erro: 'Dados incompletos' });
    }

    const boleto = obterBoletos().find(
      item =>
        normalizarNossoNumero(item.nossoNumero) === normalizarNossoNumero(nossoNumero) &&
        item.empresa === empresaNormalizada &&
        (anoVencimento === undefined || item.ano === anoVencimento)
    );

    if (!boleto) {
      return res.status(404).json({ erro: 'Boleto nao encontrado' });
    }

    const sucesso = desmarcarComoPago(boleto);
    if (!sucesso) {
      return res.status(500).json({ erro: 'Erro ao desmarcar boleto como pago' });
    }

    cache = null;
    return res.json({ sucesso: true, mensagem: 'Boleto desmarcado como pago com sucesso' });
  } catch (erro) {
    console.error('Erro ao desmarcar boleto como pago:', erro);
    return res.status(500).json({ erro: 'Erro ao desmarcar boleto como pago' });
  }
});

app.get('/api/excel/periodos', (req, res) => {
  try {
    const empresa = normalizarEmpresa(typeof req.query.empresa === 'string' ? req.query.empresa : '');
    if (!empresa) {
      return res.status(400).json({ erro: 'Empresa invalida' });
    }

    return res.json({ empresa, periodos: listarPeriodosEmpresa(empresa) });
  } catch (erro) {
    console.error('Erro ao listar periodos do Excel:', erro);
    return res.status(500).json({ erro: 'Erro ao listar periodos do Excel' });
  }
});

app.post('/api/excel/duplicar', (req, res) => {
  try {
    const { empresa, anoOrigem, anoDestino, limparDados = true } = req.body || {};
    const empresaNormalizada = normalizarEmpresa(typeof empresa === 'string' ? empresa : '');
    const origem = Number(anoOrigem);
    const destino = Number(anoDestino);

    if (!empresaNormalizada || !Number.isInteger(origem) || !Number.isInteger(destino)) {
      return res.status(400).json({ erro: 'Dados invalidos para duplicacao do Excel' });
    }

    const resultado = duplicarPeriodoExcel({
      empresa: empresaNormalizada,
      anoOrigem: origem,
      anoDestino: destino,
      limparDados: Boolean(limparDados),
    });

    if (!resultado.sucesso) {
      return res.status(400).json({ erro: resultado.erro });
    }

    cache = null;
    return res.status(201).json(resultado);
  } catch (erro) {
    console.error('Erro ao duplicar periodo de Excel:', erro);
    return res.status(500).json({ erro: 'Erro ao duplicar periodo de Excel' });
  }
});

app.post('/api/excel/novo-periodo', (req, res) => {
  try {
    const { empresa, anoBase, novoAno } = req.body || {};
    const empresaNormalizada = normalizarEmpresa(typeof empresa === 'string' ? empresa : '');
    const destino = Number(novoAno);

    if (!empresaNormalizada || !Number.isInteger(destino)) {
      return res.status(400).json({ erro: 'Dados invalidos para criacao de novo periodo' });
    }

    const periodos = listarPeriodosEmpresa(empresaNormalizada);
    if (periodos.length === 0) {
      return res.status(400).json({ erro: 'Nenhum periodo base encontrado para duplicacao.' });
    }

    const origem =
      Number.isInteger(Number(anoBase)) && periodos.includes(Number(anoBase))
        ? Number(anoBase)
        : Math.max(...periodos);

    const resultado = duplicarPeriodoExcel({
      empresa: empresaNormalizada,
      anoOrigem: origem,
      anoDestino: destino,
      limparDados: true,
    });

    if (!resultado.sucesso) {
      return res.status(400).json({ erro: resultado.erro });
    }

    cache = null;
    return res.status(201).json({ ...resultado, anoOrigem: origem, anoDestino: destino });
  } catch (erro) {
    console.error('Erro ao criar novo periodo de Excel:', erro);
    return res.status(500).json({ erro: 'Erro ao criar novo periodo de Excel' });
  }
});

app.post('/api/excel/periodo-em-branco', (req, res) => {
  try {
    const { empresa, ano } = req.body || {};
    const empresaNormalizada = normalizarEmpresa(typeof empresa === 'string' ? empresa : '');
    const anoNumerico = Number(ano);

    if (!empresaNormalizada || !Number.isInteger(anoNumerico)) {
      return res.status(400).json({ erro: 'Dados invalidos para criacao de periodo em branco' });
    }

    const resultado = criarPeriodoEmBranco({
      empresa: empresaNormalizada,
      ano: anoNumerico,
    });

    if (!resultado.sucesso) {
      return res.status(400).json({ erro: resultado.erro });
    }

    cache = null;
    return res.status(201).json(resultado);
  } catch (erro) {
    console.error('Erro ao criar periodo em branco:', erro);
    return res.status(500).json({ erro: 'Erro ao criar periodo em branco' });
  }
});

app.get('/api/excel/download', (req, res) => {
  try {
    const empresa = typeof req.query.empresa === 'string' ? normalizarEmpresa(req.query.empresa) : '';
    const ano = typeof req.query.ano === 'string' ? req.query.ano.trim().toLowerCase() : '';

    if (!empresa) {
      return res.status(400).json({ erro: 'Empresa invalida' });
    }

    if (!ano || ano === 'todos') {
      const workbook = gerarWorkbookConsolidadoEmpresa(empresa);
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
      const nomeArquivo = `${empresa.toLowerCase()}_consolidado.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
      return res.send(buffer);
    }

    const anoNumerico = Number.parseInt(ano, 10);
    if (Number.isNaN(anoNumerico)) {
      return res.status(400).json({ erro: 'Ano invalido para download' });
    }

    const caminhoArquivo = obterCaminhoArquivoEmpresaAno(empresa, anoNumerico);
    if (!fs.existsSync(caminhoArquivo)) {
      return res.status(404).json({ erro: 'Arquivo do periodo nao encontrado' });
    }

    const nomeArquivo = `${empresa.toLowerCase()}_${anoNumerico}.xlsx`;
    return res.download(caminhoArquivo, nomeArquivo);
  } catch (erro) {
    console.error('Erro ao baixar arquivo Excel:', erro);
    return res.status(500).json({ erro: 'Erro ao baixar arquivo Excel' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em http://${HOST}:${PORT}`);
  console.log(`API disponivel em http://${HOST}:${PORT}/api/boletos`);
});
