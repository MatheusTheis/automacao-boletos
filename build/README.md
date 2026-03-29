# Icone da Aplicacao

Para gerar o instalador com icone personalizado, adicione os arquivos desta pasta antes do build.

## Windows

- `icon.ico`: icone do sistema em formato ICO, preferencialmente em 256x256

## Como preparar

1. Crie uma imagem base em PNG com 512x512.
2. Converta para ICO.
3. Salve o arquivo como `icon.ico` nesta pasta.
4. Execute `npm run electron:build:win`.

Enquanto o arquivo nao existir, o Electron usara o icone padrao.
