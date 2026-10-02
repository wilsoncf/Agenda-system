# Agenda Semanal

Aplicação web responsiva de agenda semanal para gerenciamento de compromissos com suporte completo a histórico de operações (**Desfazer / Refazer**).

Uma demo foi disponibilizada em : https://agenda-wilson.duckdns.org

---

## Sumário

- [Visão Geral](#visão-geral)
- [Como Executar](#como-executar)
- [Arquitetura e Organização](#arquitetura-e-organização)
- [Modelo de Estado e Histórico (Undo / Redo)](#modelo-de-estado-e-histórico-undo--redo)
- [Decisões Técnicas e Trade-offs](#decisões-técnicas-e-trade-offs)
---

## Visão Geral

A aplicação disponibiliza uma grade semanal interativa onde compromissos são posicionados verticalmente e distribuídos horizontalmente em caso de sobreposição de horários.

### Funcionalidades Principais

- **Visualização Semanal**: Grade de 7 dias (Segunda a Domingo) com eixo de horários das 07:00 às 22:00 e navegação entre semanas.
- **Gestão Completa de Compromissos**:
  - Criação de compromissos.
  - Edição com preenchimento automático dos dados atuais.
  - Mutação de horário, data e duração com atalhos rápidos (`15m`, `30m`, `45m`, `1h`, `1h30`, `2h`).
- **Histórico Transacional (Undo / Redo)**:
  - Registro de snapshots imutáveis a cada mutação de compromisso.
  - Desfazer (`Ctrl + Z` / `Cmd + Z`) e Refazer (`Ctrl + Shift + Z` / `Cmd + Shift + Z` ou `Ctrl + Y`).

---

## Como Executar

### Pré-requisitos

- **Node.js**: v20+ 
- **npm**: v10+

### Instalação

```bash
# Clone o repositório
git clone https://github.com/wilsoncf/Agenda-system.git
cd Agenda-system

# Instale as dependências
npm install
```

### Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

### Testes
```bash
npm run test
```

### Build de Produção

```bash
# Executa a compilação otimizada do Next.js
npm run build

# Inicia o servidor em modo produção
npm run start
```

---

## Arquitetura e Organização

A arquitetura do projeto segue uma separação rigorosa de camadas orientada a domínio e responsabilidades limpas:

```text
src/
├── app/
│   ├── layout.tsx             # Layout raiz da aplicação
│   ├── page.tsx               # Página principal da agenda
│   ├── globals.css            # Estilos globais
│   └── favicon.ico            # Ícone da aplicação
│
├── components/
│   ├── ui/                    # Primitivas visuais reutilizáveis
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   └── label.tsx
│   │
│   ├── appointment/           # Componentes de criação e edição
│   │   ├── appointment-dialog.tsx
│   │   ├── appointment-form.tsx
│   │   ├── appointment-form-utils.ts
│   │   ├── appointment-time-fields.tsx
│   │   └── delete-confirm-dialog.tsx
│   │
│   └── calendar/              # Componentes visuais da agenda semanal
│       ├── agenda-shell.tsx
│       ├── appointment-card.tsx
│       ├── calendar-header.tsx
│       ├── day-column.tsx
│       ├── time-axis.tsx
│       └── weekly-grid.tsx
│
├── domain/
│   ├── appointment/           # Conceitos e regras puras de compromissos
│   │   ├── fixtures.ts         # Dados iniciais de demonstração
│   │   ├── operations.ts       # Operações puras de criação, edição e movimento
│   │   ├── types.ts            # Tipos Appointment e AppointmentDocument
│   │   └── validation.ts       # Validação das regras do compromisso
│   │
│   └── history/               # Modelo genérico e puro de histórico
│       ├── history.ts          # createHistory, commit, undo e redo
│       └── index.ts            # API pública do domínio de histórico
│
├── features/
│   └── calendar/              # Comportamento da funcionalidade de agenda
│       ├── index.ts            # API pública da feature
│       ├── use-calendar-shortcuts.ts  # Atalhos de teclado da agenda
│       └── model/              # Estado, comandos e orquestração da feature
│           ├── agenda-actions.ts
│           │                       # Estado, ações e contratos de comandos
│           ├── agenda-commands.ts
│           │                       # Comandos semânticos da agenda
│           ├── agenda-reducer.ts
│           │                       # Transições de estado e transações de histórico
│           ├── use-agenda-persistence.ts
│           │                       # Hydration e autosave no localStorage
│           └── index.ts         # API pública do modelo da agenda
│
├── lib/
│   ├── date/
│   │   ├── calendar-utils.ts   # Cálculos de semana e posicionamento
│   │   ├── gesture-utils.ts    # Conversão de gestos em horários
│   │   └── time-utils.ts       # Conversão e aritmética de horários
│   ├── storage/
│   │   └── appointment-storage.ts
│   │                         # Leitura e gravação persistente de compromissos
│   └── utils.ts                # Utilitários compartilhados
│
└── providers/
    └── agenda-provider.tsx     # Contexto, useReducer e composição da aplicação
```

### Princípios Arquiteturais Aplicados

1. **Domínio Puro (`domain/`)**: Não importa React, hooks ou APIs de browser. Qualquer função pode ser executada e testada de forma determinística isoladamente.
2. **Fronteira Transacional Centralizada (`providers/agenda-provider.tsx`)**: Nenhum componente de tela altera diretamente o array de histórico ou realiza manipulações arbitrárias de snapshots. Todo comando semântico (`createAppointment`, `updateAppointment`, `deleteAppointment`, `moveAppointment`, `resizeAppointment`) converge para o redutor central.
3. **Imutabilidade Estrita**: Objetos `Appointment` utilizam modificadores `readonly`. As operações produzem novas referências imutáveis via spread sintático e métodos funcionais.
4. **Proteção contra No-Ops**: Modificações que não alteram nenhum campo de um compromisso (`areAppointmentsEqual`) são ignoradas e não criam entradas vazias no histórico.

---

## Modelo de Estado e Histórico (Undo / Redo)

O gerenciamento de histórico foi modelado com base no padrão clássico de snapshots imutáveis:

```typescript
type HistoryState<T> = {
  readonly past: ReadonlyArray<T>;
  readonly present: T;
  readonly future: ReadonlyArray<T>;
};
```

Onde `T` representa o documento de compromissos (`AppointmentDocument = ReadonlyArray<Appointment>`).

### Invariantes Garantidas

| Invariante | Descrição |
|---|---|
| **Ação Atômica** | 1 ação do usuário (ex: submissão de formulário ou exclusão) = 1 transação de histórico. |
| **Desfazer (Undo)** | Restaura o snapshot anterior de `past` para `present` e move o atual para `future`. |
| **Refazer (Redo)** | Restaura o snapshot de `future` para `present` e move o atual para `past`. |
| **Invalidação de Redo** | Qualquer nova mutação em `present` descarta imediatamente toda a pilha `future`. |
| **Separação Estado de Domínio vs Estado de UI** | Seleção de compromisso, navegação de semana e visibilidade de diálogos residem fora do histórico. Desfazer ou refazer nunca altera a semana visualizada. |
| **Segurança de Seleção** | Ao desfazer a criação de um compromisso atualmente selecionado, a seleção é limpa automaticamente pelo reducer para evitar referências nulas/fantasmas. Se o compromisso persistir após o Undo/Redo, a seleção é preservada. |

---

## Decisões Técnicas e Trade-offs


- **React Reducer + Context API**: O uso de `useReducer` nativo para o requisito de histórico.
- **Strict TypeScript com `noUncheckedIndexedAccess`**: Tipagem estrita máxima habilitada. Nenhum tipo `any` ou type assertion inseguro é permitido no código-fonte.
- **Algoritmo Guloso de Sobreposição (`layoutDayAppointments`)**: Em vez de ocultar compromissos com horários coincidentes ou sobrepô-los cegamente, implementou-se um algoritmo guloso de coloração de intervalos que calcula clusters de sobreposição e distribui horizontalmente a largura disponível (`widthPct`, `leftPct`) de forma proporcional e legível.
- **Cálculo Temporal baseado em Minutos a partir da Meia-noite**: Horários (`HH:mm`) são convertidos para inteiros de minutos (`09:30` -> `570`) nas fronteiras de cálculo, evitando erros de ponto flutuante ou discrepâncias de fuso horário causadas por instâncias de `Date`.
- **Proteção de Atalhos em Elementos Editáveis**: O hook `useCalendarShortcuts` inspeciona a origem dos eventos do teclado (`INPUT`, `TEXTAREA`, `isContentEditable`) via `isEditableElement`. Isso garante que o atalho `Ctrl+Z` nativo de campos de texto do navegador funcione sem ser interceptado pela aplicação.

---


