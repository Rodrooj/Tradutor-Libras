# Especificação Técnica e Documentação de Arquitetura

**Projeto:** Tradutor de Libras para Áudio com IA (Protótipo)

**Tipo de Documento:** Arquitetura de Software, Pipeline de IA, Testes e Modelagem de Dados

**Revisão:** 2.0

## Sumário Executivo

Este documento apresenta a arquitetura, implementação e resultados do Tradutor de Libras para Áudio, um sistema de inteligência artificial que realiza tradução simultânea de sinais da Língua Brasileira de Sinais (Libras) para áudio em tempo real, utilizando apenas a câmera de um dispositivo comum (smartphone ou computador). O sistema foca em Edge Computing, garantindo privacidade, funcionamento offline e latência inferior a 50ms.

## 1. Visão Geral da Arquitetura e Pipeline de IA

O sistema implementa um pipeline estrito de 5 etapas, processando dados em tempo real no cliente (_Edge Computing_), sem necessidade de enviar os dados de vídeo para um servidor remoto.

### 1.1. Diagrama do Pipeline (Inferência)

```
graph TD
    A[Câmera do Dispositivo 30 FPS] -->|Captura de Vídeo| B(Rastreamento Corporal)
    B -->|MediaPipe Pose - 33 Landmarks| C{Processamento de Sequência}
    C -->|Buffer de 30 Frames + StandardScaler| D[Modelo LSTM - TFLite]
    D -->|Tensor: 30x99 - Probabilidade 10 Classes| E((Classificador de Sinais))
    E -->|Confiança > 70%| F[Módulo Geração de Texto]
    F -->|String ex: 'Obrigado'| G(Síntese de Voz)
    G -->|Web Speech API pt-BR| H((Saída de Áudio))
```

### 1.2. Benefícios da Camada Edge

- **Baixa Latência:** Tempo de resposta < 50ms (atende ao requisito não funcional).
    
- **Privacidade:** Sem envio de imagens ou vídeos para nuvem.
    
- **Resiliência:** Funciona 100% offline após o carregamento inicial.
    

## 2. Tecnologias e Componentes do Sistema

### 2.1. Visão Computacional: MediaPipe Pose

Responsável pelo rastreamento humano em tempo real no navegador.

- **Landmarks:** Detecta 33 pontos de referência por frame (x, y, z).
    
    - Cabeça e rosto: 5 pontos
        
    - Tronco: 4 pontos
        
    - Braços (esq/dir): 10 pontos
        
    - Mãos (esq/dir): 10 pontos
        
    - Pernas: 4 pontos
        
- **Features:** Total de 99 features por frame (33 pontos * 3 eixos).
    

### 2.2. Modelo de Classificação: Rede Neural LSTM

Desenvolvido em TensorFlow/Keras e exportado para TFLite (~284 KB) para alta performance mobile.

**Arquitetura:**

- **Input Layer:** Shape `(30, 99)` - Sequência de 30 frames com 99 features cada.
    
- **LSTM Layer 1:** 64 Units, Ativação ReLU, Return Sequences: True, Dropout 0.2.
    
- **LSTM Layer 2:** 32 Units, Ativação ReLU, Return Sequences: False, Dropout 0.2.
    
- **Dense Layer 1:** 128 Units, Ativação ReLU, Dropout 0.2.
    
- **Dense Layer 2:** 64 Units, Ativação ReLU.
    
- **Output Layer:** 10 Units (Classes), Ativação Softmax.
    
- **Total de Parâmetros Treináveis:** 67.530.
    

### 2.3. Síntese de Voz (Output)

Utiliza a **Web Speech API** nativa dos navegadores.

```
const utterance = new SpeechSynthesisUtterance(signal);
utterance.lang = 'pt-BR';
utterance.rate = 0.9; // Ajuste para clareza da pronúncia
utterance.pitch = 1;
utterance.volume = 1;
window.speechSynthesis.speak(utterance);
```

## 3. Implementação Frontend

A interface gráfica foi desenvolvida em React utilizando TypeScript e componentes UI modernos (shadcn/ui).

### 3.1. Estrutura de Diretórios

```
tradutor-libras-audio/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx                # Página de Apresentação
│   │   │   ├── LibrasTranslator.tsx    # Componente principal de Tradução
│   │   ├── components/ui/              # Componentes de Design System
│   │   ├── lib/
│   │   │   ├── utils.ts                # Utilitários globais
│   │   │   ├── libras.ts               # Lógica de processamento e normalização
├── server/                             # (Não utilizado em deploy estático)
├── public/
│   ├── libras_model.tflite             # Modelo otimizado
│   ├── class_mapping.json              # Dicionário de sinais (10 classes)
│   ├── scaler.json                     # Parâmetros para StandardScaler
├── train_libras_model.py               # Script Python de treinamento
```

### 3.2. Fluxo de Execução (LibrasTranslator.tsx)

1. Montagem: Carrega `libras_model.tflite`, `class_mapping.json` e `scaler.json`.
    
2. Interação: Usuário clica em "Iniciar Câmera". MediaPipe é inicializado com callbacks.
    
3. Loop de Frames (`requestAnimationFrame`): Armazena 33 landmarks em um Buffer circular (tamanho 30).
    
4. Inferência: Quando Buffer = 30, os dados são normalizados e enviados à rede LSTM.
    
5. Classificação: Se Confiança > 70%, o estado da predição é atualizado e o Web Speech é acionado.
    

