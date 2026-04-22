import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import BotaoAlternarTema from '../componentes/compartilhado/botao-alternar-tema';
import PainelEstatisticasCadastro from '../componentes/cadastro/painel-estatisticas-cadastro';
import { useEstatisticasEmpresa } from '../ganchos/use-estatisticas-empresa';
import { montarUrlApi } from '../servicos/api';
import { EmpresaSistema } from '../tipos/boletos';

interface DadosFormulario {
  empresa: string;
  cliente: string;
  nosso: string;
  valor: string;
  emiss: string;
  venc: string;
}

export default function PaginaCadastro() {
  const navigate = useNavigate();
  const campoCliente = useRef<HTMLInputElement>(null);
  const [novaEmpresa, setNovaEmpresa] = useState('');
  const [cadastrandoEmpresa, setCadastrandoEmpresa] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: 'success' | 'error' } | null>(null);
  const [dadosFormulario, setDadosFormulario] = useState<DadosFormulario>({
    empresa: '',
    cliente: '',
    nosso: '',
    valor: '',
    emiss: '',
    venc: '',
  });

  const { data: empresas = [], refetch: refetchEmpresas } = useQuery<EmpresaSistema[]>({
    queryKey: ['empresas'],
    queryFn: async () => {
      const resposta = await fetch(montarUrlApi('/api/empresas'));
      if (!resposta.ok) throw new Error('Erro ao buscar empresas');
      return resposta.json();
    },
  });

  const empresaSelecionada = useMemo(() => {
    if (dadosFormulario.empresa) return dadosFormulario.empresa;
    return empresas[0]?.id || '';
  }, [dadosFormulario.empresa, empresas]);

  const estatisticas = useEstatisticasEmpresa(empresaSelecionada);

  const atualizarCampo = (campo: keyof DadosFormulario, valor: string) => {
    setDadosFormulario(atual => ({ ...atual, [campo]: valor }));
  };

  const cadastrarEmpresa = async () => {
    const nome = novaEmpresa.trim();
    if (!nome) {
      return;
    }

    try {
      setCadastrandoEmpresa(true);
      const resposta = await fetch(montarUrlApi('/api/empresas'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      });
      const resultado = await resposta.json();
      if (!resposta.ok) {
        setMensagem({ texto: resultado.erro || 'Erro ao cadastrar empresa.', tipo: 'error' });
        return;
      }

      setNovaEmpresa('');
      await refetchEmpresas();
      setDadosFormulario(atual => ({ ...atual, empresa: resultado.empresa.id }));
      setMensagem({ texto: `Empresa "${resultado.empresa.nome}" cadastrada com sucesso.`, tipo: 'success' });
    } catch (erro) {
      console.error('Erro ao cadastrar empresa:', erro);
      setMensagem({ texto: 'Erro ao cadastrar empresa.', tipo: 'error' });
    } finally {
      setCadastrandoEmpresa(false);
    }
  };

  const aoEnviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setMensagem(null);

    const empresa = dadosFormulario.empresa || empresas[0]?.id || '';
    if (!empresa) {
      setMensagem({ texto: 'Cadastre ou selecione uma empresa antes de registrar o boleto.', tipo: 'error' });
      return;
    }

    try {
      setCarregando(true);
      const resposta = await fetch(montarUrlApi('/api/boletos'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa,
          cliente: dadosFormulario.cliente,
          nosso: dadosFormulario.nosso,
          valor: dadosFormulario.valor,
          emiss: dadosFormulario.emiss,
          venc: dadosFormulario.venc,
        }),
      });

      const resultado = await resposta.json();
      if (!resposta.ok) {
        setMensagem({ texto: `Erro: ${resultado.erro || 'Falha ao registrar boleto.'}`, tipo: 'error' });
        return;
      }

      setMensagem({ texto: `Gravado em ${resultado.arquivo} > ${resultado.aba}`, tipo: 'success' });
      setDadosFormulario({
        empresa,
        cliente: '',
        nosso: '',
        valor: '',
        emiss: '',
        venc: '',
      });
      setTimeout(() => campoCliente.current?.focus(), 100);
    } catch (erro) {
      console.error('Erro ao registrar boleto:', erro);
      setMensagem({ texto: 'Erro ao conectar com o servidor.', tipo: 'error' });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 transition-colors duration-300 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Registrar Boleto</h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                Selecione a empresa e preencha os dados para criar um novo boleto.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <BotaoAlternarTema />
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white px-6 py-8 shadow dark:bg-slate-900 dark:shadow-black/20">
              <form onSubmit={aoEnviar} className="space-y-6">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Empresa *</label>
                    <select
                      value={dadosFormulario.empresa || empresas[0]?.id || ''}
                      onChange={evento => atualizarCampo('empresa', evento.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      {empresas.map(empresa => (
                        <option key={empresa.id} value={empresa.id}>
                          {empresa.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Nova empresa</label>
                    <div className="flex gap-2">
                      <input
                        value={novaEmpresa}
                        onChange={evento => setNovaEmpresa(evento.target.value)}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={cadastrarEmpresa}
                        disabled={cadastrandoEmpresa}
                        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Cliente *</label>
                  <input
                    ref={campoCliente}
                    required
                    value={dadosFormulario.cliente}
                    onChange={evento => atualizarCampo('cliente', evento.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Nosso Numero *</label>
                    <input
                      required
                      value={dadosFormulario.nosso}
                      onChange={evento => atualizarCampo('nosso', evento.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Valor *</label>
                    <input
                      required
                      value={dadosFormulario.valor}
                      onChange={evento => atualizarCampo('valor', evento.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Emissao *</label>
                    <input
                      required
                      value={dadosFormulario.emiss}
                      onChange={evento => atualizarCampo('emiss', evento.target.value)}
                      placeholder="DD/MM/AAAA"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">Vencimento *</label>
                    <input
                      required
                      value={dadosFormulario.venc}
                      onChange={evento => atualizarCampo('venc', evento.target.value)}
                      placeholder="DD/MM/AAAA"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={carregando}
                  className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {carregando ? 'Registrando...' : 'Registrar Boleto'}
                </button>
              </form>

              {mensagem && (
                <div
                  className={`mt-4 rounded-md p-4 ${
                    mensagem.tipo === 'success'
                      ? 'bg-green-50 text-green-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                      : 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200'
                  }`}
                >
                  <p className="text-sm font-medium">{mensagem.texto}</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <PainelEstatisticasCadastro empresa={empresaSelecionada || '-'} estatisticas={empresaSelecionada ? estatisticas : null} />
          </div>
        </div>
      </div>
    </div>
  );
}

