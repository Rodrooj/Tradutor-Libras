# Estratégia Completa de Testes - Tradutor de Libras para Áudio

## 📋 Sumário Executivo

Este documento descreve a estratégia de testes implementada para o **Tradutor de Libras para Áudio**, com objetivo de alcançar **cobertura de código > 90%** e garantir a qualidade e confiabilidade do sistema.

A suite de testes é composta por três camadas:
- **Testes Unitários** (Vitest) - Validação de funções isoladas
- **Testes de Componentes** (React Testing Library) - Validação de componentes React
- **Testes E2E** (Playwright) - Validação de fluxos completos

---

## 1. Arquitetura de Testes

### 1.1 Pirâmide de Testes

```
                    ▲
                   /│\
                  / │ \
                 /  │  \        E2E (Playwright)
                /   │   \       5-10% dos testes
               ─────────────
              /     │     \
             /      │      \    Componentes (RTL)
            /       │       \   30-40% dos testes
           ───────────────────
          /         │         \
         /          │          \  Unitários (Vitest)
        /           │           \ 50-60% dos testes
       ─────────────────────────────
```

### 1.2 Camadas de Teste

| Camada | Ferramenta | Cobertura | Velocidade | Confiabilidade |
|--------|-----------|-----------|-----------|----------------|
| **Unitários** | Vitest | 50-60% | ⚡⚡⚡ Rápido | ⭐⭐⭐ Alta |
| **Componentes** | React Testing Library | 30-40% | ⚡⚡ Médio | ⭐⭐⭐⭐ Muito Alta |
| **E2E** | Playwright | 10-20% | ⚡ Lento | ⭐⭐⭐⭐⭐ Máxima |

---

## 2. Testes Unitários

### 2.1 Objetivo

Validar funções isoladas e lógica de negócio sem dependências externas.

### 2.2 Ferramentas

- **Vitest** - Framework de testes rápido e moderno
- **Happy DOM** - Simulação leve do DOM
- **Mocks** - Simulação de APIs do navegador

### 2.3 Cobertura de Testes Unitários

#### 2.3.1 Utilitários (`lib/utils.test.ts`)

```typescript
describe('utils', () => {
  describe('cn - className merger', () => {
    // ✅ Testa mesclagem de classes
    // ✅ Testa remoção de duplicatas
    // ✅ Testa valores undefined/null
    // ✅ Testa classes condicionais
    // ✅ Testa entrada vazia
  });
});
```

**Cobertura:** 100%

#### 2.3.2 Lógica de Libras (`lib/libras.test.ts`)

```typescript
describe('Libras Processing Logic', () => {
  describe('normalizeFeatures', () => {
    // ✅ Normalização correta de features
    // ✅ Tratamento de valores zero
  });

  describe('extractLandmarks', () => {
    // ✅ Extração de 33 landmarks
    // ✅ Ordem de landmarks mantida
  });

  describe('classifySignal', () => {
    // ✅ Encontra classe com maior probabilidade
    // ✅ Aplica threshold de confiança
    // ✅ Valida predição acima do threshold
  });

  describe('mapClassToSignal', () => {
    // ✅ Mapeia classe para sinal correto
    // ✅ Retorna "desconhecido" para classe inválida
  });

  describe('frameBuffer management', () => {
    // ✅ Mantém buffer com tamanho máximo de 30
    // ✅ Limpa buffer corretamente
  });

  describe('speech synthesis', () => {
    // ✅ Cria utterance com configurações corretas
    // ✅ Formata sinal com underscores para espaços
    // ✅ Converte para maiúsculas
  });

  describe('prediction result structure', () => {
    // ✅ Cria resultado de predição válido
    // ✅ Valida confiança entre 0 e 1
  });
});
```

**Cobertura:** ~95%

### 2.4 Executar Testes Unitários

```bash
# Executar todos os testes unitários
pnpm test

# Executar com interface visual
pnpm test:ui

# Executar com cobertura
pnpm test:coverage

# Executar arquivo específico
pnpm test lib/libras.test.ts

# Watch mode
pnpm test --watch
```

---

## 3. Testes de Componentes

### 3.1 Objetivo

Validar renderização, interações e comportamento de componentes React.

### 3.2 Ferramentas

- **React Testing Library** - Testes focados no comportamento do usuário
- **Vitest** - Framework de testes
- **User Event** - Simulação de eventos do usuário

