import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';
import { Boleto } from '../tipos/boletos.js';

dayjs.extend(utc);
dayjs.extend(timezone);

interface BoletoComAtraso extends Boleto {
  diasEmAtraso: number;
}

function calcularDiasAtraso(vencimento: string): number {
  const hoje = dayjs().tz('America/Sao_Paulo').startOf('day');
  const dataVencimento = dayjs(vencimento).tz('America/Sao_Paulo').startOf('day');
  return hoje.diff(dataVencimento, 'day');
}

function formatarData(isoDate: string): string {
  return dayjs(isoDate).format('DD/MM/YYYY');
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

export function gerarPdfAtrasos(boletos: Boleto[]): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    bufferPages: true,
  });

  const grupos = boletos
    .filter(boleto => boleto.status === 'atrasado')
    .map(boleto => ({ ...boleto, diasEmAtraso: calcularDiasAtraso(boleto.vencimento) }))
    .reduce((acumulador, boleto) => {
      if (!acumulador.has(boleto.mesAba)) {
        acumulador.set(boleto.mesAba, []);
      }
      acumulador.get(boleto.mesAba)!.push(boleto);
      return acumulador;
    }, new Map<string, BoletoComAtraso[]>());

  const dataHoraGeracao = dayjs().tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm');
  doc.fontSize(18).font('Helvetica-Bold').text('Boletos em Atraso', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(`Gerado em ${dataHoraGeracao} (BRT)`, { align: 'center' });
  doc.moveDown(1.5);

  let totalGeralBoletos = 0;
  let totalGeralValor = 0;

  for (const [mesAba, boletosDoMes] of grupos.entries()) {
    totalGeralBoletos += boletosDoMes.length;
    totalGeralValor += boletosDoMes.reduce((soma, boleto) => soma + boleto.valor, 0);

    doc.fontSize(14).font('Helvetica-Bold').text(`Mes: ${mesAba}`, { underline: true });
    doc.moveDown(0.5);

    const topoTabela = doc.y;
    const colunas = { cliente: 140, nossoNumero: 80, valor: 70, emissao: 60, vencimento: 60, diasAtraso: 60 };
    let posicaoX = 50;

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('CLIENTE', posicaoX, topoTabela, { width: colunas.cliente });
    posicaoX += colunas.cliente;
    doc.text('NOSSO N°', posicaoX, topoTabela, { width: colunas.nossoNumero });
    posicaoX += colunas.nossoNumero;
    doc.text('VALOR', posicaoX, topoTabela, { width: colunas.valor, align: 'right' });
    posicaoX += colunas.valor;
    doc.text('EMISSAO', posicaoX, topoTabela, { width: colunas.emissao, align: 'center' });
    posicaoX += colunas.emissao;
    doc.text('VENCIMENTO', posicaoX, topoTabela, { width: colunas.vencimento, align: 'center' });
    posicaoX += colunas.vencimento;
    doc.text('DIAS ATRASO', posicaoX, topoTabela, { width: colunas.diasAtraso, align: 'center' });

    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(8);

    for (const boleto of boletosDoMes) {
      if (doc.y > 700) {
        doc.addPage();
        doc.y = 50;
      }

      const y = doc.y;
      posicaoX = 50;
      const cliente = boleto.cliente.length > 25 ? `${boleto.cliente.substring(0, 22)}...` : boleto.cliente;

      doc.text(cliente, posicaoX, y, { width: colunas.cliente });
      posicaoX += colunas.cliente;
      doc.text(boleto.nossoNumero, posicaoX, y, { width: colunas.nossoNumero });
      posicaoX += colunas.nossoNumero;
      doc.text(formatarMoeda(boleto.valor), posicaoX, y, { width: colunas.valor, align: 'right' });
      posicaoX += colunas.valor;
      doc.text(formatarData(boleto.emissao), posicaoX, y, { width: colunas.emissao, align: 'center' });
      posicaoX += colunas.emissao;
      doc.text(formatarData(boleto.vencimento), posicaoX, y, { width: colunas.vencimento, align: 'center' });
      posicaoX += colunas.vencimento;
      doc.text(boleto.diasEmAtraso.toString(), posicaoX, y, { width: colunas.diasAtraso, align: 'center' });
      doc.moveDown(0.8);
    }

    const totalMes = boletosDoMes.reduce((soma, boleto) => soma + boleto.valor, 0);
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text(`Total ${mesAba}: ${boletosDoMes.length} boleto(s) - ${formatarMoeda(totalMes)}`, 50);
    doc.moveDown(2);
  }

  if (grupos.size > 0) {
    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text(`TOTAL GERAL: ${totalGeralBoletos} boleto(s) em atraso - ${formatarMoeda(totalGeralValor)}`, 50, doc.y, {
      align: 'center',
    });
  } else {
    doc.fontSize(12).font('Helvetica').text('Nenhum boleto em atraso encontrado.', { align: 'center' });
  }

  const quantidadePaginas = doc.bufferedPageRange().count;
  for (let i = 0; i < quantidadePaginas; i += 1) {
    doc.switchToPage(i);
    doc.fontSize(8).font('Helvetica').text(`Pagina ${i + 1} de ${quantidadePaginas}`, 50, doc.page.height - 30, {
      align: 'center',
    });
  }

  doc.end();
  return doc;
}
