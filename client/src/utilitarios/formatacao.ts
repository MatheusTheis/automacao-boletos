export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

export function formatarDataIso(dataIso: string): string {
  if (!dataIso) {
    return '-';
  }

  try {
    const data = new Date(dataIso);
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  } catch {
    return '-';
  }
}

export function mascararNumero(quantidade: number): string {
  return '*'.repeat(Math.max(3, String(quantidade).length));
}

export function mascararMoeda(): string {
  return 'R$ *****';
}
