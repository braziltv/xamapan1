// Mapa de correções de acentos para nomes brasileiros comuns
// Chave: versão sem acento (lowercase), Valor: versão correta com acento

const ACCENT_CORRECTIONS: Record<string, string> = {
  // Nomes próprios
  'jose': 'José',
  'joao': 'João',
  'maria': 'Maria',
  'andre': 'André',
  'andreia': 'Andréia',
  'adriana': 'Adriana',
  'angela': 'Ângela',
  'antonio': 'Antônio',
  'benedito': 'Benedito',
  'candido': 'Cândido',
  'cecilia': 'Cecília',
  'celia': 'Célia',
  'cesar': 'César',
  'claudia': 'Cláudia',
  'claudio': 'Cláudio',
  'cristovao': 'Cristóvão',
  'daniele': 'Daniele',
  'debora': 'Débora',
  'denise': 'Denise',
  'edneia': 'Ednéia',
  'elias': 'Elias',
  'eugenio': 'Eugênio',
  'eunice': 'Eunice',
  'fabio': 'Fábio',
  'fatima': 'Fátima',
  'flavio': 'Flávio',
  'geraldo': 'Geraldo',
  'helio': 'Hélio',
  'ines': 'Inês',
  'ivanildo': 'Ivanildo',
  'joaquim': 'Joaquim',
  'julia': 'Júlia',
  'julio': 'Júlio',
  'lidia': 'Lídia',
  'lucia': 'Lúcia',
  'lucio': 'Lúcio',
  'luis': 'Luís',
  'luiz': 'Luiz',
  'luiza': 'Luíza',
  'marcia': 'Márcia',
  'marcio': 'Márcio',
  'mario': 'Mário',
  'mateus': 'Mateus',
  'monica': 'Mônica',
  'nelio': 'Nélio',
  'nelson': 'Nelson',
  'patricia': 'Patrícia',
  'paulo': 'Paulo',
  'pedro': 'Pedro',
  'rafael': 'Rafael',
  'raquel': 'Raquel',
  'regina': 'Regina',
  'renato': 'Renato',
  'rogerio': 'Rogério',
  'romulo': 'Rômulo',
  'rosangela': 'Rosângela',
  'sebastiao': 'Sebastião',
  'sergio': 'Sérgio',
  'silvio': 'Sílvio',
  'simone': 'Simone',
  'sonia': 'Sônia',
  'tania': 'Tânia',
  'valeria': 'Valéria',
  'valerio': 'Valério',
  'vania': 'Vânia',
  'vera': 'Vera',
  'vinicius': 'Vinícius',
  'zelia': 'Zélia',
  
  // Sobrenomes
  'acacio': 'Acácio',
  'aguia': 'Águia',
  'alvares': 'Álvares',
  'alvaro': 'Álvaro',
  'araujo': 'Araújo',
  'assumpcao': 'Assunção',
  'assuncao': 'Assunção',
  'avila': 'Ávila',
  'bras': 'Brás',
  'caetano': 'Caetano',
  'camoes': 'Camões',
  'carrao': 'Carrão',
  'conceicao': 'Conceição',
  'corcao': 'Corção',
  'cunha': 'Cunha',
  'domingos': 'Domingos',
  'estevao': 'Estêvão',
  'eugenios': 'Eugênios',
  'falcao': 'Falcão',
  'ferrao': 'Ferrão',
  'franca': 'França',
  'garcao': 'Garção',
  'germano': 'Germano',
  'goncalves': 'Gonçalves',
  'guedes': 'Guedes',
  'guimaraes': 'Guimarães',
  'irmao': 'Irmão',
  'januario': 'Januário',
  'jeronimo': 'Jerônimo',
  'leao': 'Leão',
  'lourenco': 'Lourenço',
  'macedo': 'Macedo',
  'magalhaes': 'Magalhães',
  'marao': 'Marão',
  'matias': 'Matias',
  'medeiros': 'Medeiros',
  'mendonca': 'Mendonça',
  'moraes': 'Moraes',
  'mourao': 'Mourão',
  'munhoz': 'Munhoz',
  'muniz': 'Muniz',
  'nacao': 'Nação',
  'nunes': 'Nunes',
  'olimpio': 'Olímpio',
  'osorio': 'Osório',
  'paixao': 'Paixão',
  'placido': 'Plácido',
  'procopio': 'Procópio',
  'ramao': 'Ramão',
  'rasao': 'Razão',
  'salomao': 'Salomão',
  'sao': 'São',
  'simao': 'Simão',
  'simoes': 'Simões',
  'souza': 'Souza',
  'teofilo': 'Teófilo',
  'tomas': 'Tomás',
  'tome': 'Tomé',
  'verissimo': 'Veríssimo',
  'vieira': 'Vieira',
};

// Remove acentos de uma string
export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Verifica se uma palavra tem correção de acento disponível
export function getAccentCorrection(word: string): string | null {
  const normalized = removeAccents(word.toLowerCase());
  return ACCENT_CORRECTIONS[normalized] || null;
}

// Corrige acentos em um nome completo
export function correctAccents(fullName: string): { corrected: string; hadCorrections: boolean } {
  const words = fullName.trim().split(/\s+/);
  let hadCorrections = false;
  
  const correctedWords = words.map(word => {
    // Se a palavra já tem acentos, mantém como está
    if (word !== removeAccents(word)) {
      return word;
    }
    
    const correction = getAccentCorrection(word);
    if (correction) {
      hadCorrections = true;
      return correction;
    }
    
    // Se não encontrou correção, capitaliza a primeira letra
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  
  return {
    corrected: correctedWords.join(' '),
    hadCorrections,
  };
}

// Sugere correção para uma palavra específica
export function suggestCorrection(word: string): { original: string; suggestion: string } | null {
  if (!word || word.length < 2) return null;
  
  const correction = getAccentCorrection(word);
  if (correction && correction.toLowerCase() !== word.toLowerCase()) {
    return {
      original: word,
      suggestion: correction,
    };
  }
  
  return null;
}

// Verifica se uma string contém acentos
export function hasAccents(str: string): boolean {
  return str !== removeAccents(str);
}
