# 📖 TUTORIAL COMPLETO - CHAMADA DE PACIENTES POR VOZ

## Sistema de Gerenciamento de Filas para Unidades de Saúde

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Acesso ao Sistema](#acesso-ao-sistema)
3. [Módulo Cadastro](#módulo-cadastro)
4. [Módulo Triagem](#módulo-triagem)
5. [Módulo Médico](#módulo-médico)
6. [Módulo Administrativo](#módulo-administrativo)
7. [Modo TV (Display Público)](#modo-tv-display-público)
8. [Chat Interno](#chat-interno)
9. [Configurações de Áudio](#configurações-de-áudio)
10. [Dicas e Boas Práticas](#dicas-e-boas-práticas)

---

## 🎯 Visão Geral

O **CHAMADA DE PACIENTES POR VOZ** é um sistema completo para gerenciamento de filas em unidades de saúde, permitindo:

- ✅ Cadastro de pacientes com níveis de prioridade
- ✅ Triagem e encaminhamento para procedimentos
- ✅ Chamada de pacientes pelo médico
- ✅ Anúncio por voz em TV de sala de espera
- ✅ Estatísticas e relatórios em PDF
- ✅ Chat interno entre setores
- ✅ Backup e restauração de dados

### Unidades Suportadas

O sistema suporta três unidades de saúde:
- Pronto Atendimento Pedro José de Menezes
- PSF Aguinalda Angélica
- UBS Maria Alves de Mendonça

> ⚠️ **IMPORTANTE**: Todos os dispositivos (computadores e TVs) devem estar logados na **mesma unidade** para sincronização funcionar corretamente.

---

## 🔐 Acesso ao Sistema

### Login Padrão (Funcionários)

```
👤 Usuário: saude
🔑 Senha: saude@1
```

**Passos:**
1. Selecione a **Unidade de Saúde** no dropdown
2. Digite o usuário: `saude`
3. Digite a senha: `saude@1`
4. Clique em **Entrar**

![Login Padrão](https://via.placeholder.com/600x400/1a1a2e/ffffff?text=Tela+de+Login)

### Login Modo TV (Display Público)

```
📺 Usuário: tv
🔑 Senha: tv
```

**Passos:**
1. Digite o usuário: `tv`
2. Digite a senha: `tv`
3. Selecione a **Unidade de Saúde** a ser exibida na TV
4. Clique em **Confirmar**
5. Clique na tela para **ativar o áudio**

> 💡 O modo TV entra automaticamente em tela cheia e esconde o cursor do mouse.

---

## 📝 Módulo Cadastro

O módulo **Cadastro** é responsável pelo registro inicial dos pacientes.

### Funcionalidades

| Função | Descrição |
|--------|-----------|
| 📋 **Registrar Paciente** | Adiciona novo paciente à fila |
| 🚨 **Definir Prioridade** | Emergência (vermelho), Prioridade (amarelo), Normal (verde) |
| 📤 **Encaminhar** | Envia paciente para triagem ou procedimento |
| 📝 **Observações** | Adiciona notas internas sobre o paciente |
| ✅ **Finalizar** | Conclui atendimento sem anúncio |

### Como Cadastrar um Paciente

1. **Digite o nome** do paciente no campo de texto
2. **Selecione a prioridade**:
   - 🔴 **Emergência** - Atendimento imediato
   - 🟡 **Prioridade** - Idosos, gestantes, deficientes
   - 🟢 **Normal** - Ordem de chegada
3. **Escolha o encaminhamento**:
   - Triagem
   - Sala de Eletrocardiograma
   - Sala de Curativos
   - Sala do Raio X
   - Enfermaria
   - Consultório 1 ou 2
4. **Clique em "Registrar"**

### Encaminhamento Silencioso

- ✅ Marque **"Encaminhar para triagem (sem áudio)"** para não anunciar na TV
- Útil quando o paciente já está na sala de espera

### Indicador de Tempo de Espera

- 🔴 Badge vermelho mostra tempo de espera
- ⚡ Badge pisca após **20 minutos** de espera

---

## 🩺 Módulo Triagem

O módulo **Triagem** é usado pela equipe de enfermagem para classificar e encaminhar pacientes.

### Interface

```
┌─────────────────────────────────────────┐
│  🔊 Som de Notificação  [ON/OFF]        │
├─────────────────────────────────────────┤
│  CHAMADA ATUAL                          │
│  ┌─────────────────────────────────┐   │
│  │ 👤 Nome do Paciente             │   │
│  │ 🏷️ Prioridade    ⏱️ Tempo      │   │
│  │ [Rechamar] [Finalizar Triagem]  │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│  FILA DE ESPERA                         │
│  1. Paciente A  🟢 Normal    5min       │
│  2. Paciente B  🟡 Prioridade 3min      │
│  3. Paciente C  🔴 Emergência 1min      │
└─────────────────────────────────────────┘
```

### Ações Disponíveis

| Botão | Função |
|-------|--------|
| 📢 **Chamar** | Chama paciente e anuncia na TV |
| 🔄 **Rechamar** | Repete o chamado do paciente atual |
| ✅ **Finalizar Triagem** | Conclui triagem (conta como atendimento) |
| ❌ **Desistência** | Paciente não compareceu |
| 📤 **Encaminhar** | Envia para médico ou procedimento |
| ✏️ **Observações** | Adiciona/edita notas internas |

### Encaminhamentos Disponíveis

- Consultório Médico 1
- Consultório Médico 2
- Sala de Eletrocardiograma
- Sala de Curativos
- Sala do Raio X
- Enfermaria

### Notificações de Novos Pacientes

Quando um novo paciente chega, o sistema:
- 🔊 Toca um som específico por prioridade
- 🔴 Mostra alerta visual pulsante na tela
- ⏱️ Duração do alerta:
  - Emergência: 5 segundos
  - Prioridade: 3 segundos
  - Normal: 2 segundos

---

## 👨‍⚕️ Módulo Médico

O módulo **Médico** é utilizado pelos médicos para chamar pacientes para consulta.

### Seleção de Consultório

**IMPORTANTE**: Selecione seu consultório antes de iniciar:

```
┌────────────────────────────┐
│ Selecione seu consultório: │
│ ▼ Consultório Médico 1     │
│   Consultório Médico 2     │
└────────────────────────────┘
```

> 💾 O sistema lembra sua última seleção

### Filas Separadas

Cada consultório possui sua própria fila independente:
- **Consultório 1**: Vê apenas pacientes encaminhados para Consultório 1
- **Consultório 2**: Vê apenas pacientes encaminhados para Consultório 2

### Fluxo de Atendimento

```
1. Paciente na fila
      │
      ▼
2. Médico clica "Chamar"
      │
      ▼
3. TV anuncia: "João Silva, por favor 
   dirija-se ao Consultório Médico 1"
      │
      ▼
4. Paciente aparece em "Chamada Atual"
      │
      ▼
5. Médico clica "Concluir Consulta"
   ou "Desistência"
```

### Ações do Médico

| Ação | Descrição |
|------|-----------|
| 📢 **Chamar** | Anuncia paciente na TV |
| 🔄 **Rechamar** | Repete chamado do paciente atual |
| ✅ **Concluir Consulta** | Finaliza atendimento com sucesso |
| ❌ **Desistência** | Paciente não compareceu |
| ✏️ **Observações** | Ver/adicionar notas da triagem |

---

## 📊 Módulo Administrativo

O módulo **Administrativo** oferece estatísticas, backup e gerenciamento do sistema.

### Dashboard de Estatísticas

```
┌─────────────────────────────────────────────────┐
│  📊 RESUMO DO DIA                               │
├─────────────────────────────────────────────────┤
│  Total de Chamadas: 45                          │
│  Triagem: 30  |  Médico: 15                     │
│  Tempo Médio de Espera: 12 min                  │
├─────────────────────────────────────────────────┤
│  📈 STATUS ATUAL                                │
│  Aguardando: 5  |  Em Triagem: 2  |  Médico: 1  │
│  Concluídos: 37 |  Desistências: 0              │
└─────────────────────────────────────────────────┘
```

### Estatísticas de Procedimentos

| Procedimento | Ícone | Contagem |
|--------------|-------|----------|
| Eletrocardiograma | ❤️ | XX |
| Curativos | 🩹 | XX |
| Raio X | 📷 | XX |
| Enfermaria | 🛏️ | XX |

### Gráficos Disponíveis

1. **Chamadas por Dia** - Linha temporal dos últimos 30 dias
2. **Chamadas por Hora** - Distribuição horária do dia
3. **Tipos de Atendimento** - Pizza com triagem vs médico

### Filtros de Pesquisa

- 📅 **Data Inicial** e **Data Final**
- 🔍 **Buscar por Nome** do paciente
- 📋 **Histórico Individual** do paciente

### Funções Administrativas

#### 📤 Exportar PDF

Gera relatório completo em PDF contendo:
- Resumo estatístico
- Gráficos
- Lista de atendimentos
- Rodapé com créditos

#### 💾 Backup

```
🔑 Senha: Paineiras@1
```

1. Clique em **"Backup"**
2. Digite a senha administrativa
3. Arquivo JSON será baixado

#### 📥 Restaurar Backup

1. Clique em **"Restaurar"**
2. Digite a senha administrativa
3. Selecione o arquivo JSON de backup
4. Aguarde a importação

#### 🗑️ Limpar Estatísticas

```
🔑 Senha: Paineiras@1
```

**Opções:**
- Limpar todas as unidades
- Limpar unidade específica

> ⚠️ Esta ação é **irreversível**!

#### 📊 Comparação de Unidades

```
🔑 Senha: Paineiras@1
```

Permite comparar desempenho entre as três unidades:
- Gráfico de barras empilhadas
- Ranking de produtividade com medalhas
- Indicadores de tendência (↑↗↓)

---

## 📺 Modo TV (Display Público)

O **Modo TV** é projetado para exibição em televisores na sala de espera.

### Características

- 🖥️ **Tela cheia automática**
- 🖱️ **Cursor oculto** (aparece ao mover mouse)
- 🔊 **Anúncios por voz** com nome e destino
- 🎬 **Vídeos** do Google Drive/YouTube
- 📰 **Ticker de notícias** na parte inferior
- 🌤️ **Previsão do tempo** rotativa
- ⏰ **Relógio digital** grande

### Layout da Tela

```
┌─────────────────────────────────────────────────────────┐
│  ⏰ 14:35          CHAMADA DE PACIENTES         🌤️ 28°C │
│                    Unidade de Saúde                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────────┐    ┌─────────────────────────┐   │
│   │   TRIAGEM       │    │   CONSULTÓRIO           │   │
│   │                 │    │                         │   │
│   │  👤 João Silva  │    │  👤 Maria Santos        │   │
│   │  → Triagem      │    │  → Consultório 1        │   │
│   │                 │    │                         │   │
│   │  Últimas:       │    │  Últimas:               │   │
│   │  • Ana Paula    │    │  • Pedro Lima           │   │
│   │  • Carlos Souza │    │  • Julia Costa          │   │
│   └─────────────────┘    └─────────────────────────┘   │
│                                                         │
│          ▶️ [Vídeo Institucional Reproduzindo]          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ 📰 G1 Prefeito anuncia novas obras • Folha Economia...  │
└─────────────────────────────────────────────────────────┘
```

### Anúncios por Voz

Quando um paciente é chamado:

1. 🔔 **Som de notificação** (1up.mp3)
2. 🗣️ **Voz anuncia**: *"João Silva, por favor dirija-se à Triagem"*
3. 📢 **Repete** o anúncio uma segunda vez
4. ✨ **Flash visual** na tela (azul para triagem, verde para médico)
5. 🔄 **Animações** pulsantes no card do paciente

### Anúncios de Hora

A cada ~20 minutos (3x por hora, aleatório):
- 🔔 Som suave de notificação
- 🗣️ *"Bom dia! São 14 horas e 35 minutos"*
- 🔄 Repete duas vezes

> 🌙 Silenciado entre 22h e 6h

### Ticker de Notícias

- 📰 35+ fontes de notícias brasileiras
- 🔄 Atualiza a cada 3 minutos
- 🏷️ Badge colorido com nome da fonte
- ℹ️ Créditos aparecem periodicamente

### Previsão do Tempo

- 🌡️ 30 cidades de Minas Gerais
- 🔄 Rotação a cada 10 segundos
- ⭐ Paineiras-MG aparece a cada 5ª cidade
- 💾 Dados em cache (atualiza cada 15 min)

### Playlist de Vídeos

Configure até 10 vídeos do Google Drive ou YouTube:
1. Vá em **Administrativo**
2. Clique em **Configurar Vídeos**
3. Cole os links dos vídeos
4. Salve

> 💡 Google Drive permite som automático; YouTube é silenciado

### Sair do Modo TV

1. Mova o mouse para ver o cursor
2. Clique no botão **X** discreto (canto inferior direito)
3. Confirme na caixa de diálogo

---

## 💬 Chat Interno

Sistema de comunicação em tempo real entre os setores.

### Setores

| Setor | Cor | Localização |
|-------|-----|-------------|
| 📋 Cadastro | 🔵 Azul | Recepção |
| 🩺 Triagem | 🟡 Amarelo | Enfermagem |
| 👨‍⚕️ Médico | 🟢 Verde | Consultório |

### Funcionalidades

- 📤 **Enviar mensagem** para setor específico ou todos
- 👁️ **Indicador de digitação** em tempo real
- 😀 **Emojis** rápidos
- 🔔 **Sons distintos** por setor remetente
- 🔴 **Badge** de mensagens não lidas
- 🗑️ **Limpar chat** (só do seu setor)

### Como Usar

1. Selecione o **destinatário** (ou "Todos")
2. Digite sua mensagem
3. Pressione **Enter** ou clique em enviar
4. Mensagens são excluídas automaticamente após **24 horas**

---

## ⚙️ Configurações de Áudio

Acesse pelo ícone de engrenagem ⚙️ no cabeçalho.

### Volumes Ajustáveis

| Configuração | Descrição |
|--------------|-----------|
| 🔔 **Notificação de Chamada** | Som antes do anúncio |
| 🗣️ **Voz TTS (Chamada)** | Volume da voz do paciente |
| ⏰ **Notificação de Hora** | Som antes do anúncio de hora |
| 🕐 **Voz de Hora** | Volume da voz do horário |

### Configurar Vozes

No módulo **Administrativo**, clique em **"Configurar Vozes"**:

**Vozes Femininas:**
- Alice, Aria, Domi, Elli, Bella, Rachel

**Vozes Masculinas:**
- Antonio, Arnold, Adam, Sam, Josh, Clyde

> 🎧 Clique em **"Testar"** para ouvir cada voz

**Configurações separadas para:**
- Anúncio de Horas
- Chamada de Pacientes

> 💾 Preferências salvas por unidade de saúde

---

## 💡 Dicas e Boas Práticas

### Configuração Inicial

1. ✅ Todos os PCs devem estar na **mesma rede**
2. ✅ Todos logados na **mesma unidade de saúde**
3. ✅ TV configurada com usuário `tv/tv`
4. ✅ Clicar na tela da TV para **ativar áudio**

### Prioridades

- 🔴 **Emergência**: Use apenas para casos graves
- 🟡 **Prioridade**: Idosos 60+, gestantes, lactantes, deficientes
- 🟢 **Normal**: Demais pacientes

### Evitar Problemas

| Problema | Solução |
|----------|---------|
| Paciente não aparece | Verificar se todos estão na mesma unidade |
| Áudio não funciona | Clicar na tela para ativar |
| Dados não sincronizam | Verificar conexão de internet |
| Tela travada | Aguardar 10min (auto-reload) ou F5 |

### Backup Regular

- 📅 Faça backup **semanal** dos dados
- 💾 Guarde em local seguro
- 📋 Anote a data do backup

### Senhas do Sistema

| Função | Senha |
|--------|-------|
| Login funcionário | `saude@1` |
| Login TV | `tv` |
| Funções administrativas | `Paineiras@1` |

---

## 🆘 Suporte

### Problemas Comuns

**TV não anuncia pacientes:**
1. Verificar se áudio foi ativado (clicar na tela)
2. Verificar volume do sistema
3. Verificar se está na mesma unidade

**Chat não funciona:**
1. Verificar conexão de internet
2. Verificar se está logado corretamente

**Estatísticas zeradas:**
1. Dados são compactados após 30 dias
2. Verificar filtro de data selecionado

---

## 📜 Créditos

**Solução criada e cedida gratuitamente por Kalebe Gomes**

---

*Versão do Tutorial: 1.0*
*Última atualização: Dezembro 2024*
