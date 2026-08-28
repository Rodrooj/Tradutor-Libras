# Melhorias e Correções

## Correções no núcleo

A limpeza do buffer de frames foi centralizada no método `FrameBuffer.shift(count)`, permitindo implementar janelas temporais sobrepostas sem chamar acidentalmente `getData()` como se ele removesse elementos. A inferência também utiliza blocos `try...finally` para liberar os tensores do TensorFlow.js em caminhos de sucesso e de erro.

O carregamento de `scaler.json` e `class_mapping.json` agora valida a propriedade `ok` das respostas HTTP antes de chamar `json()`. Falhas de rede ou respostas não-OK produzem mensagens específicas para facilitar o diagnóstico.

A classe `Parado` foi incluída no mapeamento de emojis e o número de classes do pipeline foi alinhado para 11, incluindo os dez sinais e o estado de repouso.

## Melhorias na interface

Os botões de iniciar câmera, parar câmera e ativar/desativar síntese de voz receberam `aria-label` e `aria-pressed`. O canvas de landmarks foi identificado com `role="img"` e uma descrição acessível. O alerta de erro ganhou um controle explícito para fechamento.

## Avaliação do modelo

O script de treinamento agora inclui precisão, recall e relatório de classificação por classe. O relatório é exibido no terminal e salvo em `public/classification_report.txt` durante a exportação dos artefatos.

## Validação

A suíte automatizada existente deve ser executada com:

```bash
pnpm exec vitest run
```

A avaliação de desempenho com dados sintéticos deve ser interpretada apenas como validação técnica do pipeline. Para medir generalização, o projeto precisa de dados reais e de uma divisão por participante.

Atualizado em 28 de agosto de 2026.
