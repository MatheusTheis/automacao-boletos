export function carregarHistoricoClientes(chave: string): string[] {
  return JSON.parse(localStorage.getItem(chave) || '[]');
}

export function salvarClienteNoHistorico(chave: string, cliente: string): string[] {
  let historico = carregarHistoricoClientes(chave);
  historico = historico.filter(item => item !== cliente);
  historico.unshift(cliente);
  historico = historico.slice(0, 3);
  localStorage.setItem(chave, JSON.stringify(historico));
  return historico;
}

export function carregarUltimoValor(chave: string): string {
  return localStorage.getItem(chave) || '';
}

export function salvarUltimoValor(chave: string, valor: string): void {
  localStorage.setItem(chave, valor);
}
