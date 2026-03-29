const parametrosBusca = new URLSearchParams(window.location.search);

const URL_BASE_API =
  parametrosBusca.get('apiBase') ||
  (window.location.protocol === 'file:' ? 'http://127.0.0.1:3001' : '');

export function montarUrlApi(caminho: string): string {
  return `${URL_BASE_API}${caminho}`;
}