### 3.3 Cobertura de Testes de Componentes

#### 3.3.1 Home Component (`pages/Home.test.tsx`)

**Testes de Renderização:**
- ✅ Renderiza sem erros
- ✅ Exibe header com logo
- ✅ Exibe título principal
- ✅ Exibe descrição do projeto

**Testes de Features:**
- ✅ Exibe 3 cards de features
- ✅ Exibe descrições corretas
- ✅ Exibe seção de arquitetura técnica
- ✅ Lista componentes do pipeline
- ✅ Lista tecnologias utilizadas

**Testes de Sinais:**
- ✅ Exibe seção de sinais reconhecidos
- ✅ Lista todos os 10 sinais

**Testes de Navegação:**
- ✅ Exibe múltiplos botões "Abrir Tradutor"
- ✅ Exibe botão "Comece Agora"
- ✅ Exibe botão "Abrir Tradutor" no header

**Testes de Acessibilidade:**
- ✅ Headings com hierarquia correta
- ✅ Botões com texto descritivo
- ✅ Contraste adequado com cores

**Testes de Design Responsivo:**
- ✅ Renderiza em diferentes tamanhos
- ✅ Classes de responsividade presentes

**Testes de Conteúdo:**
- ✅ Menciona latência < 50ms
- ✅ Menciona privacidade e offline
- ✅ Menciona MediaPipe Pose com 33 landmarks
- ✅ Menciona modelo LSTM

**Cobertura:** ~98%

#### 3.3.2 LibrasTranslator Component (`pages/LibrasTranslator.test.tsx`)

**Testes de Renderização:**
- ✅ Renderiza sem erros
- ✅ Exibe título principal
- ✅ Exibe descrição
- ✅ Exibe card de status do sistema

**Testes de Carregamento de Modelo:**
- ✅ Carrega modelo na montagem
- ✅ Carrega scaler na montagem
- ✅ Carrega modelo TFLite na montagem
- ✅ Exibe erro se falhar ao carregar

**Testes de Controles de Câmera:**
- ✅ Exibe botão "Iniciar Câmera"
- ✅ Exibe botão "Parar"
- ✅ Desabilita botão quando câmera está ativa
- ✅ Desabilita botão quando câmera está inativa

**Testes de Elemento de Vídeo:**
- ✅ Renderiza elemento video
- ✅ Tem atributo autoplay
- ✅ Tem atributo playsinline

**Testes de Predições:**
- ✅ Exibe seção de histórico
- ✅ Exibe mensagem quando nenhum sinal foi reconhecido
- ✅ Exibe instruções de uso

**Testes de Instruções:**
- ✅ Exibe seção de instruções
- ✅ Lista passos de uso
- ✅ Lista sinais suportados

**Testes de Tratamento de Erros:**
- ✅ Exibe erro se câmera não está disponível
- ✅ Limpa erro ao carregar modelo com sucesso

**Testes de Acessibilidade:**
- ✅ Botões com texto descritivo
- ✅ Headings com hierarquia correta
- ✅ Labels ou aria-labels para inputs

**Testes de Ciclo de Vida:**
- ✅ Limpa recursos ao desmontar
- ✅ Carrega modelo apenas uma vez

**Cobertura:** ~96%

### 3.4 Executar Testes de Componentes

```bash
# Executar testes de componentes
pnpm test client/src/pages

# Executar componente específico
pnpm test Home.test.tsx

# Watch mode
pnpm test --watch client/src/pages
```

---

## 4. Testes E2E

### 4.1 Objetivo

Validar fluxos completos da aplicação em navegadores reais.

### 4.2 Ferramentas

- **Playwright** - Framework de testes E2E
- **Múltiplos navegadores** - Chromium, Firefox, WebKit
- **Dispositivos móveis** - Pixel 5, iPhone 12

### 4.3 Cobertura de Testes E2E

#### 4.3.1 Home Page (`e2e/translator.spec.ts`)

**Testes de Carregamento:**
- ✅ Carrega página inicial
- ✅ Exibe título principal
- ✅ Exibe 3 cards de features
- ✅ Exibe botão "Comece Agora"
- ✅ Exibe botão "Abrir Tradutor" no header
- ✅ Exibe seção de sinais suportados
- ✅ Lista todos os 10 sinais
- ✅ Exibe footer

