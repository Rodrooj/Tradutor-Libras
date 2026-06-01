# Skill: Persistent Agent Memory (Memory Bank)

## Descrição
Gatilho: Você DEVE ativar e seguir esta skill implicitamente em **todas** as interações neste repositório.
Objetivo: Fornecer a você uma memória de longo prazo persistente, mantendo o controle rigoroso sobre os seus próprios pensamentos, estado do projeto, documentação de decisões e planejamento de tarefas.

## Regras de Operação (Core Rules)
1. **Inicialização (Leitura):** No início de qualquer interação com o usuário, a sua PRIMEIRA ação deve ser ler o arquivo `.agent/AGENT_MEMORY.md`. Isso carregará o seu contexto sobre onde você parou.
2. **Conclusão (Escrita):** Antes de entregar a resposta final ou concluir a execução de um prompt, você deve revisar e atualizar o arquivo `.agent/AGENT_MEMORY.md`. 
3. **Justificativa Técnica:** Sempre que implementar uma nova funcionalidade, documente na memória o racional por trás das suas escolhas arquiteturais (ex: por que você estruturou algo usando padrões específicos como MVC ou MVVM).
4. **Autonomia de Criação:** Se o arquivo `.agent/AGENT_MEMORY.md` não existir, você deve criá-lo imediatamente utilizando o template abaixo.

## Template Obrigatório para o AGENT_MEMORY.md

O arquivo de memória deve sempre seguir a estrutura abaixo, escrita em Markdown limpo:

# 🧠 Memória do Agente e Diário de Bordo

## 💭 Pensamentos Atuais e Brainstorming
- Registre aqui suas reflexões sobre a arquitetura atual.
- O que está funcionando bem? O que parece frágil no código?
- Ideias de refatoração para abordar no futuro.

## 🏗️ Decisões Arquiteturais e Padrões
- Documente as escolhas de design estabelecidas (ex: MVC, MVVM, arquiteturas em camadas).
- Regras de formatação, bibliotecas preferidas e ferramentas de build do projeto.

## 📋 Status das Tarefas (Flow Kanban)
- **Em Progresso (Doing):** 
  - Qual é o problema exato que estamos resolvendo agora?
- **A Fazer (To Do):** 
  - Próximos passos identificados ou solicitados.
- **Concluído (Done):** 
  - Histórico recente de conquistas e problemas resolvidos.

## ⚠️ Restrições e Pontos de Atenção
- Armadilhas e bugs comuns que o agente já enfrentou neste repositório para não repetir os mesmos erros.