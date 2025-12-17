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
    doc.circle(x + size/2, yPos + size/4, size/4, 'F');
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
    doc.setFillColor(100, 100, 100);
    doc.roundedRect(x + size/2 - 4, yPos, 8, 6, 1, 1, 'F');
  };

  // Ícone de estetoscópio
  const drawStethoscopeIcon = (x: number, yPos: number, size: number = 20) => {
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(2);
    doc.line(x + size/2, yPos + 5, x + size/2, yPos + size - 5);
    doc.line(x + size/2, yPos + 5, x + 3, yPos);
    doc.line(x + size/2, yPos + 5, x + size - 3, yPos);
    doc.setFillColor(34, 197, 94);
    doc.circle(x + size/2, yPos + size - 3, 4, 'F');
  };

  // Ícone de TV/Monitor
  const drawTVIcon = (x: number, yPos: number, size: number = 24) => {
    doc.setFillColor(55, 65, 81);
    doc.roundedRect(x, yPos, size, size * 0.65, 2, 2, 'F');
    doc.setFillColor(59, 130, 246);
    doc.rect(x + 2, yPos + 2, size - 4, size * 0.65 - 4, 'F');
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
    doc.triangle(x + 4, yPos + size * 0.7, x + 8, yPos + size * 0.7, x + 4, yPos + size * 0.85, 'F');
    doc.setFillColor(255, 255, 255);
    doc.rect(x + 3, yPos + 4, size - 6, 2, 'F');
    doc.rect(x + 3, yPos + 8, size - 10, 2, 'F');
  };

  // Ícone de alto-falante/som
  const drawSpeakerIcon = (x: number, yPos: number, size: number = 18) => {
    doc.setFillColor(234, 179, 8);
    doc.rect(x, yPos + size/3, size/3, size/3, 'F');
    doc.triangle(x + size/3, yPos + size/3, x + size/3, yPos + size*2/3, x + size*2/3, yPos, 'F');
    doc.triangle(x + size/3, yPos + size*2/3, x + size*2/3, yPos + size, x + size*2/3, yPos, 'F');
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
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, yPos, width, height, 3, 3, 'FD');
    
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(x, yPos, width, 12, 3, 3, 'F');
    doc.rect(x, yPos + 6, width, 6, 'F');
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, x + 4, yPos + 8);
    
    doc.setFillColor(239, 68, 68);
    doc.circle(x + width - 8, yPos + 6, 2, 'F');
    doc.setFillColor(234, 179, 8);
    doc.circle(x + width - 14, yPos + 6, 2, 'F');
    doc.setFillColor(34, 197, 94);
    doc.circle(x + width - 20, yPos + 6, 2, 'F');
    
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
      
      doc.setFillColor(i === 0 ? 59 : i === steps.length - 1 ? 34 : 107, i === 0 ? 130 : i === steps.length - 1 ? 197 : 114, i === 0 ? 246 : i === steps.length - 1 ? 94 : 128);
      doc.roundedRect(boxX, yPos, boxWidth, boxHeight, 2, 2, 'F');
      
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      const lines = doc.splitTextToSize(step, boxWidth - 4);
      lines.forEach((line: string, j: number) => {
        doc.text(line, boxX + 2, yPos + 5 + j * 4);
      });
      
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
  doc.text('MANUAL DO USUÁRIO', pageWidth / 2, 32, { align: 'center' });
  
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
  doc.text('de gerenciamento de filas para unidades de saúde,', pageWidth / 2, y + 20, { align: 'center' });
  doc.text('incluindo cadastro, triagem, atendimento médico e', pageWidth / 2, y + 28, { align: 'center' });
  doc.text('exibição em TV para sala de espera.', pageWidth / 2, y + 36, { align: 'center' });
  
  // Rodapé da capa
  y = pageHeight - 30;
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text('Solução desenvolvida por Kalebe Gomes', pageWidth / 2, y, { align: 'center' });
  doc.text('Versão 1.0 | Dezembro 2024', pageWidth / 2, y + 6, { align: 'center' });

  // ==================== ÍNDICE ====================
  addPage();
  addTitle('ÍNDICE');
  addSpacer(5);
  
  const chapters = [
    { num: '01', title: 'Visão Geral do Sistema' },
    { num: '02', title: 'Acesso ao Sistema' },
    { num: '03', title: 'Módulo Cadastro' },
    { num: '04', title: 'Módulo Triagem' },
    { num: '05', title: 'Salas de Procedimentos' },
    { num: '06', title: 'Módulo Médico' },
    { num: '07', title: 'Módulo Administrativo' },
    { num: '08', title: 'Modo TV (Display Público)' },
    { num: '09', title: 'Chat Interno' },
    { num: '10', title: 'Configurações de Áudio' },
    { num: '11', title: 'Dicas e Boas Práticas' },
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
  addTitle('01. VISÃO GERAL DO SISTEMA');
  
  // Ilustração do fluxo geral
  drawFlowChart(margin, y, ['Cadastro', 'Triagem', 'Médico', 'Concluído']);
  y += 25;
  
  addText('O Sistema de Chamada de Pacientes por Voz é uma solução completa para gerenciamento de filas em unidades de saúde.');
  addSpacer(5);
  
  addSubtitle('Principais Funcionalidades');
  addBullet('Cadastro de pacientes com três níveis de prioridade', '▸');
  addBullet('Triagem e encaminhamento para procedimentos', '▸');
  addBullet('Chamada de pacientes com anúncio por voz', '▸');
  addBullet('Exibição em TV para sala de espera', '▸');
  addBullet('Estatísticas detalhadas e relatórios em PDF', '▸');
  addBullet('Comunicação interna entre setores via chat', '▸');
  
  addSpacer(8);
  addInfoBox('IMPORTANTE', [
    'Todos os dispositivos devem estar logados na',
    'MESMA UNIDADE para a sincronização funcionar.'
  ], [254, 243, 199]);

  // ==================== ACESSO AO SISTEMA ====================
  addPage();
  addTitle('02. ACESSO AO SISTEMA');
  
  // Mockup da tela de login
  drawInterfaceMockup(margin, y, 80, 55, 'Tela de Login', [
    'Selecione a Unidade',
    'Usuário: ________',
    'Senha: ________',
    '[  Entrar  ]'
  ]);
  
  // Mockup do modo TV
  drawInterfaceMockup(margin + 90, y, 80, 55, 'Modo TV', [
    'Unidade Selecionada',
    '[  Confirmar  ]',
    'Clique para ativar áudio'
  ]);
  
  y += 65;
  
  addSubtitle('Login para Funcionários');
  addText('Credenciais: Usuário "saude" / Senha "saude@1"');
  addSpacer(3);
  addBullet('Selecione a Unidade de Saúde no menu', '1.');
  addBullet('Informe usuário e senha', '2.');
  addBullet('Clique em "Entrar"', '3.');
  
  addSpacer(5);
  addSubtitle('Login para Modo TV');
  addText('Credenciais: Usuário "tv" / Senha "tv"');
  addSpacer(3);
  addBullet('Informe as credenciais do modo TV', '1.');
  addBullet('Selecione a unidade de saúde', '2.');
  addBullet('Clique na tela para ATIVAR O ÁUDIO', '3.');
  
  addSpacer(5);
  addInfoBox('DICA', [
    'O modo TV entra automaticamente em tela cheia',
    'e esconde o cursor do mouse após 3 segundos.'
  ], [220, 252, 231]);

  // ==================== MÓDULO CADASTRO ====================
  addPage();
  addTitle('03. MÓDULO CADASTRO');
  
  // Ícone grande do módulo
  drawClipboardIcon(pageWidth - margin - 25, y - 15, 25);
  
  addText('O módulo Cadastro é o ponto de entrada dos pacientes no sistema. Aqui são registrados os dados do paciente e definida a prioridade de atendimento.');
  addSpacer(5);
  
  // Mockup da interface de cadastro
  drawInterfaceMockup(margin, y, maxWidth, 50, 'Cadastro de Pacientes', [
    'Nome: _______________________',
    'Prioridade: [Normal ▼]',
    'Encaminhar para: [Triagem ▼]',
    '[  Registrar  ]'
  ]);
  y += 58;
  
  addSubtitle('Níveis de Prioridade');
  addSpacer(3);
  
  // Cards de prioridade ilustrados
  drawPriorityCard(margin, y, 'EMERGÊNCIA', [220, 38, 38], 'Casos graves');
  drawPriorityCard(margin + 55, y, 'PRIORIDADE', [234, 179, 8], 'Idosos, gestantes');
  drawPriorityCard(margin + 110, y, 'NORMAL', [34, 197, 94], 'Demais casos');
  y += 28;
  
  addSubtitle('Opções de Encaminhamento');
  addBullet('Triagem - Classificação de risco pela enfermagem', '→');
  addBullet('Sala de Eletrocardiograma / Curativos / Raio X', '→');
  addBullet('Consultório Médico 1 ou Consultório Médico 2', '→');
  addBullet('Enfermaria - Internação temporária', '→');
  
  addSpacer(5);
  addInfoBox('FRASE DO DIA', [
    'O módulo exibe frases motivacionais diárias',
    'que podem ser minimizadas clicando no X.'
  ], [239, 246, 255]);

  // ==================== MÓDULO TRIAGEM ====================
  addPage();
  addTitle('04. MÓDULO TRIAGEM');
  
  drawStethoscopeIcon(pageWidth - margin - 25, y - 15, 25);
  
  addText('O módulo Triagem é utilizado pela equipe de enfermagem para classificar os pacientes e encaminhá-los ao destino correto.');
  addSpacer(5);
  
  // Mockup da interface de triagem
  drawInterfaceMockup(margin, y, maxWidth, 60, 'Triagem', [
    '--- CHAMADA ATUAL ---',
    'João Silva  [Rechamar] [Finalizar]',
    '--- FILA DE ESPERA ---',
    '1. Maria Santos    Prioridade    3min',
    '2. Pedro Costa     Normal        8min'
  ]);
  y += 68;
  
  addSubtitle('Ações Disponíveis');
  addTableHeader(['Ação', 'Descrição'], [45, 125]);
  addTableRow(['Chamar', 'Chama o paciente e anuncia na TV'], [45, 125], false);
  addTableRow(['Rechamar', 'Repete o chamado atual na TV'], [45, 125], true);
  addTableRow(['Finalizar', 'Conclui a triagem do paciente'], [45, 125], false);
  addTableRow(['Encaminhar', 'Envia para o médico ou procedimento'], [45, 125], true);
  
  addSpacer(5);
  addSubtitle('Alertas de Novos Pacientes');
  addBullet('Som de alerta específico por nível de prioridade', '●');
  addBullet('Alerta visual pulsante na borda da tela', '●');
  addBullet('Botão para ativar/desativar notificações sonoras', '●');

  // ==================== SALAS DE PROCEDIMENTOS ====================
  addPage();
  addTitle('05. SALAS DE PROCEDIMENTOS');
  
  addText('O sistema permite encaminhar pacientes diretamente para salas de procedimentos específicos, agilizando o fluxo de atendimento.');
  addSpacer(8);
  
  // ===== ELETROCARDIOGRAMA =====
  addSubtitle('Sala de Eletrocardiograma (ECG)');
  
  // Ilustração do ECG
  doc.setFillColor(239, 68, 68);
  doc.roundedRect(margin, y, maxWidth, 45, 3, 3, 'F');
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin + 5, y + 5, maxWidth - 10, 35, 2, 2, 'F');
  
  // Desenhar linha de ECG
  doc.setDrawColor(239, 68, 68);
  doc.setLineWidth(1.5);
  const ecgY = y + 22;
  doc.line(margin + 10, ecgY, margin + 30, ecgY);
  doc.line(margin + 30, ecgY, margin + 35, ecgY - 8);
  doc.line(margin + 35, ecgY - 8, margin + 40, ecgY + 12);
  doc.line(margin + 40, ecgY + 12, margin + 45, ecgY - 5);
  doc.line(margin + 45, ecgY - 5, margin + 50, ecgY);
  doc.line(margin + 50, ecgY, margin + 70, ecgY);
  doc.line(margin + 70, ecgY, margin + 75, ecgY - 8);
  doc.line(margin + 75, ecgY - 8, margin + 80, ecgY + 12);
  doc.line(margin + 80, ecgY + 12, margin + 85, ecgY - 5);
  doc.line(margin + 85, ecgY - 5, margin + 90, ecgY);
  doc.line(margin + 90, ecgY, margin + 110, ecgY);
  
  // Ícone de coração
  doc.setFillColor(239, 68, 68);
  doc.circle(margin + 140, y + 18, 8, 'F');
  doc.circle(margin + 152, y + 18, 8, 'F');
  doc.triangle(margin + 132, y + 20, margin + 160, y + 20, margin + 146, y + 38, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(239, 68, 68);
  doc.text('ELETROCARDIOGRAMA', margin + 10, y + 12);
  
  y += 52;
  
  addBullet('Exame que registra a atividade elétrica do coração', '❤');
  addBullet('Paciente é chamado diretamente para a sala de ECG', '❤');
  addBullet('Anúncio na TV: "Dirija-se à Sala de Eletrocardiograma"', '❤');
  addBullet('Tempo médio do procedimento: 10-15 minutos', '❤');
  
  addSpacer(8);
  
  // ===== CURATIVOS =====
  addSubtitle('Sala de Curativos');
  
  // Ilustração de curativo
  doc.setFillColor(59, 130, 246);
  doc.roundedRect(margin, y, maxWidth, 40, 3, 3, 'F');
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin + 5, y + 5, maxWidth - 10, 30, 2, 2, 'F');
  
  // Desenhar band-aid
  doc.setFillColor(245, 208, 169);
  doc.roundedRect(margin + 20, y + 12, 50, 16, 3, 3, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(margin + 35, y + 14, 20, 12, 'F');
  doc.setFillColor(200, 200, 200);
  doc.circle(margin + 40, y + 20, 1, 'F');
  doc.circle(margin + 45, y + 20, 1, 'F');
  doc.circle(margin + 50, y + 20, 1, 'F');
  
  // Ícone de cruz médica
  doc.setFillColor(59, 130, 246);
  doc.rect(margin + 130, y + 10, 8, 20, 'F');
  doc.rect(margin + 124, y + 16, 20, 8, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 130, 246);
  doc.text('SALA DE CURATIVOS', margin + 10, y + 12);
  
  y += 47;
  
  addBullet('Tratamento de feridas, troca de curativos e suturas', '🩹');
  addBullet('Paciente é chamado para a Sala de Curativos', '🩹');
  addBullet('Anúncio na TV: "Dirija-se à Sala de Curativos"', '🩹');
  addBullet('Procedimentos de enfermagem especializados', '🩹');
  
  addSpacer(5);
  
  // ===== RAIO X =====
  addPage();
  addSubtitle('Sala de Raio X');
  
  // Ilustração de Raio X
  doc.setFillColor(107, 114, 128);
  doc.roundedRect(margin, y, maxWidth, 45, 3, 3, 'F');
  doc.setFillColor(30, 30, 30);
  doc.roundedRect(margin + 5, y + 5, maxWidth - 10, 35, 2, 2, 'F');
  
  // Desenhar silhueta de corpo/ossos
  doc.setFillColor(200, 220, 255);
  // Crânio
  doc.circle(margin + 45, y + 15, 6, 'F');
  // Coluna
  doc.rect(margin + 43, y + 21, 4, 15, 'F');
  // Costelas
  doc.setDrawColor(200, 220, 255);
  doc.setLineWidth(1);
  doc.line(margin + 35, y + 24, margin + 43, y + 26);
  doc.line(margin + 55, y + 24, margin + 47, y + 26);
  doc.line(margin + 35, y + 28, margin + 43, y + 30);
  doc.line(margin + 55, y + 28, margin + 47, y + 30);
  
  // Ícone de scan
  doc.setFillColor(200, 220, 255);
  doc.roundedRect(margin + 120, y + 8, 40, 28, 3, 3, 'F');
  doc.setFillColor(30, 30, 30);
  doc.roundedRect(margin + 125, y + 12, 30, 20, 2, 2, 'F');
  doc.setFillColor(200, 220, 255);
  doc.circle(margin + 140, y + 22, 5, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(200, 220, 255);
  doc.text('SALA DE RAIO X', margin + 10, y + 12);
  
  y += 52;
  
  addBullet('Exames de imagem para diagnóstico', '📷');
  addBullet('Radiografias de tórax, membros e abdômen', '📷');
  addBullet('Anúncio na TV: "Dirija-se à Sala de Raio X"', '📷');
  addBullet('Paciente deve remover objetos metálicos', '📷');
  
  addSpacer(8);
  
  // ===== ENFERMARIA =====
  addSubtitle('Enfermaria');
  
  // Ilustração de cama hospitalar
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(margin, y, maxWidth, 40, 3, 3, 'F');
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin + 5, y + 5, maxWidth - 10, 30, 2, 2, 'F');
  
  // Desenhar cama
  doc.setFillColor(100, 100, 100);
  doc.rect(margin + 20, y + 25, 60, 3, 'F');
  doc.rect(margin + 18, y + 15, 3, 13, 'F');
  doc.rect(margin + 79, y + 18, 3, 10, 'F');
  doc.setFillColor(200, 220, 255);
  doc.rect(margin + 21, y + 17, 58, 8, 'F');
  doc.setFillColor(255, 255, 255);
  doc.rect(margin + 22, y + 18, 12, 6, 'F');
  
  // Ícone de leito
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(margin + 120, y + 10, 40, 20, 2, 2, 'F');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('🛏️', margin + 132, y + 24);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(34, 197, 94);
  doc.text('ENFERMARIA', margin + 10, y + 12);
  
  y += 47;
  
  addBullet('Área para observação e internação temporária', '🛏');
  addBullet('Pacientes que necessitam de monitoramento', '🛏');
  addBullet('Anúncio na TV: "Dirija-se à Enfermaria"', '🛏');
  addBullet('Acompanhamento contínuo pela equipe de saúde', '🛏');
  
  addSpacer(8);
  addInfoBox('FLUXO DE ENCAMINHAMENTO', [
    'Os pacientes podem ser encaminhados para procedimentos',
    'diretamente do Cadastro ou após a Triagem.',
    'O sistema anuncia automaticamente o destino na TV.'
  ], [220, 252, 231]);

  // ==================== MÓDULO MÉDICO ====================
  addPage();
  addTitle('06. MÓDULO MÉDICO');
  
  // Ícone de pessoa (médico)
  drawPersonIcon(pageWidth - margin - 20, y - 12, 18, [34, 197, 94]);
  
  addText('O módulo Médico permite chamar pacientes para consulta com anúncio automático na TV da sala de espera.');
  addSpacer(5);
  
  // Fluxo de atendimento
  drawFlowChart(margin, y, ['Paciente\nna fila', 'Chamar', 'Consulta', 'Concluir']);
  y += 25;
  
  // Mockup
  drawInterfaceMockup(margin, y, maxWidth, 55, 'Painel Médico - Consultório 1', [
    '--- CHAMADA ATUAL ---',
    'Ana Paula  [Rechamar] [Concluir]',
    '--- AGUARDANDO ---',
    '1. Carlos Souza    Normal    12min'
  ]);
  y += 63;
  
  addSubtitle('Seleção de Consultório');
  addBullet('Consultório Médico 1 - Fila independente', '●');
  addBullet('Consultório Médico 2 - Fila independente', '●');
  addText('Cada consultório possui sua própria fila de pacientes.');
  
  addSpacer(5);
  addSubtitle('Ações do Médico');
  addTableHeader(['Ação', 'Descrição'], [50, 120]);
  addTableRow(['Chamar', 'Anuncia o paciente na TV'], [50, 120], false);
  addTableRow(['Rechamar', 'Repete o anúncio na TV'], [50, 120], true);
  addTableRow(['Concluir', 'Finaliza a consulta com sucesso'], [50, 120], false);
  addTableRow(['Desistência', 'Paciente não compareceu'], [50, 120], true);

  // ==================== MÓDULO ADMINISTRATIVO ====================
  addPage();
  addTitle('07. MÓDULO ADMINISTRATIVO');
  
  drawChartIcon(pageWidth - margin - 25, y - 15, 25);
  
  addText('Ferramentas de gestão, estatísticas e manutenção do sistema. Acesso a relatórios e funções administrativas.');
  addSpacer(5);
  
  addSubtitle('Dashboard de Estatísticas');
  addBullet('Total de chamadas do dia (triagem e médico)', '●');
  addBullet('Tempo médio de espera dos pacientes', '●');
  addBullet('Contagem de procedimentos realizados', '●');
  addBullet('Gráficos de atendimentos por hora', '●');
  
  addSpacer(5);
  addSubtitle('Funções Administrativas');
  addBullet('Exportar Relatório em PDF com estatísticas', '●');
  addBullet('Backup completo dos dados para arquivo JSON', '●');
  addBullet('Restauração de dados a partir de backup', '●');
  addBullet('Comparação de desempenho entre unidades', '●');
  addBullet('Limpeza de registros antigos do sistema', '●');
  
  addSpacer(5);
  addSubtitle('Configuração de Vozes');
  addBullet('Selecionar voz para anúncios de pacientes', '●');
  addBullet('Selecionar voz para anúncios de hora', '●');
  addBullet('Testar vozes antes de aplicar', '●');
  
  addSpacer(5);
  addInfoBox('SENHA ADMINISTRATIVA', [
    'Algumas funções requerem senha de administrador.',
    'Consulte o responsável técnico para obter a senha.'
  ], [254, 243, 199]);

  // ==================== MODO TV ====================
  addPage();
  addTitle('08. MODO TV (DISPLAY PÚBLICO)');
  
  drawTVIcon(pageWidth - margin - 28, y - 15, 28);
  
  addText('Interface otimizada para exibição em televisores na sala de espera. Mostra chamadas de pacientes com anúncio por voz.');
  addSpacer(5);
  
  // Mockup da TV
  doc.setFillColor(30, 30, 30);
  doc.roundedRect(margin, y, maxWidth, 70, 5, 5, 'F');
  doc.setFillColor(59, 130, 246);
  doc.rect(margin + 5, y + 5, maxWidth - 10, 12, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('14:35  |  CHAMADA DE PACIENTES  |  28°C Paineiras-MG', margin + maxWidth/2, y + 13, { align: 'center' });
  
  // Painéis de chamada
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(margin + 10, y + 22, 75, 35, 3, 3, 'F');
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(margin + 90, y + 22, 75, 35, 3, 3, 'F');
  
  doc.setFontSize(7);
  doc.text('TRIAGEM', margin + 47, y + 30, { align: 'center' });
  doc.text('João Silva', margin + 47, y + 40, { align: 'center' });
  doc.text('CONSULTÓRIO 1', margin + 127, y + 30, { align: 'center' });
  doc.text('Maria Santos', margin + 127, y + 40, { align: 'center' });
  
  // Ticker de notícias
  doc.setFillColor(50, 50, 50);
  doc.rect(margin + 5, y + 60, maxWidth - 10, 8, 'F');
  doc.setFontSize(6);
  doc.text('G1: Notícias do Brasil...  |  Folha: Economia...  |  ESPN: Esportes...', margin + 10, y + 65);
  
  y += 78;
  
  addSubtitle('Características da Interface');
  addBullet('Tela cheia automática ao entrar no modo TV', '●');
  addBullet('Cursor do mouse oculto após 3 segundos', '●');
  addBullet('Relógio e previsão do tempo de 30 cidades de MG', '●');
  addBullet('Ticker de notícias de mais de 35 fontes', '●');
  addBullet('Reprodução de vídeos do YouTube/Google Drive', '●');
  
  addSpacer(3);
  addSubtitle('Anúncios por Voz');
  
  // Ilustração do fluxo de anúncio
  drawFlowChart(margin, y, ['Som de\nalerta', 'Anúncio\npor voz', 'Flash\nvisual']);
  y += 22;
  
  addBullet('Som de notificação toca antes do anúncio', '●');
  addBullet('Nome e destino são anunciados automaticamente', '●');
  addBullet('Anúncio é repetido duas vezes para garantir', '●');
  addBullet('Flash visual colorido durante o anúncio', '●');

  // ==================== CHAT INTERNO ====================
  addPage();
  addTitle('09. CHAT INTERNO');
  
  drawChatIcon(pageWidth - margin - 25, y - 15, 25);
  
  addText('Comunicação instantânea entre os setores da unidade de saúde. Mensagens em tempo real com notificações sonoras.');
  addSpacer(5);
  
  // Mockup do chat
  drawInterfaceMockup(margin, y, maxWidth, 60, 'Chat Interno', [
    '[Cadastro] Paciente chegando!',
    '[Triagem] Recebido, obrigado!',
    '[Médico] Próximo paciente?',
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
  doc.text('MÉDICO', margin + 135, y + 11, { align: 'center' });
  
  y += 26;
  
  addSubtitle('Funcionalidades');
  addBullet('Enviar mensagem para setor específico ou todos', '●');
  addBullet('Indicador de digitação em tempo real', '●');
  addBullet('Sons distintos identificam o setor remetente', '●');
  addBullet('Emojis disponíveis para reações rápidas', '●');
  addBullet('Botão para limpar histórico do chat', '●');
  
  addSpacer(5);
  addInfoBox('LIMPEZA AUTOMÁTICA', [
    'As mensagens são excluídas automaticamente',
    'após 24 horas para economia de armazenamento.'
  ], [239, 246, 255]);

  // ==================== CONFIGURAÇÕES DE ÁUDIO ====================
  addPage();
  addTitle('10. CONFIGURAÇÕES DE ÁUDIO');
  
  drawSpeakerIcon(pageWidth - margin - 22, y - 12, 22);
  drawGearIcon(pageWidth - margin - 45, y - 10, 18);
  
  addText('Controle completo sobre volumes e vozes utilizados nos anúncios do sistema.');
  addSpacer(5);
  
  // Mockup de configurações
  drawInterfaceMockup(margin, y, maxWidth, 50, 'Configurações de Áudio', [
    'Notificação de Chamada:  [====|====]',
    'Volume da Voz TTS:       [=====|===]',
    'Notificação de Hora:     [===|=====]',
    'Voz de Hora:             [======|==]'
  ]);
  y += 58;
  
  addSubtitle('Ajuste de Volumes');
  addTableHeader(['Configuração', 'Descrição'], [55, 115]);
  addTableRow(['Notif. Chamada', 'Som antes do anúncio de paciente'], [55, 115], false);
  addTableRow(['Voz TTS', 'Volume dos anúncios por voz'], [55, 115], true);
  addTableRow(['Notif. Hora', 'Som antes do anúncio de hora'], [55, 115], false);
  addTableRow(['Voz Hora', 'Volume do anúncio de hora'], [55, 115], true);
  
  addSpacer(5);
  addSubtitle('Seleção de Vozes');
  addText('Vozes Femininas: Alice, Aria, Domi, Elli, Bella, Rachel');
  addText('Vozes Masculinas: Antonio, Arnold, Adam, Sam, Josh, Clyde');
  addSpacer(3);
  addBullet('Preferências são salvas por unidade de saúde', '●');
  addBullet('Botão "Testar" permite ouvir cada voz antes', '●');
  
  addSpacer(5);
  addInfoBox('ANÚNCIOS DE HORA', [
    'O sistema anuncia a hora 3 vezes por hora,',
    'em intervalos aleatórios. Silenciado de 22h às 6h.'
  ], [220, 252, 231]);

  // ==================== DICAS E BOAS PRÁTICAS ====================
  addPage();
  addTitle('11. DICAS E BOAS PRÁTICAS');
  addSpacer(3);
  
  addSubtitle('Configuração Inicial');
  addBullet('Verifique se todos os PCs estão na mesma rede', '✓');
  addBullet('Confirme que todos estão logados na mesma unidade', '✓');
  addBullet('Configure a TV com as credenciais tv/tv', '✓');
  addBullet('Clique na tela da TV para ativar o áudio', '✓');
  addBullet('Ajuste o volume da TV para um nível adequado', '✓');
  
  addSpacer(5);
  addSubtitle('Solução de Problemas');
  addSpacer(3);
  addTableHeader(['Problema', 'Solução'], [55, 115]);
  addTableRow(['Paciente não aparece', 'Verificar se está na mesma unidade'], [55, 115], false);
  addTableRow(['Áudio não funciona', 'Clicar na tela para ativar'], [55, 115], true);
  addTableRow(['Dados não sincronizam', 'Verificar conexão com internet'], [55, 115], false);
  addTableRow(['Tela travada', 'Aguardar auto-reload ou pressionar F5'], [55, 115], true);
  addTableRow(['Vídeo não toca', 'Verificar URL do vídeo configurado'], [55, 115], false);
  
  addSpacer(8);
  addSubtitle('Backup Regular');
  addBullet('Realize backup semanal dos dados no Administrativo', '●');
  addBullet('Armazene os arquivos JSON em local seguro', '●');
  addBullet('Mantenha backups dos últimos 30 dias', '●');
  
  addSpacer(8);
  addInfoBox('SUPORTE TÉCNICO', [
    'Em caso de dúvidas ou problemas técnicos,',
    'entre em contato com o administrador do sistema.',
    'Desenvolvido por Kalebe Gomes.'
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
      doc.text(`Página ${i - 1} de ${totalPages - 1}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
      doc.text('Desenvolvido por Kalebe Gomes', pageWidth / 2, pageHeight - 12, { align: 'center' });
    }
  }

  doc.save('Manual_Chamada_Pacientes.pdf');
};
