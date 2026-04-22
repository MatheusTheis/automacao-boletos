import fs from 'fs';
import path from 'path';
import { EmpresaSistema } from '../tipos/boletos.js';
import { lerArquivosBoletos, obterDiretorioBoletos } from './leitura-planilhas.js';

const NOME_ARQUIVO_EMPRESAS = 'empresas.json';

export function normalizarIdEmpresa(valor: string): string {
  return valor
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function obterCaminhoArquivoEmpresas(): string {
  return path.join(obterDiretorioBoletos(), NOME_ARQUIVO_EMPRESAS);
}

function lerEmpresasDoArquivo(): EmpresaSistema[] {
  const caminho = obterCaminhoArquivoEmpresas();
  if (!fs.existsSync(caminho)) {
    return [];
  }

  try {
    const conteudo = fs.readFileSync(caminho, 'utf-8');
    const dados = JSON.parse(conteudo) as EmpresaSistema[];

    if (!Array.isArray(dados)) {
      return [];
    }

    return dados
      .filter(item => typeof item?.id === 'string' && typeof item?.nome === 'string')
      .map(item => ({
        id: normalizarIdEmpresa(item.id),
        nome: item.nome.trim(),
        camposPadrao: Array.isArray(item.camposPadrao) ? item.camposPadrao.filter(campo => typeof campo === 'string') : undefined,
        tabelas: Array.isArray(item.tabelas) ? item.tabelas.filter(tabela => typeof tabela === 'string') : undefined,
      }))
      .filter(item => item.id.length > 0 && item.nome.length > 0);
  } catch (erro) {
    console.error('Erro ao ler empresas cadastradas:', erro);
    return [];
  }
}

function salvarEmpresasNoArquivo(empresas: EmpresaSistema[]) {
  const diretorio = obterDiretorioBoletos();
  if (!fs.existsSync(diretorio)) {
    fs.mkdirSync(diretorio, { recursive: true });
  }

  const caminho = obterCaminhoArquivoEmpresas();
  fs.writeFileSync(caminho, JSON.stringify(empresas, null, 2), 'utf-8');
}

function formatarNomeEmpresaPorId(id: string): string {
  return id
    .split('_')
    .filter(parte => parte.length > 0)
    .map(parte => parte.charAt(0) + parte.slice(1).toLowerCase())
    .join(' ');
}

export function listarEmpresas(): EmpresaSistema[] {
  const mapa = new Map<string, EmpresaSistema>();
  const empresasArquivo = lerEmpresasDoArquivo();

  for (const empresa of empresasArquivo) {
    mapa.set(empresa.id, { ...empresa });
  }

  const arquivos = lerArquivosBoletos();
  for (const arquivo of arquivos) {
    const match = arquivo.match(/^(.*?)(20\d{2})\.xlsx$/i);
    if (!match) continue;

    const id = normalizarIdEmpresa(match[1] || '');
    if (!id || mapa.has(id)) continue;

    mapa.set(id, {
      id,
      nome: formatarNomeEmpresaPorId(id),
    });
  }

  return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function cadastrarEmpresa(nome: string): { sucesso: true; empresa: EmpresaSistema } | { sucesso: false; erro: string } {
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) {
    return { sucesso: false, erro: 'Nome da empresa nao informado.' };
  }

  const id = normalizarIdEmpresa(nomeLimpo);
  if (!id) {
    return { sucesso: false, erro: 'Nome da empresa invalido.' };
  }

  const empresas = listarEmpresas();
  const existente = empresas.find(empresa => empresa.id === id || empresa.nome.toUpperCase() === nomeLimpo.toUpperCase());
  if (existente) {
    return { sucesso: false, erro: 'Empresa ja cadastrada.' };
  }

  const atualizadas = [...empresas, { id, nome: nomeLimpo }].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  salvarEmpresasNoArquivo(atualizadas);

  return {
    sucesso: true,
    empresa: { id, nome: nomeLimpo },
  };
}

export function cadastrarEmpresaComConfiguracao({
  nome,
  camposPadrao,
  tabelas,
}: {
  nome: string;
  camposPadrao?: string[];
  tabelas?: string[];
}): { sucesso: true; empresa: EmpresaSistema } | { sucesso: false; erro: string } {
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) {
    return { sucesso: false, erro: 'Nome da empresa nao informado.' };
  }

  const id = normalizarIdEmpresa(nomeLimpo);
  if (!id) {
    return { sucesso: false, erro: 'Nome da empresa invalido.' };
  }

  const empresas = listarEmpresas();
  const existente = empresas.find(empresa => empresa.id === id || empresa.nome.toUpperCase() === nomeLimpo.toUpperCase());
  if (existente) {
    return { sucesso: false, erro: 'Empresa ja cadastrada.' };
  }

  const camposLimpos = (camposPadrao || [])
    .map(campo => campo.trim())
    .filter(campo => campo.length > 0);

  const tabelasLimpas = (tabelas || [])
    .map(tabela => tabela.trim())
    .filter(tabela => tabela.length > 0);

  const novaEmpresa: EmpresaSistema = {
    id,
    nome: nomeLimpo,
    camposPadrao: camposLimpos.length > 0 ? Array.from(new Set(camposLimpos)) : undefined,
    tabelas: tabelasLimpas.length > 0 ? Array.from(new Set(tabelasLimpas)) : undefined,
  };

  const atualizadas = [...empresas, novaEmpresa].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  salvarEmpresasNoArquivo(atualizadas);

  return {
    sucesso: true,
    empresa: novaEmpresa,
  };
}
