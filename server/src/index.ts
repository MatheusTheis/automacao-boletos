import express from 'express';
import cors from 'cors';
import path from 'path';
import dayjs from 'dayjs';
import { gerarPdfAtrasos } from './servicos/geracao-pdf-atrasos.js';
import { calcularResumo, lerArquivosBoletos, lerBoletos, obterDiretorioBoletos } from './servicos/leitura-planilhas.js';
import { marcarComoPago, registrarNovoBoleto } from './servicos/escrita-planilhas.js';
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
      const empresa = arquivo.toUpperCase().includes('CEMAVI') ? 'CEMAVI' : 'MB';
      todosBoletos = todosBoletos.concat(lerBoletos(caminhoArquivo, empresa));
    }

    cache = { boletos: todosBoletos, timestamp: agora };
    return todosBoletos;
  } catch (erro) {
    console.error('Erro ao carregar boletos:', erro);
    return [];
  }
}

function calcularEstatisticasEmpresa(empresa: Empresa) {
  const boletos = obterBoletos().filter(boleto => boleto.empresa === empresa);
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

app.get('/api/boletos', (req, res) => {
  try {
    let boletos = obterBoletos();
    const { empresa, mes, status, q, sort = 'vencimento', dir = 'asc', page = '1', pageSize = '50' } = req.query;

    if (empresa && typeof empresa === 'string') {
      const empresaNormalizada = empresa.trim().toUpperCase();
      if (empresaNormalizada === 'CEMAVI' || empresaNormalizada === 'MB') {
        boletos = boletos.filter(boleto => boleto.empresa === empresaNormalizada);
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
    const empresaNormalizada = empresa?.trim().toUpperCase();

    if (empresaNormalizada !== 'CEMAVI' && empresaNormalizada !== 'MB') {
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

app.get('/api/meses', (req, res) => {
  try {
    let boletos = obterBoletos();
    const empresa = req.query.empresa;

    if (typeof empresa === 'string') {
      const empresaNormalizada = empresa.trim().toUpperCase();
      if (empresaNormalizada === 'CEMAVI' || empresaNormalizada === 'MB') {
        boletos = boletos.filter(boleto => boleto.empresa === empresaNormalizada);
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
    const empresa = req.params.empresa?.trim().toUpperCase();
    if (empresa !== 'CEMAVI' && empresa !== 'MB') {
      return res.status(400).json({ erro: 'Empresa invalida' });
    }

    return res.json(calcularEstatisticasEmpresa(empresa));
  } catch (erro) {
    console.error('Erro ao obter estatisticas:', erro);
    return res.status(500).json({ erro: 'Erro ao obter estatisticas' });
  }
});

app.get('/api/boletos/atrasos.pdf', (_req, res) => {
  try {
    const boletos = obterBoletos();
    const dataArquivo = dayjs().format('YYYY-MM-DD');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="boletos_atrasados_${dataArquivo}.pdf"`);
    gerarPdfAtrasos(boletos).pipe(res);
  } catch (erro) {
    console.error('Erro ao gerar PDF:', erro);
    res.status(500).json({ erro: 'Erro ao gerar PDF de boletos em atraso' });
  }
});

app.post('/api/boletos/marcar-pago', (req, res) => {
  try {
    const { nossoNumero, empresa, dataPagamento, valorPago } = req.body;

    if (!nossoNumero || !empresa || !dataPagamento) {
      return res.status(400).json({ erro: 'Dados incompletos' });
    }

    const boleto = obterBoletos().find(
      item =>
        item.nossoNumero.replace(/[.\-\s]/g, '') === nossoNumero.replace(/[.\-\s]/g, '') &&
        item.empresa === empresa
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

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em http://${HOST}:${PORT}`);
  console.log(`API disponivel em http://${HOST}:${PORT}/api/boletos`);
});