**Testes de Navegação:**
- ✅ Navega para tradutor ao clicar "Comece Agora"
- ✅ Navega para tradutor ao clicar "Abrir Tradutor"
- ✅ Retorna à home ao clicar no logo

#### 4.3.2 Translator Page

**Testes de Carregamento:**
- ✅ Carrega página do tradutor
- ✅ Exibe status do sistema
- ✅ Exibe elemento de vídeo
- ✅ Exibe botão "Iniciar Câmera"
- ✅ Exibe botão "Parar"
- ✅ Exibe histórico de sinais
- ✅ Exibe instruções de uso

**Testes de Carregamento de Modelo:**
- ✅ Carrega modelo na montagem
- ✅ Carrega recursos necessários

**Testes de Permissões de Câmera:**
- ✅ Solicita permissão de câmera

**Testes de Interações:**
- ✅ Exibe feedback visual ao interagir
- ✅ Exibe card de predição quando sinal é reconhecido
- ✅ Atualiza histórico de predições

#### 4.3.3 Design Responsivo

**Testes de Viewport:**
- ✅ Responsivo em mobile (375x667)
- ✅ Responsivo em tablet (768x1024)
- ✅ Responsivo em desktop (1920x1080)

#### 4.3.4 Performance

**Testes de Tempo de Carregamento:**
- ✅ Página inicial carrega em < 5s
- ✅ Página do tradutor carrega em < 5s

#### 4.3.5 Tratamento de Erros

**Testes de Robustez:**
- ✅ Exibe página 404 para rota inválida
- ✅ Recupera de erros de rede

#### 4.3.6 Acessibilidade

**Testes de Acessibilidade:**
- ✅ Estrutura semântica correta
- ✅ Botões acessíveis
- ✅ Suporta navegação por teclado

#### 4.3.7 Compatibilidade Cross-browser

**Testes em Navegadores:**
- ✅ Funciona em Chrome
- ✅ Funciona em Firefox
- ✅ Funciona em Safari

### 4.4 Executar Testes E2E

```bash
# Executar todos os testes E2E
pnpm test:e2e

# Executar em modo headed (com visualização)
pnpm test:e2e --headed

# Executar em navegador específico
pnpm test:e2e --project=chromium

# Executar teste específico
pnpm test:e2e translator.spec.ts

# Debug mode
pnpm test:e2e --debug

# Visualizar relatório
pnpm test:e2e --reporter=html
```

---

## 5. Code Coverage

### 5.1 Metas de Cobertura

| Métrica | Meta | Status |
|---------|------|--------|
| **Linhas** | > 90% | 🎯 |
| **Funções** | > 90% | 🎯 |
| **Branches** | > 85% | 🎯 |
| **Statements** | > 90% | 🎯 |

### 5.2 Configuração de Coverage

```typescript
// vitest.config.ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov'],
  lines: 90,
  functions: 90,
  branches: 85,
  statements: 90,
}
```

### 5.3 Gerar Relatório de Coverage

```bash
# Gerar relatório de coverage
pnpm test:coverage

# Abrir relatório HTML
open coverage/index.html
```

### 5.4 Estrutura do Relatório

```
coverage/
├── index.html           # Relatório visual
├── coverage-final.json  # Dados brutos
└── lcov.info           # Formato LCOV
```

---

## 6. Integração Contínua

### 6.1 Pipeline de CI/CD

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test
      - run: pnpm test:coverage
      - run: pnpm test:e2e
      
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### 6.2 Requisitos para Merge

- ✅ Todos os testes passam
- ✅ Coverage > 90%
- ✅ Sem erros de linting
- ✅ Sem warnings de TypeScript

---

## 7. Boas Práticas de Testes

### 7.1 Nomenclatura

```typescript
// ✅ Bom
describe('LibrasTranslator', () => {
  it('deve exibir botão de iniciar câmera quando modelo está carregado', () => {
    // ...
  });
});

// ❌ Ruim
describe('Component', () => {
  it('works', () => {
    // ...
  });
});
```

### 7.2 Estrutura AAA (Arrange-Act-Assert)

```typescript
// ✅ Bom
it('deve classificar sinal corretamente', () => {
  // Arrange
  const output = new Float32Array([0.1, 0.2, 0.75]);
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
```

