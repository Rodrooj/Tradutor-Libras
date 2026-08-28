# Análise dos Requisitos do Projeto

## Objetivo
O protótipo deve utilizar a câmera de um dispositivo comum para reconhecer sinais de Língua Brasileira de Sinais (Libras) em tempo real e convertê-los em texto e áudio por síntese de voz.

## Funcionalidades obrigatórias

| Requisito | Implementação no projeto |
| --- | --- |
| Captura de vídeo | Câmera do navegador com `getUserMedia`. |
| Rastreamento corporal | MediaPipe Pose com landmarks corporais. |
| Classificação | Modelo LSTM executado localmente com TensorFlow.js. |
| Exibição do resultado | Predição e confiança renderizadas na interface. |
| Síntese de voz | Web Speech API em português brasileiro. |

## Diretrizes técnicas
O processamento local reduz a necessidade de enviar imagens para um servidor e mantém o pipeline adequado para uma experiência de baixa latência. O fluxo esperado é captura, extração de landmarks, normalização, acumulação de uma janela temporal, classificação e síntese de voz.

## Pontos de atenção identificados
A acurácia obtida com dados sintéticos não representa o desempenho em uso real. A validação futura deve incluir participantes diferentes, variações de iluminação, distância da câmera, lateralidade e sinais executados em velocidades distintas. Também é necessário avaliar falsos positivos e falsos negativos por classe, em vez de considerar apenas a acurácia global.

## Melhorias aplicadas nesta iteração
1. O carregamento de assets passou a validar respostas HTTP antes de tentar interpretar JSON.
2. A inferência passou a liberar os tensores de entrada e saída mesmo quando o modelo lança uma exceção.
3. O modelo e a interface passaram a reconhecer explicitamente a classe `Parado`.
4. A interface recebeu descrições ARIA nos controles e na visualização de landmarks.
5. O treinamento passou a gerar métricas de precisão, recall e F1 por classe.

## Próximos passos
A evolução mais importante é substituir o dataset sintético por dados reais rotulados e separar treino, validação e teste por pessoa, evitando que sequências do mesmo participante apareçam em conjuntos diferentes.

Documento atualizado em 28 de agosto de 2026.

## Referência
- Documento de escopo do projeto: `docs/Projet AT1N2.pdf`.
- Documentação técnica do repositório: `docs/DOCUMENTACAO_TECNICA.md`.
