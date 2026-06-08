# 🤟 Tradutor de Libras para Áudio — Apresentação Técnica

> Sistema de Inteligência Artificial para tradução simultânea da Língua Brasileira de Sinais (Libras) em áudio, processado inteiramente no navegador do usuário.

---

## Índice

1. [Introdução e Motivação](#1-introdução-e-motivação)
2. [Visão Geral do Sistema](#2-visão-geral-do-sistema)
3. [Pipeline de Processamento](#3-pipeline-de-processamento)
4. [O Modelo de Machine Learning](#4-o-modelo-de-machine-learning)
5. [O Dataset Sintético](#5-o-dataset-sintético)
6. [Data Augmentation](#6-data-augmentation)
7. [Treinamento e Otimização](#7-treinamento-e-otimização)
8. [Stack Tecnológico](#8-stack-tecnológico)
9. [Arquitetura do Frontend](#9-arquitetura-do-frontend)
10. [Estratégia de Testes](#10-estratégia-de-testes)
11. [Edge Computing e Privacidade](#11-edge-computing-e-privacidade)
12. [Resultados e Métricas](#12-resultados-e-métricas)
13. [Desafios Técnicos Enfrentados](#13-desafios-técnicos-enfrentados)
14. [Trabalhos Futuros](#14-trabalhos-futuros)
15. [Como Executar o Projeto](#15-como-executar-o-projeto)

---

## 1. Introdução e Motivação

A Língua Brasileira de Sinais (Libras) é reconhecida por lei (Lei nº 10.436/2002) como meio legal de comunicação e expressão de comunidades surdas no Brasil. Apesar disso, a barreira de comunicação entre surdos e ouvintes permanece um desafio cotidiano — a grande maioria da população ouvinte não conhece Libras.

Este projeto propõe uma solução tecnológica: um **tradutor automático de Libras para áudio em tempo real**, que funciona diretamente no navegador de qualquer dispositivo com câmera. A ideia central é democratizar a acessibilidade utilizando Inteligência Artificial e técnicas de Edge Computing, sem a necessidade de instalação de aplicativos, servidores dedicados ou conexão constante com a internet.

### Objetivos

| Objetivo | Descrição |
|----------|-----------|
| **Acessibilidade** | Permitir que qualquer pessoa ouvinte compreenda sinais de Libras sem conhecimento prévio da língua |
| **Privacidade** | Processar tudo localmente — nenhum vídeo ou dado biométrico sai do dispositivo |
| **Baixa Latência** | Manter a inferência abaixo de 50ms para comunicação fluida |
| **Offline** | Funcionar sem internet após o carregamento inicial da página |

---

## 2. Visão Geral do Sistema

O sistema é uma **aplicação web single-page (SPA)** construída com React e TypeScript que executa um pipeline de IA inteiramente no lado do cliente (browser). A arquitetura é composta por 5 estágios encadeados:

```
📷 Câmera → 🦴 MediaPipe Pose → 📊 Frame Buffer → 🧠 LSTM → 🔊 Áudio
```

### Componentes Principais

| Componente | Tecnologia | Função |
|------------|------------|--------|
| Captura de vídeo | `getUserMedia` API | Obtém stream de vídeo a 30 FPS da webcam |
| Detecção de pose | MediaPipe Pose (CDN) | Extrai 33 landmarks corporais (x, y, z) por frame |
| Buffer temporal | `FrameBuffer` (TypeScript) | Acumula 30 frames consecutivos para análise de sequência |
| Classificação | TensorFlow.js + LSTM | Classifica a sequência de landmarks em 1 de 11 sinais |
| Síntese de voz | Web Speech API | Converte o sinal reconhecido em áudio pt-BR |

---

## 3. Pipeline de Processamento

O pipeline opera em um loop contínuo controlado por `requestAnimationFrame`, que dispara a cada ~33ms (30 FPS):

### 3.1. Etapa 1 — Captura de Vídeo

A câmera do dispositivo é acessada via `navigator.mediaDevices.getUserMedia()` com resolução ideal de 640×480 pixels. O stream de vídeo é renderizado em um `<video>` HTML5 e simultaneamente enviado ao módulo de rastreamento corporal.

### 3.2. Etapa 2 — Rastreamento Corporal (MediaPipe Pose)

O **MediaPipe Pose** da Google detecta, em tempo real, **33 landmarks** (pontos de referência) do corpo humano a partir de cada frame de vídeo. Cada landmark possui 3 coordenadas:

- **x**: posição horizontal normalizada [0, 1]
- **y**: posição vertical normalizada [0, 1] (0 = topo)
- **z**: profundidade relativa ao quadril

Isso gera um vetor de **99 features** por frame (33 landmarks × 3 coordenadas).

**Mapa de Landmarks:**

```
 0: Nariz               11: Ombro Esq.        15: Pulso Esq.
 1-6: Olhos             12: Ombro Dir.        16: Pulso Dir.
 7-8: Orelhas           13: Cotovelo Esq.     17-22: Dedos (6 pts)
 9-10: Boca             14: Cotovelo Dir.      23-32: Quadril/Pernas
```

Os landmarks mais críticos para o reconhecimento de sinais são os dos **braços, mãos e tronco** (landmarks 11-22), pois é onde ocorre a movimentação significativa durante a sinalização.

### 3.3. Etapa 3 — Buffer de Frames e Normalização

Os 99 features de cada frame são armazenados em um **buffer circular** (`FrameBuffer`) de tamanho fixo = 30 frames. Quando o buffer está cheio, a sequência inteira é extraída e submetida à normalização **Z-Score (StandardScaler)**:

```
valor_normalizado = (valor - média) / desvio_padrão
```

Os parâmetros de `média` e `desvio_padrão` são calculados durante o treinamento (via `sklearn.StandardScaler`) e exportados em `scaler.json` para uso no frontend. Isso garante que o modelo receba dados na mesma distribuição em que foi treinado.

Após a inferência, o buffer desliza pela metade (sliding window de 15 frames), criando sobreposição temporal que suaviza as predições.

### 3.4. Etapa 4 — Inferência Neural (LSTM)

A sequência normalizada de shape `[1, 30, 99]` é convertida em um tensor TensorFlow.js e passada ao modelo LSTM para classificação. O modelo retorna um vetor de probabilidades softmax com 11 valores (um por classe).

Um **threshold de confiança de 70%** é aplicado: se a maior probabilidade for inferior a 0.7, a predição é descartada (considerada incerta). Existe também um **throttle temporal de 2000ms** entre predições, garantindo que o narrador tenha tempo de finalizar a pronúncia antes de uma nova detecção.

### 3.5. Etapa 5 — Síntese de Voz

Se a predição for aceita (confiança ≥ 70%) e o sinal **não for "Parado"** (classe idle), a **Web Speech API** é acionada para pronunciar o nome do sinal em português brasileiro (`lang: 'pt-BR'`). A fala anterior é cancelada automaticamente para evitar sobreposição de áudio.

---

## 4. O Modelo de Machine Learning

### 4.1. Arquitetura da Rede Neural

O modelo é uma rede **LSTM (Long Short-Term Memory)** bidirecional empilhada, projetada para capturar dependências temporais em sequências de movimento corporal.

```
┌─────────────────────────────────────────────────┐
│                 Input Layer                      │
│            Shape: (30, 99)                       │
│     30 frames × 99 features por frame            │
├─────────────────────────────────────────────────┤
│              LSTM Layer 1                        │
│    64 unidades, ativação ReLU                    │
│    return_sequences=True                         │
│    → Saída: (30, 64)                             │
├─────────────────────────────────────────────────┤
│             Dropout (20%)                        │
│    Regularização contra overfitting              │
├─────────────────────────────────────────────────┤
│              LSTM Layer 2                        │
│    32 unidades, ativação ReLU                    │
│    return_sequences=False                        │
│    → Saída: (32,)                                │
├─────────────────────────────────────────────────┤
│             Dropout (20%)                        │
├─────────────────────────────────────────────────┤
│             Dense Layer 1                        │
│    128 unidades, ativação ReLU                   │
├─────────────────────────────────────────────────┤
│             Dropout (20%)                        │
├─────────────────────────────────────────────────┤
│             Dense Layer 2                        │
│    64 unidades, ativação ReLU                    │
├─────────────────────────────────────────────────┤
│             Output Layer                         │
│    11 unidades, ativação Softmax                 │
│    → Probabilidade para cada classe              │
└─────────────────────────────────────────────────┘

Total de parâmetros treináveis: 67.595
```

### 4.2. Por que LSTM?

A escolha da arquitetura LSTM é fundamentada nas seguintes razões:

1. **Natureza temporal dos sinais**: Sinais de Libras são gestos **dinâmicos** que se desenrolam ao longo do tempo. Uma rede feedforward simples não captura a ordem e o ritmo dos movimentos. A LSTM foi projetada especificamente para processar dados sequenciais.

2. **Memória de longo prazo**: A célula LSTM possui mecanismos de portas (*forget gate*, *input gate*, *output gate*) que permitem ao modelo "lembrar" informações relevantes de frames anteriores e "esquecer" ruído, sendo ideal para padrões de movimento que duram centenas de milissegundos.

3. **Tamanho compacto**: Com apenas ~67 mil parâmetros, o modelo é leve o suficiente para rodar em tempo real no navegador via TensorFlow.js, sem necessidade de GPU dedicada.

### 4.3. Classes Reconhecidas (11 sinais)

| Índice | Sinal | Emoji | Descrição do Gesto |
|--------|-------|-------|---------------------|
| 0 | Olá | 👋 | Mão aberta ao lado da cabeça, balançando lateralmente |
| 1 | Obrigado | 🙏 | Mão toca a testa/queixo e desce em arco para frente |
| 2 | Água | 💧 | Letra 'A' em punho toca o queixo com tapping repetido |
| 3 | Ajuda | 🆘 | Mão aberta embaixo, punho empurrando para cima sobre ela |
| 4 | Sim | ✅ | Punho fechado balançando para frente e para trás (assentir) |
| 5 | Não | ❌ | Dedo indicador estendido, balançando lateralmente |
| 6 | Tudo bem | 👍 | Ambas as mãos abertas nivelando uma superfície |
| 7 | Tchau | 👋 | Mão levantada com dedos abrindo e fechando |
| 8 | Desculpa | 😔 | Mão aberta fazendo movimento circular sobre o peito |
| 9 | Por favor | 🤲 | Mãos juntas em posição de prece, balançando para frente |
| 10 | Parado | 🧍 | Postura neutra (idle) — braços relaxados, sem sinalização |

A classe **"Parado" (idle)** foi adicionada para evitar falsos positivos quando o usuário não está fazendo nenhum sinal. Quando detectada, o sistema suprime a síntese de voz.

---

## 5. O Dataset Sintético

### 5.1. Abordagem de Geração

Por se tratar de um protótipo e prova de conceito (PoC), o dataset foi **gerado sinteticamente** via código Python, em vez de coletado por gravação de vídeos reais de sinalizadores.

Cada sinal é modelado matematicamente com base em descrições linguísticas reais do gesto em Libras. O script `train_libras_model.py` contém uma função geradora para cada classe (ex: `generate_ola()`, `generate_obrigado()`, etc.) que produz sequências de 30 frames simulando o movimento corporal correspondente.

### 5.2. Pose Base Biomecânica

O ponto de partida é uma **pose base** (`create_base_pose()`) que representa um corpo humano em pé, de frente para a câmera, com coordenadas normalizadas [0, 1] no padrão MediaPipe:

```python
# Exemplo de landmarks da pose base:
pose[0]  = [0.50, 0.15, 0.00]  # Nariz (centro horizontal, topo vertical)
pose[11] = [0.38, 0.28, 0.00]  # Ombro esquerdo
pose[12] = [0.62, 0.28, 0.00]  # Ombro direito
pose[15] = [0.30, 0.52, 0.01]  # Pulso esquerdo (relaxado)
pose[16] = [0.70, 0.52, 0.01]  # Pulso direito (relaxado)
```

### 5.3. Modelagem dos Gestos

Cada gesto é descrito como uma **função temporal** que modifica landmarks específicos ao longo de 30 frames. As funções utilizam:

- **Interpolação linear** para transições suaves (ex: mão subindo até a cabeça)
- **Funções senoidais** para movimentos oscilatórios (ex: aceno, tapping no queixo)
- **Fases temporais** para gestos compostos (ex: "Obrigado" tem fase de subida e fase de descida)

**Exemplo — Sinal "Olá" (aceno):**

```python
def generate_ola(base_pose, rng):
    for f in range(30):
        t = f / 30  # tempo normalizado [0, 1]

        # Mão direita sobe até a cabeça nos primeiros 1/3 do tempo
        raise_t = min(t * 3, 1.0)

        # Oscilação horizontal (3 ciclos de aceno)
        wave_x = 0.08 * sin(2π × 3 × t)

        # Posição final do pulso direito
        pose[R_WRIST] = [0.72 + wave_x, 0.28 - raise_t * 0.15, -0.05]
```

### 5.4. Números do Dataset

| Métrica | Valor |
|---------|-------|
| Classes | 11 (10 sinais + 1 idle) |
| Amostras originais por classe | 500 |
| Fator de augmentation | 3× |
| **Total de amostras** | **22.000** (11 × 500 × 4) |
| Frames por amostra | 30 |
| Features por frame | 99 |
| Shape final do tensor | (22000, 30, 99) |

---

## 6. Data Augmentation

Para aumentar a robustez do modelo e simular variações do mundo real, 5 técnicas de augmentation são aplicadas a cada amostra original:

### 6.1. Ruído Gaussiano

Simula a imprecisão natural do rastreador MediaPipe Pose, que pode flutuar entre frames consecutivos.

```python
noise_std = random.uniform(0.002, 0.015)
sequence += random.normal(0, noise_std, sequence.shape)
```

### 6.2. Escala

Simula pessoas de diferentes tamanhos corporais (crianças, adultos, etc.) na frente da câmera.

```python
scale = random.uniform(0.85, 1.15)  # ±15%
sequence *= scale
```

### 6.3. Translação

Simula o usuário em diferentes posições horizontais e verticais no campo de visão da câmera.

```python
tx = random.uniform(-0.08, 0.08)
ty = random.uniform(-0.06, 0.06)
```

### 6.4. Jitter Temporal

Simula velocidades diferentes de sinalização (algumas pessoas sinalizam mais rápido, outras mais devagar).

```python
speed = random.uniform(0.8, 1.2)
indices = round(arange(30) * speed)  # Reamostragem temporal
```

### 6.5. Rotação 2D

Simula a câmera posicionada em ângulos ligeiramente diferentes (~5°).

```python
angle = random.uniform(-0.1, 0.1)  # radianos
x_rot = x * cos(angle) - y * sin(angle)
y_rot = x * sin(angle) + y * cos(angle)
```

---

## 7. Treinamento e Otimização

### 7.1. Configuração do Treinamento

| Hiperparâmetro | Valor |
|----------------|-------|
| Otimizador | Adam |
| Learning Rate inicial | 0.001 |
| Loss Function | Sparse Categorical Crossentropy |
| Batch Size | 32 |
| Épocas máximas | 50 |
| Divisão treino/validação | 80% / 20% |
| Divisão treino/teste | 80% / 20% (stratified) |

### 7.2. Callbacks de Otimização

- **EarlyStopping**: Monitora `val_loss` e interrompe o treinamento se não houver melhora por 10 épocas consecutivas. Restaura automaticamente os pesos da melhor época.

- **ReduceLROnPlateau**: Reduz o learning rate pela metade se `val_loss` estagnar por 5 épocas, com um piso mínimo de 1e-6.

### 7.3. Normalização dos Dados

Antes do treinamento, todas as features são normalizadas com **StandardScaler** (Z-Score):

```
X_normalizado = (X - μ) / σ
```

Os vetores `μ` (média) e `σ` (desvio padrão) são calculados **apenas no conjunto de treino** e aplicados tanto no treino quanto no teste (evitando data leakage). Esses parâmetros são exportados em `scaler.json` para uso idêntico no frontend.

### 7.4. Exportação para TensorFlow.js

Após o treinamento, o modelo Keras é exportado manualmente para o formato **TF.js Layers Model**, gerando:

- `model.json` — topologia da rede (camadas, shapes, ativações) + manifesto de pesos
- `group1-shard1of1.bin` — pesos binários (float32) em arquivo único (~270 KB)

A exportação manual foi necessária porque o conversor oficial `tensorflowjs_converter` não estava disponível no ambiente. O script gera o JSON de topologia diretamente de `model.to_json()` e serializa os pesos em formato binário compatível.

> **Nota sobre compatibilidade Keras 3:** O projeto inclui patches de compatibilidade para lidar com mudanças na serialização JSON do Keras 3 (TensorFlow 2.16+), como a renomeação de `batch_shape` → `batch_input_shape` e a remoção de prefixos de caminho nos nomes dos pesos.

---

## 8. Stack Tecnológico

### 8.1. Frontend

| Tecnologia | Versão | Função |
|------------|--------|--------|
| **React** | 18.3 | Biblioteca de UI reativa com hooks |
| **TypeScript** | 5.6 | Tipagem estática para robustez |
| **Vite** | 5.4 | Build tool e dev server ultra-rápido |
| **TensorFlow.js** | 4.22 | Inferência neural no navegador |
| **Lucide React** | 0.468 | Ícones SVG para a interface |
| **React Router DOM** | 6.28 | Navegação SPA entre páginas |

### 8.2. Machine Learning / Backend de Treinamento

| Tecnologia | Função |
|------------|--------|
| **Python 3** | Linguagem do script de treinamento |
| **TensorFlow / Keras 3** | Framework de deep learning |
| **scikit-learn** | StandardScaler e train_test_split |
| **NumPy** | Manipulação de arrays e geração de dados sintéticos |

### 8.3. APIs do Navegador

| API | Função |
|-----|--------|
| **MediaDevices.getUserMedia** | Captura de vídeo da câmera |
| **MediaPipe Pose** (CDN) | Rastreamento corporal (33 landmarks) |
| **Web Speech API** | Síntese de voz em pt-BR |
| **requestAnimationFrame** | Loop de processamento em 30+ FPS |
| **Canvas 2D** | Renderização visual dos landmarks sobre o vídeo |

### 8.4. Testes

| Ferramenta | Função |
|------------|--------|
| **Vitest** | Test runner compatível com Vite |
| **Happy DOM** | Ambiente DOM leve para testes |
| **React Testing Library** | Testes de componentes React |
| **@vitest/coverage-v8** | Relatórios de cobertura de código |

---

## 9. Arquitetura do Frontend

### 9.1. Estrutura de Diretórios

```
tradutor-libras-audio/
├── public/
│   ├── libras_model_tfjs/          # Modelo TF.js exportado
│   │   ├── model.json              # Topologia + manifesto de pesos
│   │   └── group1-shard1of1.bin    # Pesos binários (~270 KB)
│   ├── class_mapping.json          # {0: "Olá", 1: "Obrigado", ...}
│   └── scaler.json                 # {mean: [...], scale: [...]}
├── src/
│   ├── lib/
│   │   ├── libras.ts               # Core: extração, normalização, inferência, voz
│   │   └── utils.ts                # Utilitários (cn, formatPercent, formatTime)
│   ├── pages/
│   │   ├── Home.tsx                # Landing page com apresentação do projeto
│   │   ├── LibrasTranslator.tsx    # Componente principal do tradutor
│   │   └── NotFound.tsx            # Página 404
│   ├── App.tsx                     # Router principal
│   ├── main.tsx                    # Entry point React
│   └── index.css                   # Design system completo (CSS vanilla)
├── train_libras_model.py           # Script Python de treinamento
├── libras_model.keras              # Modelo Keras salvo
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### 9.2. Módulo Core — `libras.ts`

O coração do sistema está concentrado em `src/lib/libras.ts`, que expõe:

| Função/Classe | Responsabilidade |
|---------------|------------------|
| `extractLandmarks()` | Converte os 33 landmarks do MediaPipe em `Float32Array(99)` |
| `normalizeFeatures()` | Aplica Z-Score com parâmetros do `scaler.json` |
| `FrameBuffer` | Buffer circular que acumula 30 frames para análise temporal |
| `runInference()` | Cria tensor 3D, executa `model.predict()` e limpa tensores |
| `classifySignal()` | Encontra a classe com maior probabilidade e aplica threshold |
| `loadModelAssets()` | Carrega model + scaler + class_mapping em paralelo |
| `speakSignal()` | Pronuncia o sinal via Web Speech API em pt-BR |

### 9.3. Componente Tradutor — `LibrasTranslator.tsx`

O componente principal gerencia todo o ciclo de vida da aplicação:

1. **Montagem**: Carrega os 3 assets (modelo, scaler, mapping) em paralelo via `loadModelAssets()`
2. **Inicialização do MediaPipe**: Configura o Pose tracker com callbacks
3. **Loop de Processamento**: `requestAnimationFrame` → `pose.send()` → `onPoseResults`
4. **Inferência Throttled**: Máximo de 1 predição a cada 2000ms
5. **Cleanup**: Libera câmera, cancela animations, dispõe tensores e fecha o Pose

### 9.4. Design System

A interface utiliza CSS vanilla com variáveis customizadas para um visual moderno:

- **Tema escuro** com gradientes vibrantes (roxo/cyan)
- **Glassmorphism** com `backdrop-filter: blur()` nos cartões
- **Micro-animações** suaves (fade-in, scale-in, slide-up)
- **Layout responsivo** com CSS Grid adaptativo
- **Status indicators** em tempo real (FPS, buffer progress, modelo carregado)

---

## 10. Estratégia de Testes

O projeto segue a **Pirâmide de Testes**, priorizando testes unitários rápidos na base e testes de componentes no meio.

### 10.1. Testes Unitários (`libras.test.ts`)

Cobrem toda a lógica core de processamento:

- Extração de landmarks (shape, valores, edge cases)
- Normalização Z-Score (cálculo, divisão por zero)
- Buffer de frames (push, shift, isFull, clear)
- Classificação de sinais (threshold, argmax, mapeamento)
- Síntese de voz (chamada da API, cancelamento)

### 10.2. Testes de Componentes (`LibrasTranslator.test.tsx`, `App.test.tsx`)

Cobrem renderização, interação e estado dos componentes React:

- Renderização inicial e elementos visuais
- Navegação entre páginas
- Botões de controle (iniciar/parar câmera, toggle de som)
- Estado de loading do modelo
- Exibição de erros

### 10.3. Métricas de Cobertura

O projeto utiliza `@vitest/coverage-v8` configurado com thresholds mínimos:

| Métrica | Alvo | Status |
|---------|------|--------|
| Linhas | > 80% | ✅ ~83% |
| Statements | > 80% | ✅ ~83% |
| Funções | > 80% | ✅ ~83% |
| Branches | > 75% | ✅ ~78% |

---

## 11. Edge Computing e Privacidade

### 11.1. O que é Edge Computing?

Edge Computing é o paradigma de processar dados **o mais próximo possível da fonte** (neste caso, no dispositivo do usuário), em vez de enviar para servidores remotos na nuvem. No contexto deste projeto:

```
┌────────────────────────────────────────────────┐
│          DISPOSITIVO DO USUÁRIO                 │
│                                                 │
│  Câmera → MediaPipe → Buffer → LSTM → Voz      │
│                                                 │
│  ✅ Tudo processado aqui, localmente            │
│  ✅ Nenhum dado sai do dispositivo              │
│  ✅ Funciona sem internet (após carregamento)    │
└────────────────────────────────────────────────┘

          ❌ Nenhum servidor remoto utilizado
```

### 11.2. Benefícios Concretos

| Benefício | Detalhe |
|-----------|---------|
| **Privacidade** | Vídeos da câmera nunca saem do navegador. Zero dados biométricos transmitidos |
| **Latência** | Sem round-trip de rede. Inferência completa em <50ms |
| **Offline** | Após carregar a página, funciona sem internet |
| **Custo zero** | Sem servidores de GPU para manter. O "servidor" é o browser do usuário |
| **Escalabilidade** | Cada usuário processa sua própria IA. Sem gargalos de servidor |

### 11.3. Tamanho dos Assets

| Arquivo | Tamanho | Conteúdo |
|---------|---------|----------|
| `model.json` | ~14 KB | Topologia da rede + manifesto |
| `group1-shard1of1.bin` | ~270 KB | Pesos do modelo (float32) |
| `scaler.json` | ~5 KB | Parâmetros de normalização |
| `class_mapping.json` | < 1 KB | Mapeamento índice → nome |
| **Total** | **~290 KB** | Modelo completo pronto para uso |

O modelo inteiro cabe em menos de 300 KB — menor que uma única foto de smartphone.

---

## 12. Resultados e Métricas

### 12.1. Métricas de Treinamento

| Métrica | Valor |
|---------|-------|
| Acurácia final (conjunto de teste) | **100%** |
| Loss final | ~0.0000 |
| Épocas até convergência | ~29 (early stopping em ~39) |
| Tempo de treinamento | ~5 minutos (CPU) |

> **Nota importante**: A acurácia de 100% é esperada em um dataset sintético, pois os padrões são determinísticos e claramente separáveis. Em um cenário de produção com dados reais (vídeos de sinalizadores humanos), a acurácia seria significativamente menor e o modelo precisaria ser avaliado com métricas adicionais (precisão, recall, F1 por classe, matriz de confusão).

### 12.2. Métricas de Performance em Tempo Real

| Métrica | Alvo | Resultado |
|---------|------|-----------|
| FPS do pipeline | ≥ 25 FPS | ✅ 30 FPS estável |
| Latência de inferência | < 50ms | ✅ ~30-40ms |
| Tempo de carregamento do modelo | < 2s | ✅ ~500ms |
| Uso de memória | < 100 MB | ✅ ~60 MB |

### 12.3. Compatibilidade

| Navegador | Suporte |
|-----------|---------|
| Chrome 80+ | ✅ Completo |
| Edge 80+ | ✅ Completo |
| Firefox 90+ | ✅ Completo |
| Safari 15+ | ⚠️ Parcial (Web Speech API limitada) |
| Mobile Chrome (Android) | ✅ Completo |

---

## 13. Desafios Técnicos Enfrentados

### 13.1. Compatibilidade Keras 3 ↔ TensorFlow.js

O maior desafio técnico do projeto foi a **incompatibilidade silenciosa** entre o formato de exportação do Keras 3 e o parser do TensorFlow.js 4.x.

**Problema**: Ao atualizar para Keras 3 (TensorFlow 2.16+), duas mudanças breaking foram introduzidas sem documentação:

1. A propriedade `batch_input_shape` da InputLayer foi renomeada para `batch_shape`
2. Os nomes dos pesos perderam seus prefixos de camada (ex: `lstm/lstm_cell/kernel` → `kernel`)

**Solução**: Implementação de patches de compatibilidade no script de exportação:

```python
# Patch 1: Renomear batch_shape → batch_input_shape
if layer_config.get("class_name") == "InputLayer":
    if "batch_shape" in layer_config["config"]:
        layer_config["config"]["batch_input_shape"] = (
            layer_config["config"].pop("batch_shape")
        )

# Patch 2: Re-injetar prefixos de camada nos nomes dos pesos
if '/' not in w.name:
    w_name = f"{layer.name}/{w.name}"
```

### 13.2. Gerenciamento de Memória com Tensores

No TensorFlow.js, tensores não são gerenciados pelo garbage collector do JavaScript. Cada `tf.tensor()` aloca memória GPU/CPU que deve ser liberada manualmente com `.dispose()`. O código utiliza blocos `try/finally` para garantir limpeza:

```typescript
const inputTensor = tf.tensor3d(data, [1, 30, 99]);
try {
    const output = model.predict(inputTensor) as tf.Tensor;
    const result = await output.data();
    output.dispose();
    return result;
} finally {
    inputTensor.dispose();
}
```

### 13.3. Throttling da Predição

Sem throttling, o sistema tentava classificar sinais a cada frame (~33ms), causando:
- Sobrecarga de CPU
- Sobreposição de áudios na síntese de voz
- Flicker visual nas predições

A solução foi implementar um intervalo mínimo de 2000ms entre predições, dando tempo para o narrador concluir a pronúncia.

---

## 14. Trabalhos Futuros

### 14.1. Curto Prazo

- **Dataset real**: Gravar vídeos de sinalizadores humanos reais e retreinar o modelo com dados genuínos
- **Mais sinais**: Expandir o vocabulário para 50-100 sinais de uso cotidiano
- **MediaPipe Hands**: Adicionar rastreamento de mãos (21 landmarks por mão) para maior precisão em sinais que dependem da configuração dos dedos

### 14.2. Médio Prazo

- **Reconhecimento contínuo (CSLR)**: Evoluir de palavras isoladas para frases completas usando CTC Loss ou Transformers
- **Transfer Learning**: Utilizar modelos pré-treinados em linguagem de sinais (ex: WLASL, MINDS-Libras) como base
- **PWA**: Transformar a aplicação em Progressive Web App para instalação nativa

### 14.3. Longo Prazo

- **Tradução bidirecional**: Texto/áudio → avatar 3D sinalizando em Libras
- **Suporte multilíngue**: Expandir para ASL (American Sign Language) e outras línguas de sinais
- **Modelo on-device mais robusto**: Explorar arquiteturas como Temporal Convolutional Networks (TCN) ou Vision Transformers

---

## 15. Como Executar o Projeto

### 15.1. Pré-requisitos

- **Node.js** 18+ e **npm**
- **Python** 3.9+ (apenas para retreinar o modelo)
- Navegador moderno com suporte a câmera

### 15.2. Instalação e Execução

```bash
# 1. Clonar o repositório
git clone https://github.com/Rodrooj/Tradutor-Libras.git
cd Tradutor-Libras

# 2. Instalar dependências do frontend
npm install

# 3. Iniciar o servidor de desenvolvimento
npm run dev

# 4. Abrir no navegador
# → http://localhost:5173
```

### 15.3. Retreinar o Modelo (Opcional)

```bash
# Instala tensorflow e scikit-learn automaticamente se necessário
python -X utf8 train_libras_model.py
```

Os artefatos serão gerados diretamente em `public/`, prontos para uso pelo frontend.

### 15.4. Executar Testes

```bash
# Testes unitários e de componentes
npm test

# Testes com cobertura de código
npm run test:coverage

# Testes em modo watch (desenvolvimento)
npm run test:watch
```

---

## Referências

- [MediaPipe Pose - Google](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)
- [TensorFlow.js - Layers API](https://www.tensorflow.org/js/guide/layers_for_keras_users)
- [Web Speech API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Lei nº 10.436/2002 - Libras](https://www.planalto.gov.br/ccivil_03/leis/2002/l10436.htm)
- [LSTM Networks - Understanding LSTMs (Colah's Blog)](https://colah.github.io/posts/2015-08-Understanding-LSTMs/)

---

<div align="center">

**Desenvolvido com ❤️ para quebrar barreiras de comunicação**

🤟 Tradutor de Libras para Áudio — Projeto Acadêmico de IA

</div>
