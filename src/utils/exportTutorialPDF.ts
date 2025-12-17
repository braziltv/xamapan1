import jsPDF from 'jspdf';

export const exportTutorialPDF = () => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 6;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const addPage = () => {
    doc.addPage();
    y = margin;
    // Header em todas as páginas
    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, pageWidth, 8, 'F');
  };

  const checkPageBreak = (height: number = lineHeight * 2) => {
    if (y + height > pageHeight - 25) {
      addPage();
    }
  };

  const addTitle = (text: string, size: number = 16) => {
    checkPageBreak(size + 15);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin - 5, y - 5, maxWidth + 10, size + 8, 3, 3, 'F');
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(text, margin, y + 3);
    y += size + 10;
  };

  const addSubtitle = (text: string) => {
    checkPageBreak(18);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(text, margin, y);
    y += 8;
  };

  const addText = (text: string, indent: number = 0) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    const lines = doc.splitTextToSize(text, maxWidth - indent);
    lines.forEach((line: string) => {
      checkPageBreak();
      doc.text(line, margin + indent, y);
      y += lineHeight;
    });
  };

  const addBullet = (text: string, icon: string = '•') => {
    checkPageBreak();
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    doc.setTextColor(220, 38, 38);
    doc.text(icon, margin + 3, y);
    doc.setTextColor(55, 65, 81);
    const lines = doc.splitTextToSize(text, maxWidth - 15);
    lines.forEach((line: string, index: number) => {
      if (index > 0) checkPageBreak();
      doc.text(line, margin + 12, y);
      y += lineHeight;
    });
  };

  const addSpacer = (size: number = 5) => {
    y += size;
  };

  const addInfoBox = (title: string, content: string[], bgColor: number[] = [239, 246, 255]) => {
    checkPageBreak(30);
    const boxHeight = 8 + content.length * 7;
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.roundedRect(margin, y, maxWidth, boxHeight, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    doc.text(title, margin + 5, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    content.forEach((line, index) => {
      doc.text(line, margin + 5, y + 13 + index * 6);
    });
    y += boxHeight + 8;
  };

  const addTableHeader = (cols: string[], widths: number[]) => {
    checkPageBreak(12);
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(margin, y - 5, maxWidth, 10, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    let x = margin + 3;
    cols.forEach((col, i) => {
      doc.text(col, x, y);
      x += widths[i];
    });
    y += 8;
  };

  const addTableRow = (cols: string[], widths: number[], isAlt: boolean = false) => {
    checkPageBreak(10);
    if (isAlt) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 4, maxWidth, 8, 'F');
    }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    let x = margin + 3;
    cols.forEach((col, i) => {
      doc.text(col, x, y);
      x += widths[i];
    });
    y += 8;
  };

  // ==================== CAPA ====================
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 0, pageWidth, 70, 'F');
  
  // Decoração
  doc.setFillColor(185, 28, 28);
  doc.rect(0, 60, pageWidth, 10, 'F');
  
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('MANUAL DO USUARIO', pageWidth / 2, 32, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Chamada de Pacientes por Voz', pageWidth / 2, 48, { align: 'center' });
  
  y = 90;
  
  // Box de apresentação
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, maxWidth, 50, 5, 5, 'F');
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, maxWidth, 50, 5, 5, 'S');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  doc.text('Este manual apresenta todas as funcionalidades do sistema', pageWidth / 2, y + 15, { align: 'center' });
  doc.text('de gerenciamento de filas para unidades de saude,', pageWidth / 2, y + 23, { align: 'center' });
  doc.text('incluindo cadastro, triagem, atendimento medico e', pageWidth / 2, y + 31, { align: 'center' });
  doc.text('exibicao em TV para sala de espera.', pageWidth / 2, y + 39, { align: 'center' });
  
  y = 160;
  
  // Recursos
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text('RECURSOS DO SISTEMA', pageWidth / 2, y, { align: 'center' });
  
  y += 12;
  const recursos = [
    'Cadastro de pacientes com prioridades',
    'Triagem e encaminhamento',
    'Chamada por voz em TV',
    'Estatisticas e relatorios',
    'Chat interno entre setores',
    'Backup e restauracao'
  ];
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  recursos.forEach((r, i) => {
    const col = i < 3 ? 0 : 1;
    const row = i % 3;
    const xPos = col === 0 ? margin + 20 : pageWidth / 2 + 10;
    doc.text('✓  ' + r, xPos, y + row * 8);
  });
  
  // Rodapé da capa
  y = pageHeight - 30;
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text('Solucao desenvolvida por Kalebe Gomes', pageWidth / 2, y, { align: 'center' });
  doc.text('Versao 1.0 | Dezembro 2024', pageWidth / 2, y + 6, { align: 'center' });

  // ==================== ÍNDICE ====================
  addPage();
  addTitle('INDICE');
  addSpacer(5);
  
  const chapters = [
    { num: '01', title: 'Visao Geral do Sistema', page: '3' },
    { num: '02', title: 'Acesso ao Sistema', page: '4' },
    { num: '03', title: 'Modulo Cadastro', page: '5' },
    { num: '04', title: 'Modulo Triagem', page: '6' },
    { num: '05', title: 'Modulo Medico', page: '7' },
    { num: '06', title: 'Modulo Administrativo', page: '8' },
    { num: '07', title: 'Modo TV (Display Publico)', page: '9' },
    { num: '08', title: 'Chat Interno', page: '10' },
    { num: '09', title: 'Configuracoes de Audio', page: '11' },
    { num: '10', title: 'Dicas e Boas Praticas', page: '12' },
  ];
  
  chapters.forEach((ch, i) => {
    checkPageBreak(12);
    const isAlt = i % 2 === 0;
    if (isAlt) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 4, maxWidth, 10, 'F');
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(ch.num, margin + 5, y);
    doc.setTextColor(55, 65, 81);
    doc.setFont('helvetica', 'normal');
    doc.text(ch.title, margin + 20, y);
    doc.setTextColor(150, 150, 150);
    doc.text(ch.page, margin + maxWidth - 10, y);
    y += 10;
  });

  // ==================== VISÃO GERAL ====================
  addPage();
  addTitle('01. VISAO GERAL DO SISTEMA');
  addSpacer(3);
  
  addText('O Sistema de Chamada de Pacientes por Voz e uma solucao completa para gerenciamento de filas em unidades de saude, oferecendo controle total do fluxo de atendimento.');
  addSpacer(5);
  
  addSubtitle('Principais Funcionalidades');
  addBullet('Cadastro de pacientes com tres niveis de prioridade', '▸');
  addBullet('Triagem e encaminhamento para procedimentos ou consultas', '▸');
  addBullet('Chamada de pacientes com anuncio por voz', '▸');
  addBullet('Exibicao em TV para sala de espera', '▸');
  addBullet('Estatisticas detalhadas e relatorios em PDF', '▸');
  addBullet('Comunicacao interna entre setores via chat', '▸');
  addBullet('Sistema de backup e restauracao de dados', '▸');
  
  addSpacer(8);
  addSubtitle('Unidades de Saude Suportadas');
  addBullet('Pronto Atendimento Pedro Jose de Menezes', '●');
  addBullet('PSF Aguinalda Angelica', '●');
  addBullet('UBS Maria Alves de Mendonca', '●');
  
  addSpacer(8);
  addInfoBox('IMPORTANTE', [
    'Todos os dispositivos (computadores e TVs) devem estar',
    'logados na MESMA UNIDADE para a sincronizacao funcionar.'
  ], [254, 243, 199]);

  // ==================== ACESSO AO SISTEMA ====================
  addPage();
  addTitle('02. ACESSO AO SISTEMA');
  addSpacer(3);
  
  addSubtitle('Login para Funcionarios');
  addText('O acesso ao sistema e feito atraves da tela de login, onde o funcionario seleciona a unidade de saude e informa suas credenciais.');
  addSpacer(3);
  
  addText('Passos para acessar:');
  addBullet('Selecione a Unidade de Saude no menu dropdown', '1.');
  addBullet('Informe o usuario e senha fornecidos pelo administrador', '2.');
  addBullet('Clique no botao "Entrar"', '3.');
  
  addSpacer(8);
  addSubtitle('Login para Modo TV');
  addText('O modo TV e utilizado para exibicao em televisores na sala de espera. Possui credenciais especificas e interface otimizada.');
  addSpacer(3);
  
  addText('Passos para configurar a TV:');
  addBullet('Informe as credenciais do modo TV', '1.');
  addBullet('Selecione a unidade de saude a ser exibida', '2.');
  addBullet('Clique em "Confirmar"', '3.');
  addBullet('Clique na tela para ATIVAR O AUDIO', '4.');
  
  addSpacer(8);
  addInfoBox('DICA', [
    'O modo TV entra automaticamente em tela cheia',
    'e esconde o cursor do mouse para melhor visualizacao.'
  ], [220, 252, 231]);

  // ==================== MÓDULO CADASTRO ====================
  addPage();
  addTitle('03. MODULO CADASTRO');
  addSpacer(3);
  
  addText('O modulo Cadastro e o ponto de entrada dos pacientes no sistema. Aqui sao registradas as informacoes iniciais e definida a prioridade de atendimento.');
  addSpacer(5);
  
  addSubtitle('Como Cadastrar um Paciente');
  addBullet('Digite o nome completo do paciente', '1.');
  addBullet('Selecione o nivel de prioridade adequado', '2.');
  addBullet('Escolha o destino de encaminhamento', '3.');
  addBullet('Clique em "Registrar" para confirmar', '4.');
  
  addSpacer(8);
  addSubtitle('Niveis de Prioridade');
  addSpacer(3);
  addTableHeader(['Nivel', 'Cor', 'Indicacao'], [50, 40, 80]);
  addTableRow(['EMERGENCIA', 'Vermelho', 'Casos graves, risco de vida'], [50, 40, 80], false);
  addTableRow(['PRIORIDADE', 'Amarelo', 'Idosos, gestantes, deficientes'], [50, 40, 80], true);
  addTableRow(['NORMAL', 'Verde', 'Demais pacientes'], [50, 40, 80], false);
  
  addSpacer(8);
  addSubtitle('Opcoes de Encaminhamento');
  addBullet('Triagem - Classificacao de risco', '→');
  addBullet('Sala de Eletrocardiograma', '→');
  addBullet('Sala de Curativos', '→');
  addBullet('Sala do Raio X', '→');
  addBullet('Enfermaria', '→');
  addBullet('Consultorio Medico 1 ou 2', '→');
  
  addSpacer(5);
  addInfoBox('ENCAMINHAMENTO SILENCIOSO', [
    'Marque a opcao "sem audio" para registrar o paciente',
    'sem anunciar na TV da sala de espera.'
  ], [239, 246, 255]);

  // ==================== MÓDULO TRIAGEM ====================
  addPage();
  addTitle('04. MODULO TRIAGEM');
  addSpacer(3);
  
  addText('O modulo Triagem e utilizado pela equipe de enfermagem para classificar os pacientes e encaminha-los ao destino adequado.');
  addSpacer(5);
  
  addSubtitle('Interface Principal');
  addText('A tela e dividida em duas secoes: "Chamada Atual" (paciente sendo atendido) e "Fila de Espera" (proximos pacientes).');
  addSpacer(5);
  
  addSubtitle('Acoes Disponiveis');
  addSpacer(3);
  addTableHeader(['Acao', 'Descricao'], [50, 120]);
  addTableRow(['Chamar', 'Chama o paciente e anuncia na TV'], [50, 120], false);
  addTableRow(['Rechamar', 'Repete o chamado do paciente atual'], [50, 120], true);
  addTableRow(['Finalizar', 'Conclui a triagem com sucesso'], [50, 120], false);
  addTableRow(['Desistencia', 'Registra que paciente nao compareceu'], [50, 120], true);
  addTableRow(['Encaminhar', 'Envia para medico ou procedimento'], [50, 120], false);
  addTableRow(['Observacoes', 'Adiciona notas sobre o paciente'], [50, 120], true);
  
  addSpacer(8);
  addSubtitle('Notificacoes de Novos Pacientes');
  addText('Quando um novo paciente entra na fila, o sistema emite:');
  addBullet('Som de alerta especifico por prioridade', '●');
  addBullet('Alerta visual pulsante na tela', '●');
  addSpacer(3);
  addText('Duracao do alerta visual:');
  addBullet('Emergencia: 5 segundos', '•');
  addBullet('Prioridade: 3 segundos', '•');
  addBullet('Normal: 2 segundos', '•');

  // ==================== MÓDULO MÉDICO ====================
  addPage();
  addTitle('05. MODULO MEDICO');
  addSpacer(3);
  
  addText('O modulo Medico permite que os profissionais chamem pacientes para consulta, com anuncio automatico na TV da sala de espera.');
  addSpacer(5);
  
  addSubtitle('Selecao de Consultorio');
  addText('Antes de iniciar, selecione seu consultorio:');
  addBullet('Consultorio Medico 1', '●');
  addBullet('Consultorio Medico 2', '●');
  addSpacer(3);
  addText('O sistema memoriza sua ultima selecao automaticamente.');
  
  addSpacer(8);
  addSubtitle('Filas Independentes');
  addText('Cada consultorio possui sua propria fila de pacientes. Um medico no Consultorio 1 vera apenas os pacientes encaminhados para o Consultorio 1.');
  
  addSpacer(8);
  addSubtitle('Fluxo de Atendimento');
  addBullet('Paciente aparece na fila apos encaminhamento da triagem', '1.');
  addBullet('Medico clica em "Chamar" para anunciar na TV', '2.');
  addBullet('Paciente e movido para "Chamada Atual"', '3.');
  addBullet('Apos consulta, clique em "Concluir Consulta"', '4.');
  
  addSpacer(8);
  addSubtitle('Acoes do Medico');
  addTableHeader(['Acao', 'Descricao'], [55, 115]);
  addTableRow(['Chamar', 'Anuncia o paciente na TV'], [55, 115], false);
  addTableRow(['Rechamar', 'Repete o anuncio do paciente'], [55, 115], true);
  addTableRow(['Concluir', 'Finaliza a consulta com sucesso'], [55, 115], false);
  addTableRow(['Desistencia', 'Paciente nao compareceu'], [55, 115], true);

  // ==================== MÓDULO ADMINISTRATIVO ====================
  addPage();
  addTitle('06. MODULO ADMINISTRATIVO');
  addSpacer(3);
  
  addText('O modulo Administrativo oferece ferramentas de gestao, estatisticas detalhadas e funcoes de manutencao do sistema.');
  addSpacer(5);
  
  addSubtitle('Dashboard de Estatisticas');
  addBullet('Total de chamadas do dia', '●');
  addBullet('Divisao entre triagem e consultas medicas', '●');
  addBullet('Tempo medio de espera dos pacientes', '●');
  addBullet('Status atual: aguardando, em atendimento, concluidos', '●');
  
  addSpacer(5);
  addSubtitle('Estatisticas de Procedimentos');
  addBullet('Eletrocardiogramas realizados', '●');
  addBullet('Curativos realizados', '●');
  addBullet('Exames de Raio X', '●');
  addBullet('Encaminhamentos para enfermaria', '●');
  
  addSpacer(5);
  addSubtitle('Graficos Disponiveis');
  addBullet('Chamadas por Dia - Historico dos ultimos 30 dias', '●');
  addBullet('Chamadas por Hora - Distribuicao ao longo do dia', '●');
  addBullet('Tipos de Atendimento - Proporcao triagem vs medico', '●');
  
  addSpacer(5);
  addSubtitle('Funcoes Administrativas');
  addBullet('Exportar Relatorio PDF - Gera documento completo', '●');
  addBullet('Backup - Exporta todos os dados em arquivo JSON', '●');
  addBullet('Restaurar - Importa dados de backup anterior', '●');
  addBullet('Comparacao de Unidades - Analise comparativa', '●');
  
  addSpacer(5);
  addInfoBox('ACESSO RESTRITO', [
    'Algumas funcoes administrativas requerem autenticacao',
    'com senha de administrador do sistema.'
  ], [254, 226, 226]);

  // ==================== MODO TV ====================
  addPage();
  addTitle('07. MODO TV (DISPLAY PUBLICO)');
  addSpacer(3);
  
  addText('O Modo TV foi projetado para exibicao em televisores nas salas de espera, com interface limpa e anuncios por voz.');
  addSpacer(5);
  
  addSubtitle('Caracteristicas da Interface');
  addBullet('Tela cheia automatica', '●');
  addBullet('Cursor do mouse oculto', '●');
  addBullet('Relogio digital grande e visivel', '●');
  addBullet('Previsao do tempo rotativa (30 cidades de MG)', '●');
  addBullet('Ticker de noticias na parte inferior', '●');
  addBullet('Reproducao de videos institucionais', '●');
  
  addSpacer(5);
  addSubtitle('Anuncios por Voz');
  addText('Quando um paciente e chamado, o sistema executa:');
  addBullet('Som de notificacao', '1.');
  addBullet('Anuncio: "Nome, por favor dirija-se ao [destino]"', '2.');
  addBullet('Repeticao automatica do anuncio', '3.');
  addBullet('Flash visual colorido na tela', '4.');
  
  addSpacer(5);
  addSubtitle('Anuncios de Hora');
  addText('O sistema anuncia a hora atual periodicamente:');
  addBullet('3 anuncios por hora em intervalos aleatorios', '●');
  addBullet('Silenciado automaticamente entre 22h e 6h', '●');
  addBullet('Inclui saudacao: "Bom dia/tarde/noite"', '●');
  
  addSpacer(5);
  addSubtitle('Como Sair do Modo TV');
  addBullet('Mova o mouse para exibir o cursor', '1.');
  addBullet('Clique no botao X (canto inferior direito)', '2.');
  addBullet('Confirme na caixa de dialogo', '3.');

  // ==================== CHAT INTERNO ====================
  addPage();
  addTitle('08. CHAT INTERNO');
  addSpacer(3);
  
  addText('O sistema de chat permite comunicacao instantanea entre os setores da unidade de saude.');
  addSpacer(5);
  
  addSubtitle('Setores Conectados');
  addTableHeader(['Setor', 'Cor', 'Localizacao'], [50, 40, 80]);
  addTableRow(['Cadastro', 'Azul', 'Recepcao'], [50, 40, 80], false);
  addTableRow(['Triagem', 'Amarelo', 'Sala de enfermagem'], [50, 40, 80], true);
  addTableRow(['Medico', 'Verde', 'Consultorio'], [50, 40, 80], false);
  
  addSpacer(8);
  addSubtitle('Funcionalidades');
  addBullet('Enviar mensagem para setor especifico ou para todos', '●');
  addBullet('Indicador em tempo real de quem esta digitando', '●');
  addBullet('Emojis rapidos para respostas ageis', '●');
  addBullet('Sons distintos identificam o setor remetente', '●');
  addBullet('Badge de notificacao para mensagens nao lidas', '●');
  
  addSpacer(5);
  addSubtitle('Como Usar');
  addBullet('Selecione o destinatario (setor ou "Todos")', '1.');
  addBullet('Digite sua mensagem no campo de texto', '2.');
  addBullet('Pressione Enter ou clique em enviar', '3.');
  
  addSpacer(5);
  addInfoBox('LIMPEZA AUTOMATICA', [
    'As mensagens sao excluidas automaticamente',
    'apos 24 horas para manter o historico limpo.'
  ], [239, 246, 255]);

  // ==================== CONFIGURAÇÕES DE ÁUDIO ====================
  addPage();
  addTitle('09. CONFIGURACOES DE AUDIO');
  addSpacer(3);
  
  addText('O sistema oferece controle completo sobre os volumes e vozes utilizados nos anuncios.');
  addSpacer(5);
  
  addSubtitle('Ajuste de Volumes');
  addText('Acesse pelo icone de engrenagem no cabecalho:');
  addSpacer(3);
  addTableHeader(['Configuracao', 'Descricao'], [60, 110]);
  addTableRow(['Notif. Chamada', 'Som antes do anuncio de paciente'], [60, 110], false);
  addTableRow(['Voz TTS', 'Volume da voz nos anuncios'], [60, 110], true);
  addTableRow(['Notif. Hora', 'Som antes do anuncio de hora'], [60, 110], false);
  addTableRow(['Voz Hora', 'Volume da voz nas horas'], [60, 110], true);
  
  addSpacer(8);
  addSubtitle('Selecao de Vozes');
  addText('No modulo Administrativo, acesse "Configurar Vozes":');
  addSpacer(3);
  addText('Vozes Femininas: Alice, Aria, Domi, Elli, Bella, Rachel');
  addText('Vozes Masculinas: Antonio, Arnold, Adam, Sam, Josh, Clyde');
  addSpacer(5);
  addBullet('Clique em "Testar" para ouvir cada voz', '●');
  addBullet('Configure vozes diferentes para horas e chamadas', '●');
  addBullet('Preferencias sao salvas por unidade de saude', '●');

  // ==================== DICAS E BOAS PRÁTICAS ====================
  addPage();
  addTitle('10. DICAS E BOAS PRATICAS');
  addSpacer(3);
  
  addSubtitle('Configuracao Inicial');
  addBullet('Verifique se todos os PCs estao na mesma rede', '✓');
  addBullet('Confirme que todos estao logados na mesma unidade', '✓');
  addBullet('Configure a TV com as credenciais apropriadas', '✓');
  addBullet('Clique na tela da TV para ativar o audio', '✓');
  
  addSpacer(5);
  addSubtitle('Uso Correto das Prioridades');
  addBullet('EMERGENCIA: Apenas casos graves com risco de vida', '●');
  addBullet('PRIORIDADE: Idosos 60+, gestantes, lactantes, PcD', '●');
  addBullet('NORMAL: Todos os demais pacientes', '●');
  
  addSpacer(5);
  addSubtitle('Solucao de Problemas Comuns');
  addSpacer(3);
  addTableHeader(['Problema', 'Solucao'], [60, 110]);
  addTableRow(['Paciente nao aparece', 'Verificar se mesma unidade'], [60, 110], false);
  addTableRow(['Audio nao funciona', 'Clicar na tela para ativar'], [60, 110], true);
  addTableRow(['Dados nao sincronizam', 'Verificar conexao internet'], [60, 110], false);
  addTableRow(['Tela travada', 'Aguardar auto-reload ou F5'], [60, 110], true);
  
  addSpacer(8);
  addSubtitle('Backup Regular');
  addBullet('Realize backup semanal dos dados', '●');
  addBullet('Armazene os arquivos em local seguro', '●');
  addBullet('Mantenha registro das datas de backup', '●');
  
  addSpacer(8);
  addInfoBox('SUPORTE', [
    'Em caso de duvidas ou problemas tecnicos,',
    'entre em contato com o administrador do sistema.'
  ], [220, 252, 231]);

  // ==================== RODAPÉ EM TODAS AS PÁGINAS ====================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Linha separadora
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
    
    // Texto do rodapé
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    
    if (i > 1) {
      doc.text('Sistema de Chamada de Pacientes por Voz', margin, pageHeight - 12);
      doc.text(`Pagina ${i - 1} de ${totalPages - 1}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
      doc.text('Desenvolvido por Kalebe Gomes', pageWidth / 2, pageHeight - 12, { align: 'center' });
    }
  }

  // Salvar
  doc.save('Manual_Chamada_Pacientes.pdf');
};
