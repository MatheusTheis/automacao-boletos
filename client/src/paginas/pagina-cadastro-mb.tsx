import FormularioCadastroBoleto from '../componentes/cadastro/formulario-cadastro-boleto';

export default function PaginaCadastroMb() {
  return (
    <FormularioCadastroBoleto
      configuracao={{
        empresa: 'MB',
        tituloPagina: 'Registrar Boleto - MB',
        descricaoPagina: 'Preencha os dados do novo boleto MB',
        rotaAlternativa: '/cemavi',
        textoBotaoAlternativo: 'Ir para CEMAVI',
        prefixoNossoNumero: '0000',
        tamanhoCorpoNossoNumero: 6,
        classesTema: {
          primario: 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500',
          foco: 'focus:ring-purple-500 focus:border-purple-500',
          secundario: 'bg-green-600 hover:bg-green-700',
        },
      }}
    />
  );
}