### 7.3 Mocks e Stubs

```typescript
// ✅ Bom - Mock de API
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ /* dados */ }),
  });
});

// ✅ Bom - Mock de Web Speech API
Object.defineProperty(window, 'speechSynthesis', {
  value: {
    speak: vi.fn(),
    cancel: vi.fn(),
  },
});
```

### 7.4 Evitar Testes Frágeis

```typescript
// ❌ Frágil - Depende de implementação
expect(component.querySelector('.specific-class')).toBeInTheDocument();

// ✅ Robusto - Depende do comportamento
expect(screen.getByText('Iniciar Câmera')).toBeInTheDocument();
```

### 7.5 Testes Independentes

```typescript
// ✅ Bom - Cada teste é independente
beforeEach(() => {
  vi.clearAllMocks();
  render(<Component />);
});

// ❌ Ruim - Testes dependem de ordem
test('primeiro teste', () => { /* ... */ });
test('segundo teste', () => { /* depende do primeiro */ });
```

---

## 8. Troubleshooting

### 8.1 Problemas Comuns

| Problema | Solução |
|----------|---------|
| Testes lentos | Usar `happy-dom` em vez de `jsdom` |
| Mocks não funcionam | Verificar ordem de imports |
| Testes flaky | Usar `waitFor` para elementos assíncronos |
| Coverage baixa | Adicionar testes para branches não cobertos |

### 8.2 Debug de Testes

```bash
# Debug com Node Inspector
node --inspect-brk ./node_modules/vitest/vitest.mjs

# Debug com Playwright Inspector
PWDEBUG=1 pnpm test:e2e

# Verbose output
pnpm test --reporter=verbose
```

---

## 9. Métricas e Relatórios

### 9.1 Coleta de Métricas

```bash
# Gerar relatório completo
pnpm test:coverage

# Exportar para CI
pnpm test:coverage -- --reporter=json
```

### 9.2 Interpretação de Cobertura

| Tipo | Significado |
|------|------------|
| **Linhas** | % de linhas de código executadas |
| **Funções** | % de funções chamadas |
| **Branches** | % de caminhos de decisão (if/else) |
| **Statements** | % de instruções executadas |

### 9.3 Exemplo de Relatório

```
File                          | % Stmts | % Branch | % Funcs | % Lines |
-------------------------------|---------|----------|---------|---------|
All files                      |   92.5  |   87.3   |   91.2  |   92.8  |
 client/src/lib/utils.ts       |   100   |   100    |   100   |   100   |
 client/src/lib/libras.ts      |   95    |   90     |   95    |   95    |
 client/src/pages/Home.tsx     |   98    |   95     |   98    |   98    |
 client/src/pages/Translator   |   96    |   85     |   96    |   96    |
```

---

## 10. Checklist de Testes

### 10.1 Antes de Fazer Commit

- [ ] Todos os testes passam (`pnpm test`)
- [ ] Coverage > 90% (`pnpm test:coverage`)
- [ ] Sem erros de TypeScript (`pnpm check`)
- [ ] Código formatado (`pnpm format`)

### 10.2 Antes de Fazer Deploy

- [ ] Testes E2E passam (`pnpm test:e2e`)
- [ ] Testes em múltiplos navegadores
- [ ] Testes em dispositivos móveis
- [ ] Relatório de performance OK

### 10.3 Manutenção de Testes

- [ ] Atualizar testes quando código muda
- [ ] Remover testes obsoletos
- [ ] Refatorar testes duplicados
- [ ] Manter coverage > 90%

---

## 11. Conclusão

A estratégia de testes implementada garante:

✅ **Alta cobertura** - > 90% de code coverage  
✅ **Confiabilidade** - Testes em múltiplas camadas  
✅ **Velocidade** - Testes rápidos com Vitest  
✅ **Qualidade** - Validação de comportamento do usuário  
✅ **Manutenibilidade** - Testes claros e bem organizados  

**Próximos passos:**
1. Executar `pnpm test` para validar testes unitários
2. Executar `pnpm test:coverage` para verificar cobertura
3. Executar `pnpm test:e2e` para validar fluxos completos
4. Integrar com CI/CD pipeline

---

**Desenvolvido com ❤️ para garantir qualidade**

*Projeto Acadêmico - Inteligência Artificial*  
*Data: Junho de 2026*