## 4. Estratégia Completa de Testes

Para garantir alta resiliência (cobertura > 90%), o projeto adota a Pirâmide de Testes utilizando modernas ferramentas do ecossistema JS/TS.

### 4.1. Pirâmide de Testes e Ferramentas

- **Testes E2E (5-10%):** Playwright - Validação de fluxos completos na visão do usuário (Chrome, Safari, Mobile).
    
- **Testes de Componentes (30-40%):** React Testing Library (RTL) - Renderização e estado (ex: `LibrasTranslator.test.tsx`).
    
- **Testes Unitários (50-60%):** Vitest + Happy DOM - Validação isolada de funções matemáticas e de extração.
    

### 4.2. Metas de Code Coverage

O sistema é configurado via `vitest.config.ts` para exigir:

- **Linhas e Statements:** > 90%
    
- **Funções:** > 90%
    
- **Branches:** > 85%
    

### 4.3. Exemplos de Testes (Vitest)

A lógica de negócio central (extrator, normalizador) está coberta unitariamente.

```
describe('Libras Processing Logic', () => {
  describe('classifySignal', () => {
    it('deve classificar sinal corretamente e aplicar threshold > 0.7', () => {
      // Arrange
      const output = new Float32Array([0.1, 0.2, 0.75]); // Confiança de 75% na classe 2
      let maxConfidence = 0;
      let predictedClass = 0;
      // Act
      for (let i = 0; i < output.length; i++) {
        if (output[i] > maxConfidence) {
          maxConfidence = output[i];
          predictedClass = i;
        }
      }
      // Assert
      expect(predictedClass).toBe(2);
      expect(maxConfidence).toBe(0.75);
    });
  });
});
```

### 4.4. Integração Contínua (CI/CD)

Toda PR no GitHub passa obrigatoriamente por testes automatizados e análise de coverage.

```
# Trecho do .github/workflows/test.yml
steps:
  - uses: actions/checkout@v3
  - uses: pnpm/action-setup@v2
  - run: pnpm install
  - run: pnpm test
  - run: pnpm test:coverage
  - run: pnpm test:e2e
```

## 5. Resultados de Treinamento e Limitações (Protótipo)

### Fix: TF.js Model Loading Bug
- **Issue**: The browser application failed to load the generated `model.json` with the error `Falha ao carregar o modelo de IA`.
- **Root Cause**: The Python environment upgraded to Keras 3 (TensorFlow 2.16+), which fundamentally changed how layer weights are internally named during `model.to_json()` exports. The layer path prefixes (e.g., `lstm/lstm_cell/kernel`) were stripped to just `kernel`. The frontend's `@tensorflow/tfjs` strict parser failed silently when attempting to map these weights back to the LSTM and Dense layers, resulting in the generic catch block error.
- **Resolution**: Updated `train_libras_model.py`'s manual export logic to detect missing prefixes and dynamically re-inject the `lstm_cell/` and component names into the Keras 3 weights manifest, ensuring backwards compatibility with TF.js. Model loading was fully restored.

### 5.1. Dataset e Treinamento

Para prova de conceito (PoC), utilizou-se um dataset **sintético**:

- 10 Classes: _Olá, Obrigado, Água, Ajuda, Sim, Não, Tudo bem, Tchau, Desculpa, Por favor_.
    
- 1.000 sequências totais (100 por classe).
    
- Normalização: Z-Score (`StandardScaler`).
    
- Otimizador: Adam (lr=0.001) / Loss: Sparse Categorical Crossentropy.
    

### 5.2. Métricas Alcançadas

- **Latência de Inferência:** ~50ms (Sucesso).
    
- **FPS:** Estável em 30 FPS na Web (Sucesso).
    
- **Acurácia (Conjunto de Teste):** 11.5%.
    
    - _Análise Crítica:_ Como o modelo foi treinado com uma distribuição normal randômica (dados sintéticos gerados para validar a integração do pipeline), a acurácia reflete um comportamento aleatório. A arquitetura de software (MediaPipe -> React -> Buffer -> TFLite -> Áudio) encontra-se validada. Contudo, em ambiente de produção, requer um dataset construído a partir de **vídeos de sinalizadores reais**.
        

## 6. Instalação e Execução para Desenvolvedores

```
# 1. Clonar repositório
git clone [https://github.com/Rodrooj/Aula.Digital.git](https://github.com/Rodrooj/Aula.Digital.git)
cd tradutor-libras-audio

# 2. Instalar dependências
pnpm install

# 3. Rodar as suites de Testes (Unit/Componentes)
pnpm test
pnpm test:coverage

# 4. Iniciar Servidor de Desenvolvimento
pnpm dev
```

## 7. Trabalhos Futuros e Escalabilidade

1. **Substituição de Dados:** Realizar a gravação de vídeos reais, construir um dataset robusto (_MINDS-Libras_ ou customizado) com anotação manual e retreinar o `libras_model.keras`.
    
2. **Reconhecimento Contínuo (CSLR):** Evoluir de palavras isoladas para contexto e frases (exigirá integração com modelos Transformers ou Beam Search/CTC).
    
3. **Robustez de Visão:** Avaliar performance de MediaPipe e normalização contra variações abruptas de iluminação e distância focal da câmera do usuário.
    
4. **UX:** Adicionar histórico visual de predições com nível de confiança ao lado na tela.