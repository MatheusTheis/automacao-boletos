export function aplicarMascaraData(valor: string): string {
  const numeros = valor.replace(/\D/g, '').slice(0, 8);

  if (numeros.length >= 5) {
    return numeros.replace(/(\d{2})(\d{2})(\d{0,4})/, '$1/$2/$3');
  }

  if (numeros.length >= 3) {
    return numeros.replace(/(\d{2})(\d{0,2})/, '$1/$2');
  }

  return numeros;
}

export function aplicarMascaraNossoNumero(valor: string, prefixo: string, tamanhoCorpo: number): string {
  const corpo = valor.replace(new RegExp(`^${prefixo}`), '').replace(/\D/g, '').slice(0, tamanhoCorpo);
  const partePrincipal = corpo.slice(0, tamanhoCorpo - 2);
  const digito = corpo.slice(tamanhoCorpo - 2, tamanhoCorpo);

  let resultado = `${prefixo}${partePrincipal}`;

  if (corpo.length > tamanhoCorpo - 2) {
    resultado += `-${digito}`;
  }

  return resultado;
}
