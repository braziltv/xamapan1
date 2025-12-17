import jsPDF from 'jspdf';

export const exportTutorialPDF = () => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 6;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  // ==================== FUNÇÕES AUXILIARES ====================
  
  const addPage = () => {
    doc.addPage();
    y = margin;
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
    doc.setTextColor(220, 38, 38);
    doc.text(icon, margin + 3, y);
    doc.setTextColor(55, 65, 81);
    doc.setFont('helvetica', 'normal');
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

  // ==================== FUNÇÕES DE ILUSTRAÇÃO ====================

  // Ícone de usuário/pessoa
  const drawPersonIcon = (x: number, yPos: number, size: number = 12, color: number[] = [59, 130, 246]) => {
    doc.setFillColor(color[0], color[1], color[2]);
    // Cabeça
    doc.circle(x + size/2, yPos + size/4, size/4, 'F');
    // Corpo
    doc.roundedRect(x + size/4, yPos + size/2, size/2, size/2, 2, 2, 'F');
  };

  // Ícone de documento/clipboard
  const drawClipboardIcon = (x: number, yPos: number, size: number = 20) => {
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(x, yPos + 3, size, size - 3, 2, 2, 'F');
    doc.setFillColor(255, 255, 255);
    doc.rect(x + 3, yPos + 8, size - 6, 2, 'F');
    doc.rect(x + 3, yPos + 12, size - 6, 2, 'F');
    doc.rect(x + 3, yPos + 16, size - 10, 2, 'F');
    // Clipe
    doc.setFillColor(100, 100, 100);
    doc.roundedRect(x + size/2 - 4, yPos, 8, 6, 1, 1, 'F');
  };

  // Ícone de estetoscópio
  const drawStethoscopeIcon = (x: number, yPos: number, size: number = 20) => {
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(2);
    // Tubo
    doc.line(x + size/2, yPos + 5, x + size/2, yPos + size - 5);
    // Ouvidos
    doc.line(x + size/2, yPos + 5, x + 3, yPos);
    doc.line(x + size/2, yPos + 5, x + size - 3, yPos);
    // Diafragma
    doc.setFillColor(34, 197, 94);
    doc.circle(x + size/2, yPos + size - 3, 4, 'F');
  };

  // Ícone de TV/Monitor
  const drawTVIcon = (x: number, yPos: number, size: number = 24) => {
    doc.setFillColor(55, 65, 81);
    doc.roundedRect(x, yPos, size, size * 0.65, 2, 2, 'F');
    doc.setFillColor(59, 130, 246);
    doc.rect(x + 2, yPos + 2, size - 4, size * 0.65 - 4, 'F');
    // Base
    doc.setFillColor(55, 65, 81);
    doc.rect(x + size/2 - 3, yPos + size * 0.65, 6, 3, 'F');
    doc.rect(x + size/2 - 6, yPos + size * 0.65 + 3, 12, 2, 'F');
  };

  // Ícone de gráfico/estatísticas
  const drawChartIcon = (x: number, yPos: number, size: number = 20) => {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, yPos, size, size, 2, 2, 'F');
    doc.setFillColor(59, 130, 246);
    doc.rect(x + 3, yPos + 12, 3, 5, 'F');
    doc.setFillColor(34, 197, 94);
    doc.rect(x + 8, yPos + 8, 3, 9, 'F');
    doc.setFillColor(234, 179, 8);
    doc.rect(x + 13, yPos + 5, 3, 12, 'F');
  };

  // Ícone de chat/mensagem
  const drawChatIcon = (x: number, yPos: number, size: number = 20) => {
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(x, yPos, size, size * 0.7, 3, 3, 'F');
    // Triângulo da fala
    doc.triangle(x + 4, yPos + size * 0.7, x + 8, yPos + size * 0.7, x + 4, yPos + size * 0.85, 'F');
    // Linhas de texto
    doc.setFillColor(255, 255, 255);
    doc.rect(x + 3, yPos + 4, size - 6, 2, 'F');
    doc.rect(x + 3, yPos + 8, size - 10, 2, 'F');
  };

  // Ícone de alto-falante/som
  const drawSpeakerIcon = (x: number, yPos: number, size: number = 18) => {
    doc.setFillColor(234, 179, 8);
    // Corpo do alto-falante
    doc.rect(x, yPos + size/3, size/3, size/3, 'F');
    doc.triangle(x + size/3, yPos + size/3, x + size/3, yPos + size*2/3, x + size*2/3, yPos, 'F');
    doc.triangle(x + size/3, yPos + size*2/3, x + size*2/3, yPos + size, x + size*2/3, yPos, 'F');
    // Ondas de som
    doc.setDrawColor(234, 179, 8);
    doc.setLineWidth(1.5);
    doc.line(x + size*0.75, yPos + size*0.3, x + size*0.85, yPos + size*0.2);
    doc.line(x + size*0.75, yPos + size*0.5, x + size*0.9, yPos + size*0.5);
    doc.line(x + size*0.75, yPos + size*0.7, x + size*0.85, yPos + size*0.8);
  };

  // Ícone de configuração/engrenagem
  const drawGearIcon = (x: number, yPos: number, size: number = 18) => {
    doc.setFillColor(107, 114, 128);
    doc.circle(x + size/2, yPos + size/2, size/3, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(x + size/2, yPos + size/2, size/6, 'F');
    // Dentes
    doc.setFillColor(107, 114, 128);
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    angles.forEach(angle => {
      const rad = angle * Math.PI / 180;
      const dx = Math.cos(rad) * size/3;
      const dy = Math.sin(rad) * size/3;
      doc.rect(x + size/2 + dx - 2, yPos + size/2 + dy - 2, 4, 4, 'F');
    });
  };

  // Desenhar mockup de interface
  const drawInterfaceMockup = (x: number, yPos: number, width: number, height: number, title: string, sections: string[]) => {
    // Janela
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, yPos, width, height, 3, 3, 'FD');
    
    // Barra de título
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(x, yPos, width, 12, 3, 3, 'F');
    doc.rect(x, yPos + 6, width, 6, 'F');
    
    // Título
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, x + 4, yPos + 8);
    
    // Botões da janela
    doc.setFillColor(239, 68, 68);
    doc.circle(x + width - 8, yPos + 6, 2, 'F');
    doc.setFillColor(234, 179, 8);
    doc.circle(x + width - 14, yPos + 6, 2, 'F');
    doc.setFillColor(34, 197, 94);
    doc.circle(x + width - 20, yPos + 6, 2, 'F');
    
    // Seções
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(55, 65, 81);
    sections.forEach((section, i) => {
      const sectionY = yPos + 18 + i * 12;
      if (sectionY < yPos + height - 5) {
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x + 4, sectionY - 3, width - 8, 10, 1, 1, 'F');
        doc.text(section, x + 6, sectionY + 3);
      }
    });
  };

  // Desenhar fluxograma
  const drawFlowChart = (x: number, yPos: number, steps: string[]) => {
    const boxWidth = 45;
    const boxHeight = 14;
    const gap = 8;
    
    steps.forEach((step, i) => {
      const boxX = x + i * (boxWidth + gap);
      
      // Caixa
      doc.setFillColor(i === 0 ? 59 : i === steps.length - 1 ? 34 : 107, i === 0 ? 130 : i === steps.length - 1 ? 197 : 114, i === 0 ? 246 : i === steps.length - 1 ? 94 : 128);
      doc.roundedRect(boxX, yPos, boxWidth, boxHeight, 2, 2, 'F');
      
      // Texto
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      const lines = doc.splitTextToSize(step, boxWidth - 4);
      lines.forEach((line: string, j: number) => {
        doc.text(line, boxX + 2, yPos + 5 + j * 4);
      });
      
      // Seta
      if (i < steps.length - 1) {
        doc.setFillColor(150, 150, 150);
        doc.triangle(
          boxX + boxWidth + 2, yPos + boxHeight/2 - 2,
          boxX + boxWidth + 2, yPos + boxHeight/2 + 2,
          boxX + boxWidth + 6, yPos + boxHeight/2,
          'F'
        );
      }
    });
  };

  // Desenhar card de prioridade
  const drawPriorityCard = (x: number, yPos: number, level: string, color: number[], label: string) => {
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(x, yPos, 50, 20, 3, 3, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(level, x + 25, yPos + 8, { align: 'center' });
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x + 25, yPos + 15, { align: 'center' });
  };

  // ==================== CAPA ====================
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 0, pageWidth, 70, 'F');
  doc.setFillColor(185, 28, 28);
  doc.rect(0, 60, pageWidth, 10, 'F');
  
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('MANUAL DO USUARIO', pageWidth / 2, 32, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Chamada de Pacientes por Voz', pageWidth / 2, 48, { align: 'center' });
  
  // Ilustração na capa - ícones dos módulos
  y = 85;
  const iconSpacing = 35;
  const startX = pageWidth / 2 - iconSpacing * 2;
  
  drawClipboardIcon(startX, y, 22);
  drawStethoscopeIcon(startX + iconSpacing, y, 22);
  drawTVIcon(startX + iconSpacing * 2, y + 2, 22);
  drawChartIcon(startX + iconSpacing * 3, y + 2, 22);
  drawChatIcon(startX + iconSpacing * 4, y + 2, 22);
  
  // Labels dos ícones
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('Cadastro', startX + 11, y + 30, { align: 'center' });
  doc.text('Triagem', startX + iconSpacing + 11, y + 30, { align: 'center' });
  doc.text('TV', startX + iconSpacing * 2 + 11, y + 30, { align: 'center' });
  doc.text('Admin', startX + iconSpacing * 3 + 11, y + 30, { align: 'center' });
  doc.text('Chat', startX + iconSpacing * 4 + 11, y + 30, { align: 'center' });
  
  y = 130;
  
  // Box de apresentação
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, maxWidth, 45, 5, 5, 'F');
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, maxWidth, 45, 5, 5, 'S');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  doc.text('Este manual apresenta todas as funcionalidades do sistema', pageWidth / 2, y + 12, { align: 'center' });
  doc.text('de gerenciamento de filas para unidades de saude,', pageWidth / 2, y + 20, { align: 'center' });
  doc.text('incluindo cadastro, triagem, atendimento medico e', pageWidth / 2, y + 28, { align: 'center' });
  doc.text('exibicao em TV para sala de espera.', pageWidth / 2, y + 36, { align: 'center' });
  
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
    { num: '01', title: 'Visao Geral do Sistema' },
    { num: '02', title: 'Acesso ao Sistema' },
    { num: '03', title: 'Modulo Cadastro' },
    { num: '04', title: 'Modulo Triagem' },
    { num: '05', title: 'Modulo Medico' },
    { num: '06', title: 'Modulo Administrativo' },
    { num: '07', title: 'Modo TV (Display Publico)' },
    { num: '08', title: 'Chat Interno' },
    { num: '09', title: 'Configuracoes de Audio' },
    { num: '10', title: 'Dicas e Boas Praticas' },
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
    y += 10;
  });

  // ==================== VISÃO GERAL ====================
  addPage();
  addTitle('01. VISAO GERAL DO SISTEMA');
  
  // Ilustração do fluxo geral
  drawFlowChart(margin, y, ['Cadastro', 'Triagem', 'Medico', 'Concluido']);
  y += 25;
  
  addText('O Sistema de Chamada de Pacientes por Voz e uma solucao completa para gerenciamento de filas em unidades de saude.');
  addSpacer(5);
  
  addSubtitle('Principais Funcionalidades');
  addBullet('Cadastro de pacientes com tres niveis de prioridade', '▸');
  addBullet('Triagem e encaminhamento para procedimentos', '▸');
  addBullet('Chamada de pacientes com anuncio por voz', '▸');
  addBullet('Exibicao em TV para sala de espera', '▸');
  addBullet('Estatisticas detalhadas e relatorios em PDF', '▸');
  addBullet('Comunicacao interna entre setores via chat', '▸');
  
  addSpacer(8);
  addInfoBox('IMPORTANTE', [
    'Todos os dispositivos devem estar logados na',
    'MESMA UNIDADE para a sincronizacao funcionar.'
  ], [254, 243, 199]);

  // ==================== ACESSO AO SISTEMA ====================
  addPage();
  addTitle('02. ACESSO AO SISTEMA');
  
  // Mockup da tela de login
  drawInterfaceMockup(margin, y, 80, 55, 'Tela de Login', [
    'Selecione a Unidade',
    'Usuario: ________',
    'Senha: ________',
    '[  Entrar  ]'
  ]);
  
  // Mockup do modo TV
  drawInterfaceMockup(margin + 90, y, 80, 55, 'Modo TV', [
    'Unidade Selecionada',
    '[  Confirmar  ]',
    'Clique para ativar audio'
  ]);
  
  y += 65;
  
  addSubtitle('Login para Funcionarios');
  addBullet('Selecione a Unidade de Saude no menu', '1.');
  addBullet('Informe usuario e senha', '2.');
  addBullet('Clique em "Entrar"', '3.');
  
  addSpacer(5);
  addSubtitle('Login para Modo TV');
  addBullet('Informe as credenciais do modo TV', '1.');
  addBullet('Selecione a unidade de saude', '2.');
  addBullet('Clique na tela para ATIVAR O AUDIO', '3.');
  
  addSpacer(5);
  addInfoBox('DICA', [
    'O modo TV entra automaticamente em tela cheia',
    'e esconde o cursor do mouse.'
  ], [220, 252, 231]);

  // ==================== MÓDULO CADASTRO ====================
  addPage();
  addTitle('03. MODULO CADASTRO');
  
  // Ícone grande do módulo
  drawClipboardIcon(pageWidth - margin - 25, y - 15, 25);
  
  addText('O modulo Cadastro e o ponto de entrada dos pacientes no sistema.');
  addSpacer(5);
  
  // Mockup da interface de cadastro
  drawInterfaceMockup(margin, y, maxWidth, 50, 'Cadastro de Pacientes', [
    'Nome: _______________________',
    'Prioridade: [Normal ▼]',
    'Encaminhar para: [Triagem ▼]',
    '[  Registrar  ]'
  ]);
  y += 58;
  
  addSubtitle('Niveis de Prioridade');
  addSpacer(3);
  
  // Cards de prioridade ilustrados
  drawPriorityCard(margin, y, 'EMERGENCIA', [220, 38, 38], 'Casos graves');
  drawPriorityCard(margin + 55, y, 'PRIORIDADE', [234, 179, 8], 'Idosos, gestantes');
  drawPriorityCard(margin + 110, y, 'NORMAL', [34, 197, 94], 'Demais');
  y += 28;
  
  addSubtitle('Opcoes de Encaminhamento');
  addBullet('Triagem - Classificacao de risco', '→');
  addBullet('Sala de Eletrocardiograma / Curativos / Raio X', '→');
  addBullet('Consultorio Medico 1 ou 2', '→');

  // ==================== MÓDULO TRIAGEM ====================
  addPage();
  addTitle('04. MODULO TRIAGEM');
  
  drawStethoscopeIcon(pageWidth - margin - 25, y - 15, 25);
  
  addText('O modulo Triagem e utilizado pela equipe de enfermagem para classificar os pacientes.');
  addSpacer(5);
  
  // Mockup da interface de triagem
  drawInterfaceMockup(margin, y, maxWidth, 60, 'Triagem', [
    '--- CHAMADA ATUAL ---',
    'Joao Silva  [Rechamar] [Finalizar]',
    '--- FILA DE ESPERA ---',
    '1. Maria Santos    Prioridade    3min',
    '2. Pedro Costa     Normal        8min'
  ]);
  y += 68;
  
  addSubtitle('Acoes Disponiveis');
  addTableHeader(['Acao', 'Descricao'], [45, 125]);
  addTableRow(['Chamar', 'Chama paciente e anuncia na TV'], [45, 125], false);
  addTableRow(['Rechamar', 'Repete o chamado atual'], [45, 125], true);
  addTableRow(['Finalizar', 'Conclui a triagem'], [45, 125], false);
  addTableRow(['Encaminhar', 'Envia para medico'], [45, 125], true);
  
  addSpacer(5);
  addSubtitle('Alertas de Novos Pacientes');
  addBullet('Som de alerta especifico por prioridade', '●');
  addBullet('Alerta visual pulsante na tela', '●');

  // ==================== MÓDULO MÉDICO ====================
  addPage();
  addTitle('05. MODULO MEDICO');
  
  // Ícone de pessoa (médico)
  drawPersonIcon(pageWidth - margin - 20, y - 12, 18, [34, 197, 94]);
  
  addText('O modulo Medico permite chamar pacientes para consulta com anuncio na TV.');
  addSpacer(5);
  
  // Fluxo de atendimento
  drawFlowChart(margin, y, ['Paciente\nna fila', 'Chamar', 'Consulta', 'Concluir']);
  y += 25;
  
  // Mockup
  drawInterfaceMockup(margin, y, maxWidth, 55, 'Painel Medico - Consultorio 1', [
    '--- CHAMADA ATUAL ---',
    'Ana Paula  [Rechamar] [Concluir]',
    '--- AGUARDANDO ---',
    '1. Carlos Souza    Normal    12min'
  ]);
  y += 63;
  
  addSubtitle('Selecao de Consultorio');
  addBullet('Consultorio Medico 1', '●');
  addBullet('Consultorio Medico 2', '●');
  addText('Cada consultorio possui fila independente.');
  
  addSpacer(5);
  addSubtitle('Acoes do Medico');
  addTableHeader(['Acao', 'Descricao'], [50, 120]);
  addTableRow(['Chamar', 'Anuncia paciente na TV'], [50, 120], false);
  addTableRow(['Concluir', 'Finaliza a consulta'], [50, 120], true);

  // ==================== MÓDULO ADMINISTRATIVO ====================
  addPage();
  addTitle('06. MODULO ADMINISTRATIVO');
  
  drawChartIcon(pageWidth - margin - 25, y - 15, 25);
  
  addText('Ferramentas de gestao, estatisticas e manutencao do sistema.');
  addSpacer(5);
  
  // Mockup de estatísticas
  drawInterfaceMockup(margin, y, maxWidth, 55, 'Administrativo - Estatisticas', [
    'Total Chamadas: 45  |  Triagem: 30  |  Medico: 15',
    'Tempo Medio Espera: 12 min',
    '[Grafico de Barras]',
    '[Relatorio PDF] [Backup] [Restaurar]'
  ]);
  y += 63;
  
  addSubtitle('Dashboard de Estatisticas');
  addBullet('Total de chamadas do dia', '●');
  addBullet('Divisao entre triagem e consultas', '●');
  addBullet('Tempo medio de espera', '●');
  
  addSpacer(5);
  addSubtitle('Funcoes Administrativas');
  addBullet('Exportar Relatorio PDF', '●');
  addBullet('Backup e Restauracao de dados', '●');
  addBullet('Comparacao entre Unidades', '●');

  // ==================== MODO TV ====================
  addPage();
  addTitle('07. MODO TV (DISPLAY PUBLICO)');
  
  drawTVIcon(pageWidth - margin - 28, y - 15, 28);
  
  addText('Interface otimizada para exibicao em televisores na sala de espera.');
  addSpacer(5);
  
  // Mockup da TV
  doc.setFillColor(30, 30, 30);
  doc.roundedRect(margin, y, maxWidth, 70, 5, 5, 'F');
  doc.setFillColor(59, 130, 246);
  doc.rect(margin + 5, y + 5, maxWidth - 10, 12, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('14:35  |  CHAMADA DE PACIENTES  |  28°C', margin + maxWidth/2, y + 13, { align: 'center' });
  
  // Painéis de chamada
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(margin + 10, y + 22, 75, 35, 3, 3, 'F');
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(margin + 90, y + 22, 75, 35, 3, 3, 'F');
  
  doc.setFontSize(7);
  doc.text('TRIAGEM', margin + 47, y + 30, { align: 'center' });
  doc.text('Joao Silva', margin + 47, y + 40, { align: 'center' });
  doc.text('CONSULTORIO 1', margin + 127, y + 30, { align: 'center' });
  doc.text('Maria Santos', margin + 127, y + 40, { align: 'center' });
  
  // Ticker de notícias
  doc.setFillColor(50, 50, 50);
  doc.rect(margin + 5, y + 60, maxWidth - 10, 8, 'F');
  doc.setFontSize(6);
  doc.text('G1: Noticias do Brasil...  |  Folha: Economia...  |  ESPN: Esportes...', margin + 10, y + 65);
  
  y += 78;
  
  addSubtitle('Caracteristicas da Interface');
  addBullet('Tela cheia automatica e cursor oculto', '●');
  addBullet('Relogio e previsao do tempo', '●');
  addBullet('Ticker de noticias na parte inferior', '●');
  
  addSpacer(3);
  addSubtitle('Anuncios por Voz');
  
  // Ilustração do fluxo de anúncio
  drawFlowChart(margin, y, ['Som de\nalerta', 'Anuncio\npor voz', 'Flash\nvisual']);
  y += 22;
  
  addBullet('Nome e destino anunciados automaticamente', '●');
  addBullet('Repeticao automatica do anuncio', '●');

  // ==================== CHAT INTERNO ====================
  addPage();
  addTitle('08. CHAT INTERNO');
  
  drawChatIcon(pageWidth - margin - 25, y - 15, 25);
  
  addText('Comunicacao instantanea entre os setores da unidade de saude.');
  addSpacer(5);
  
  // Mockup do chat
  drawInterfaceMockup(margin, y, maxWidth, 60, 'Chat Interno', [
    '[Cadastro] Paciente chegando!',
    '[Triagem] Recebido, obrigado!',
    '[Medico] Proximo paciente?',
    '_________________________',
    'Para: [Todos ▼]  [Enviar]'
  ]);
  y += 68;
  
  addSubtitle('Setores Conectados');
  
  // Cards dos setores
  doc.setFillColor(59, 130, 246);
  doc.roundedRect(margin, y, 50, 18, 2, 2, 'F');
  doc.setFillColor(234, 179, 8);
  doc.roundedRect(margin + 55, y, 50, 18, 2, 2, 'F');
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(margin + 110, y, 50, 18, 2, 2, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('CADASTRO', margin + 25, y + 11, { align: 'center' });
  doc.text('TRIAGEM', margin + 80, y + 11, { align: 'center' });
  doc.text('MEDICO', margin + 135, y + 11, { align: 'center' });
  
  y += 26;
  
  addSubtitle('Funcionalidades');
  addBullet('Mensagens para setor especifico ou todos', '●');
  addBullet('Indicador de digitacao em tempo real', '●');
  addBullet('Sons distintos por setor remetente', '●');
  
  addSpacer(5);
  addInfoBox('LIMPEZA AUTOMATICA', [
    'Mensagens sao excluidas automaticamente apos 24h.'
  ], [239, 246, 255]);

  // ==================== CONFIGURAÇÕES DE ÁUDIO ====================
  addPage();
  addTitle('09. CONFIGURACOES DE AUDIO');
  
  drawSpeakerIcon(pageWidth - margin - 22, y - 12, 22);
  drawGearIcon(pageWidth - margin - 45, y - 10, 18);
  
  addText('Controle completo sobre volumes e vozes utilizados nos anuncios.');
  addSpacer(5);
  
  // Mockup de configurações
  drawInterfaceMockup(margin, y, maxWidth, 50, 'Configuracoes de Audio', [
    'Notificacao de Chamada:  [====|====]',
    'Volume da Voz TTS:       [=====|===]',
    'Notificacao de Hora:     [===|=====]',
    'Voz de Hora:             [======|==]'
  ]);
  y += 58;
  
  addSubtitle('Ajuste de Volumes');
  addTableHeader(['Configuracao', 'Descricao'], [55, 115]);
  addTableRow(['Notif. Chamada', 'Som antes do anuncio'], [55, 115], false);
  addTableRow(['Voz TTS', 'Volume dos anuncios'], [55, 115], true);
  addTableRow(['Notif. Hora', 'Som antes da hora'], [55, 115], false);
  addTableRow(['Voz Hora', 'Volume das horas'], [55, 115], true);
  
  addSpacer(5);
  addSubtitle('Selecao de Vozes');
  addText('Vozes Femininas: Alice, Aria, Domi, Elli, Bella, Rachel');
  addText('Vozes Masculinas: Antonio, Arnold, Adam, Sam, Josh, Clyde');
  addBullet('Preferencias salvas por unidade de saude', '●');

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
  addSubtitle('Solucao de Problemas');
  addSpacer(3);
  addTableHeader(['Problema', 'Solucao'], [55, 115]);
  addTableRow(['Paciente nao aparece', 'Verificar mesma unidade'], [55, 115], false);
  addTableRow(['Audio nao funciona', 'Clicar na tela para ativar'], [55, 115], true);
  addTableRow(['Dados nao sincronizam', 'Verificar conexao internet'], [55, 115], false);
  addTableRow(['Tela travada', 'Aguardar auto-reload ou F5'], [55, 115], true);
  
  addSpacer(8);
  addSubtitle('Backup Regular');
  addBullet('Realize backup semanal dos dados', '●');
  addBullet('Armazene os arquivos em local seguro', '●');
  
  addSpacer(8);
  addInfoBox('SUPORTE', [
    'Em caso de duvidas ou problemas tecnicos,',
    'entre em contato com o administrador do sistema.'
  ], [220, 252, 231]);

  // ==================== RODAPÉ EM TODAS AS PÁGINAS ====================
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    
    if (i > 1) {
      doc.text('Sistema de Chamada de Pacientes por Voz', margin, pageHeight - 12);
      doc.text(`Pagina ${i - 1} de ${totalPages - 1}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
      doc.text('Desenvolvido por Kalebe Gomes', pageWidth / 2, pageHeight - 12, { align: 'center' });
    }
  }

  doc.save('Manual_Chamada_Pacientes.pdf');
};
