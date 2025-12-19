import { useMemo, useState, useEffect, useCallback } from 'react';
import { Lightbulb, Quote, Sparkles, X } from 'lucide-react';

const QUOTES = [
  {
    quote: "A alma é tingida com a cor de seus pensamentos.",
    author: "Marco Aurélio",
    insight: "A qualidade da nossa vida interna define como percebemos o mundo externo.",
    bgColor: "from-emerald-500 via-emerald-600 to-teal-700",
    emoji: "🎨"
  },
  {
    quote: "No meio da dificuldade reside a oportunidade.",
    author: "Albert Einstein",
    insight: "Crises não são apenas obstáculos, são o solo onde nascem as novas soluções.",
    bgColor: "from-blue-500 via-blue-600 to-indigo-700",
    emoji: "🚀"
  },
  {
    quote: "O sucesso é ir de fracasso em fracasso sem perder o entusiasmo.",
    author: "Winston Churchill",
    insight: "A vitória não é a ausência de quedas, mas a persistência do espírito.",
    bgColor: "from-orange-400 via-orange-500 to-red-600",
    emoji: "💪"
  },
  {
    quote: "Nós nos tornamos aquilo que pensamos.",
    author: "Earl Nightingale",
    insight: "Nossa mente é um jardim; o que plantamos hoje colheremos como realidade amanhã.",
    bgColor: "from-purple-500 via-purple-600 to-violet-700",
    emoji: "🧠"
  },
  {
    quote: "A sua vida é 10% do que acontece e 90% de como você reage.",
    author: "Charles Swindoll",
    insight: "Não controlamos os ventos, mas temos total poder sobre como ajustamos as velas.",
    bgColor: "from-indigo-500 via-indigo-600 to-purple-700",
    emoji: "⛵"
  },
  {
    quote: "A jornada de mil milhas começa com um único passo.",
    author: "Lao Tzu",
    insight: "O progresso real não exige saltos gigantes, apenas a coragem de começar agora.",
    bgColor: "from-red-500 via-rose-500 to-pink-600",
    emoji: "👣"
  },
  {
    quote: "A confiança em si mesmo é o primeiro segredo do sucesso.",
    author: "Ralph Waldo Emerson",
    insight: "Antes que o mundo acredite em você, você precisa ser o seu próprio maior aliado.",
    bgColor: "from-violet-500 via-purple-600 to-indigo-700",
    emoji: "🌟"
  },
  {
    quote: "Viver é a coisa mais rara do mundo. A maioria das pessoas apenas existe.",
    author: "Oscar Wilde",
    insight: "A verdadeira vida exige presença e autenticidade, não apenas seguir a rotina.",
    bgColor: "from-amber-400 via-orange-500 to-red-500",
    emoji: "✨"
  },
  {
    quote: "A educação tem raízes amargas, mas os seus frutos são doces.",
    author: "Aristóteles",
    insight: "O esforço do aprendizado é temporário, mas o poder do conhecimento é eterno.",
    bgColor: "from-teal-500 via-cyan-600 to-blue-700",
    emoji: "📚"
  },
  {
    quote: "Só sei que nada sei.",
    author: "Sócrates",
    insight: "A verdadeira sabedoria começa com a humildade de reconhecer nossas limitações.",
    bgColor: "from-fuchsia-500 via-pink-600 to-rose-700",
    emoji: "🗣️"
  },
  {
    quote: "O insucesso é apenas uma oportunidade para recomeçar com mais inteligência.",
    author: "Henry Ford",
    insight: "O erro não é um ponto final, mas um consultor gratuito para a próxima tentativa.",
    bgColor: "from-cyan-500 via-teal-600 to-emerald-700",
    emoji: "🔄"
  },
  {
    quote: "Seja a mudança que você deseja ver no mundo.",
    author: "Mahatma Gandhi",
    insight: "A transformação coletiva começa sempre por uma decisão individual.",
    bgColor: "from-rose-500 via-red-500 to-orange-600",
    emoji: "🌍"
  },
  {
    quote: "Penso, logo existo.",
    author: "René Descartes",
    insight: "A consciência e o questionamento são as provas fundamentais da nossa liberdade.",
    bgColor: "from-sky-500 via-blue-600 to-indigo-700",
    emoji: "💭"
  },
  {
    quote: "A simplicidade é o último grau de sofisticação.",
    author: "Leonardo da Vinci",
    insight: "Eliminar o desnecessário permite que o essencial brilhe com clareza.",
    bgColor: "from-lime-500 via-green-600 to-emerald-700",
    emoji: "🎯"
  },
  {
    quote: "O homem não é nada além do que ele faz de si mesmo.",
    author: "Jean-Paul Sartre",
    insight: "Somos os arquitetos do nosso destino através de cada escolha que fazemos.",
    bgColor: "from-pink-500 via-fuchsia-600 to-purple-700",
    emoji: "🏗️"
  },
  {
    quote: "Tudo o que ouvimos é uma opinião, não um fato.",
    author: "Marco Aurélio",
    insight: "Manter o discernimento protege nossa paz contra o ruído alheio.",
    bgColor: "from-yellow-400 via-amber-500 to-orange-600",
    emoji: "👂"
  },
  {
    quote: "A felicidade não é algo pronto. Ela vem das suas próprias ações.",
    author: "Dalai Lama",
    insight: "O bem-estar é um subproduto do nosso comportamento e não um presente do acaso.",
    bgColor: "from-emerald-500 via-teal-600 to-cyan-700",
    emoji: "😊"
  },
  {
    quote: "Experiência é o nome que cada um dá a seus erros.",
    author: "Oscar Wilde",
    insight: "Perdoar nossas falhas é o primeiro passo para convertê-las em sabedoria prática.",
    bgColor: "from-blue-500 via-indigo-600 to-violet-700",
    emoji: "📖"
  },
  {
    quote: "Onde quer que você vá, vá com todo o seu coração.",
    author: "Confúcio",
    insight: "A entrega total transforma tarefas comuns em obras extraordinárias.",
    bgColor: "from-red-500 via-rose-600 to-pink-700",
    emoji: "❤️"
  },
  {
    quote: "A persistência é o caminho do êxito.",
    author: "Charles Chaplin",
    insight: "O sucesso não é um evento isolado, mas o resultado de continuar tentando, apesar dos erros.",
    bgColor: "from-purple-500 via-violet-600 to-indigo-700",
    emoji: "🏆"
  },
  {
    quote: "Não julgue cada dia pela colheita que você faz, mas pelas sementes que você planta.",
    author: "Robert Louis Stevenson",
    insight: "O valor real está no esforço contínuo e na paciência, não apenas no resultado imediato.",
    bgColor: "from-green-500 via-emerald-600 to-teal-700",
    emoji: "🌱"
  },
  {
    quote: "Cada sonho que você deixa para trás é um pedaço do seu futuro que deixa de existir.",
    author: "Steve Jobs",
    insight: "Proteger suas aspirações é garantir que sua vida mantenha um propósito vibrante.",
    bgColor: "from-orange-500 via-amber-600 to-yellow-700",
    emoji: "💫"
  },
  {
    quote: "Se você quer algo novo, você precisa parar de fazer algo velho.",
    author: "Peter Drucker",
    insight: "A inovação e o crescimento exigem o desapego de hábitos que já não servem.",
    bgColor: "from-cyan-500 via-blue-600 to-indigo-700",
    emoji: "🔀"
  },
  {
    quote: "A dificuldade é o que acorda o gênio.",
    author: "Nassim Taleb",
    insight: "O desconforto é o catalisador necessário para extrair o máximo do nosso potencial.",
    bgColor: "from-fuchsia-500 via-purple-600 to-violet-700",
    emoji: "⚡"
  },
  {
    quote: "Nenhum homem é feliz se não se considera assim.",
    author: "Marco Aurélio",
    insight: "A felicidade é uma percepção interna cultivada, não uma validação externa.",
    bgColor: "from-teal-500 via-emerald-600 to-green-700",
    emoji: "🧘"
  },
  {
    quote: "A vida só pode ser compreendida olhando para trás; mas só pode ser vivida olhando para frente.",
    author: "Søren Kierkegaard",
    insight: "Aprender com o passado é vital, mas a energia deve estar focada no próximo passo.",
    bgColor: "from-rose-500 via-pink-600 to-fuchsia-700",
    emoji: "🔮"
  },
  {
    quote: "O mundo é um livro, e quem fica sentado em casa lê somente uma página.",
    author: "Santo Agostinho",
    insight: "A expansão de horizontes através da experiência é o que dá profundidade à existência.",
    bgColor: "from-blue-500 via-sky-600 to-cyan-700",
    emoji: "🌎"
  },
  {
    quote: "Exige muito de ti e espera pouco dos outros. Assim, evitarás muitos aborrecimentos.",
    author: "Confúcio",
    insight: "A autorresponsabilidade é a chave para uma vida com menos frustrações interpessoais.",
    bgColor: "from-amber-500 via-orange-600 to-red-700",
    emoji: "🎭"
  },
  {
    quote: "Se você pode sonhar, você pode realizar.",
    author: "Walt Disney",
    insight: "A imaginação é o rascunho de uma realidade que a determinação pode construir.",
    bgColor: "from-violet-500 via-purple-600 to-pink-700",
    emoji: "🏰"
  },
  {
    quote: "A vida é o que acontece enquanto você está ocupado fazendo outros planos.",
    author: "John Lennon",
    insight: "Apreciar o agora é a única forma de não perder a vida enquanto se espera pelo futuro.",
    bgColor: "from-indigo-500 via-blue-600 to-cyan-700",
    emoji: "🎸"
  },
  {
    quote: "A dedicação é a mãe da boa sorte.",
    author: "Benjamin Franklin",
    insight: "O que muitos chamam de sorte é, na verdade, o encontro da preparação com a oportunidade.",
    bgColor: "from-emerald-500 via-green-600 to-lime-700",
    emoji: "🍀"
  },
  {
    quote: "Seja tão bom que ninguém possa ignorá-lo.",
    author: "Steve Martin",
    insight: "A excelência técnica e o esforço constante criam uma autoridade que fala por si só.",
    bgColor: "from-red-500 via-orange-600 to-amber-700",
    emoji: "🌟"
  },
  {
    quote: "Se você está atravessando um inferno, continue andando.",
    author: "Winston Churchill",
    insight: "A única forma de sair de uma fase difícil é mantendo o movimento constante.",
    bgColor: "from-slate-500 via-gray-600 to-zinc-700",
    emoji: "🔥"
  },
  {
    quote: "O tempo é uma ilusão.",
    author: "Albert Einstein",
    insight: "O valor do tempo não está na sua contagem, mas na intensidade com que o usamos.",
    bgColor: "from-purple-500 via-indigo-600 to-blue-700",
    emoji: "⏰"
  },
  {
    quote: "A maior vingança contra um inimigo é ser diferente dele.",
    author: "Marco Aurélio",
    insight: "Manter sua integridade em meio à negatividade é a maior demonstração de força.",
    bgColor: "from-teal-500 via-cyan-600 to-sky-700",
    emoji: "🛡️"
  },
  {
    quote: "Não perca tempo discutindo sobre o que um bom homem deve ser. Seja.",
    author: "Marco Aurélio",
    insight: "Ações éticas e consistentes valem mais do que mil teorias sobre a moralidade.",
    bgColor: "from-orange-500 via-red-600 to-rose-700",
    emoji: "⚔️"
  },
  {
    quote: "A coragem não é a ausência de medo, mas o triunfo sobre ele.",
    author: "Nelson Mandela",
    insight: "Sentir medo é humano; agir apesar dele é o que define um vencedor.",
    bgColor: "from-yellow-500 via-amber-600 to-orange-700",
    emoji: "🦁"
  },
  {
    quote: "O conhecimento próprio não é garantia de felicidade, mas fornece a coragem para lutar por ela.",
    author: "Simone de Beauvoir",
    insight: "Entender quem somos nos dá as ferramentas para buscar o que realmente nos preenche.",
    bgColor: "from-pink-500 via-rose-600 to-red-700",
    emoji: "🔍"
  },
  {
    quote: "A arte de ser ora audacioso, ora prudente, é a arte de vencer.",
    author: "Napoleão Bonaparte",
    insight: "O equilíbrio entre o risco e a cautela é a base de toda estratégia de sucesso.",
    bgColor: "from-blue-500 via-indigo-600 to-purple-700",
    emoji: "♟️"
  },
  {
    quote: "Não somos responsáveis apenas pelo que fazemos, mas também pelo que deixamos de fazer.",
    author: "Molière",
    insight: "A omissão é uma escolha que também molda a nossa realidade e o mundo ao redor.",
    bgColor: "from-green-500 via-teal-600 to-cyan-700",
    emoji: "⚖️"
  },
  {
    quote: "A felicidade não está em fazer o que a gente quer, e sim querer o que a gente faz.",
    author: "Jean-Paul Sartre",
    insight: "Encontrar propósito nas obrigações diárias transforma o dever em satisfação.",
    bgColor: "from-fuchsia-500 via-pink-600 to-rose-700",
    emoji: "🎨"
  },
  {
    quote: "O que importa na vida não é o que acontece com você, mas como você se lembra disso.",
    author: "Gabriel García Márquez",
    insight: "Nossa narrativa pessoal é a lente que define se somos vítimas ou protagonistas.",
    bgColor: "from-amber-500 via-yellow-600 to-lime-700",
    emoji: "📝"
  },
  {
    quote: "Entre o estímulo e a resposta existe um espaço. Nesse espaço está nosso poder de escolha.",
    author: "Viktor Frankl",
    insight: "Nossa liberdade reside na capacidade de decidir como reagir a qualquer circunstância.",
    bgColor: "from-cyan-500 via-teal-600 to-emerald-700",
    emoji: "🧭"
  },
  {
    quote: "A liberdade consiste em fazer o que se deseja.",
    author: "John Stuart Mill",
    insight: "A autonomia pessoal é o alicerce para uma vida autêntica e significativa.",
    bgColor: "from-violet-500 via-indigo-600 to-blue-700",
    emoji: "🕊️"
  },
  {
    quote: "A filosofia é o melhor remédio para a mente.",
    author: "Cícero",
    insight: "Refletir sobre a existência acalma a alma e organiza o caos dos pensamentos.",
    bgColor: "from-rose-500 via-red-600 to-orange-700",
    emoji: "💊"
  },
  {
    quote: "O que o homem superior procura está em si mesmo; o que o homem pequeno procura está nos outros.",
    author: "Confúcio",
    insight: "A validação interna é estável; a busca por aprovação externa é uma prisão.",
    bgColor: "from-emerald-500 via-green-600 to-teal-700",
    emoji: "🏔️"
  },
  {
    quote: "Se você olhar, durante muito tempo, para um abismo, o abismo também olhará para dentro de você.",
    author: "Friedrich Nietzsche",
    insight: "Aquilo em que focamos intensamente acaba por moldar a nossa própria essência.",
    bgColor: "from-slate-600 via-gray-700 to-zinc-800",
    emoji: "👁️"
  },
  {
    quote: "É necessário cuidar da ética para não acharmos que tudo é normal.",
    author: "Mario Sergio Cortella",
    insight: "Manter nossos valores alerta evita que sejamos corrompidos pela mediocridade ao redor.",
    bgColor: "from-blue-500 via-sky-600 to-cyan-700",
    emoji: "🧿"
  },
  {
    quote: "O tempo levado para amolar o machado não é tempo perdido.",
    author: "Provérbio Chinês",
    insight: "A preparação estratégica economiza energia e garante um resultado mais eficiente.",
    bgColor: "from-orange-500 via-amber-600 to-yellow-700",
    emoji: "🪓"
  },
  {
    quote: "Um objetivo nem sempre é feito para ser alcançado, serve apenas como algo para se mirar.",
    author: "Bruce Lee",
    insight: "Ter uma direção clara é mais importante do que a velocidade ou a chegada imediata.",
    bgColor: "from-red-500 via-rose-600 to-pink-700",
    emoji: "🎯"
  },
  {
    quote: "A sorte é o que acontece quando a preparação encontra a oportunidade.",
    author: "Sêneca",
    insight: "O sucesso não é aleatório, é o resultado de estar pronto para o momento certo.",
    bgColor: "from-amber-500 via-orange-600 to-red-700",
    emoji: "🎲"
  },
  {
    quote: "Se você não sabe para onde ir, qualquer caminho serve.",
    author: "Lewis Carroll",
    insight: "A falta de objetivos claros nos torna reféns do acaso; a direção é mais importante que a velocidade.",
    bgColor: "from-purple-500 via-violet-600 to-indigo-700",
    emoji: "🧭"
  },
  {
    quote: "A melhor vingança é um sucesso estrondoso.",
    author: "Frank Sinatra",
    insight: "Em vez de retribuir a negatividade, use-a como combustível para alcançar resultados inquestionáveis.",
    bgColor: "from-blue-500 via-indigo-600 to-purple-700",
    emoji: "🎤"
  },
  {
    quote: "A criatividade exige coragem para abandonar as certezas.",
    author: "Erich Fromm",
    insight: "Inovar requer o desapego do que é seguro para abraçar o que é possível.",
    bgColor: "from-pink-500 via-rose-600 to-red-700",
    emoji: "🎨"
  },
  {
    quote: "Quem olha para fora sonha; quem olha para dentro acorda.",
    author: "Carl Jung",
    insight: "O verdadeiro despertar e a clareza vêm do autoconhecimento, não da busca por validação externa.",
    bgColor: "from-teal-500 via-cyan-600 to-blue-700",
    emoji: "👁️"
  },
  {
    quote: "Não é o que você olha que importa, é o que você vê.",
    author: "Henry David Thoreau",
    insight: "Nossa perspectiva é a lente que transforma fatos brutos em oportunidades ou problemas.",
    bgColor: "from-emerald-500 via-green-600 to-teal-700",
    emoji: "🔍"
  },
  {
    quote: "Tudo o que você sempre quis está do outro lado do medo.",
    author: "George Addair",
    insight: "O medo é a fronteira final entre a sua realidade atual e a sua evolução.",
    bgColor: "from-orange-500 via-red-600 to-rose-700",
    emoji: "🚪"
  },
  {
    quote: "A excelência não é um ato, mas um hábito.",
    author: "Will Durant",
    insight: "Somos o que fazemos repetidamente; a constância molda o caráter.",
    bgColor: "from-violet-500 via-purple-600 to-indigo-700",
    emoji: "🏅"
  },
  {
    quote: "O homem que remove montanhas começa carregando pedras pequenas.",
    author: "Provérbio Chinês",
    insight: "Grandes feitos são a soma de pequenas tarefas executadas com disciplina.",
    bgColor: "from-slate-500 via-gray-600 to-zinc-700",
    emoji: "🏔️"
  },
  {
    quote: "Se você quer ser feliz, seja.",
    author: "Liev Tolstói",
    insight: "A felicidade é uma decisão deliberada de focar no que é bom, agora mesmo.",
    bgColor: "from-yellow-400 via-amber-500 to-orange-600",
    emoji: "😊"
  },
  {
    quote: "Não tente ser uma pessoa de sucesso. Tente ser uma pessoa de valor.",
    author: "Albert Einstein",
    insight: "O sucesso é uma consequência natural da utilidade e da integridade que você oferece ao mundo.",
    bgColor: "from-cyan-500 via-teal-600 to-emerald-700",
    emoji: "💎"
  },
  {
    quote: "A vida se expande ou se encolhe de acordo com a nossa coragem.",
    author: "Anaïs Nin",
    insight: "Nossas experiências são proporcionais à nossa disposição de assumir riscos.",
    bgColor: "from-fuchsia-500 via-pink-600 to-rose-700",
    emoji: "🦋"
  },
  {
    quote: "O passado não tem poder sobre o momento presente.",
    author: "Eckhart Tolle",
    insight: "Você é livre para recomeçar a cada segundo, independentemente do que aconteceu antes.",
    bgColor: "from-blue-500 via-sky-600 to-cyan-700",
    emoji: "🌅"
  },
  {
    quote: "Seja humilde para admitir seus erros, inteligente para aprender com eles e maduro para corrigi-los.",
    author: "Autor Desconhecido",
    insight: "O erro é um degrau, não um abismo, para quem sabe usá-lo como lição.",
    bgColor: "from-green-500 via-emerald-600 to-teal-700",
    emoji: "🌿"
  },
  {
    quote: "Para ganhar o que você nunca teve, você deve fazer o que você nunca fez.",
    author: "Autor Desconhecido",
    insight: "Resultados diferentes exigem comportamentos e estratégias diferentes.",
    bgColor: "from-red-500 via-orange-600 to-amber-700",
    emoji: "🚀"
  },
  {
    quote: "A tragédia da vida não é que ela acabe tão cedo, mas que esperemos tanto para começá-la.",
    author: "W. M. Lewis",
    insight: "A urgência de viver plenamente deve superar a procrastinação existencial.",
    bgColor: "from-purple-500 via-indigo-600 to-blue-700",
    emoji: "⏳"
  },
  {
    quote: "Quanto mais eu treino, mais sorte eu tenho.",
    author: "Gary Player",
    insight: "O acaso favorece quem se dedica à exaustão.",
    bgColor: "from-lime-500 via-green-600 to-emerald-700",
    emoji: "⛳"
  },
  {
    quote: "As pessoas que são loucas o suficiente para achar que podem mudar o mundo são as que o fazem.",
    author: "Steve Jobs",
    insight: "A ousadia é o pré-requisito para qualquer transformação significativa.",
    bgColor: "from-slate-600 via-gray-700 to-zinc-800",
    emoji: "🍎"
  },
  {
    quote: "Se você não construir o seu sonho, alguém vai te contratar para ajudar a construir o dele.",
    author: "Tony Gaskins",
    insight: "Priorize seus objetivos ou será apenas um recurso para os objetivos alheios.",
    bgColor: "from-amber-500 via-yellow-600 to-lime-700",
    emoji: "🏗️"
  },
  {
    quote: "A paciência é amarga, mas seu fruto é doce.",
    author: "Jean-Jacques Rousseau",
    insight: "Suportar o tempo de espera é o preço para colher resultados duradouros.",
    bgColor: "from-orange-400 via-amber-500 to-yellow-600",
    emoji: "🍇"
  },
  {
    quote: "Grandes mentes discutem ideias; mentes médias discutem eventos; mentes pequenas discutem pessoas.",
    author: "Eleanor Roosevelt",
    insight: "Eleve o nível das suas conversas para elevar o nível da sua vida.",
    bgColor: "from-indigo-500 via-purple-600 to-violet-700",
    emoji: "💬"
  },
  {
    quote: "O fracasso é o tempero que dá sabor ao sucesso.",
    author: "Truman Capote",
    insight: "A vitória é mais valorizada quando conhecemos o custo da derrota.",
    bgColor: "from-rose-500 via-red-600 to-orange-700",
    emoji: "🌶️"
  },
  {
    quote: "Não é o mais forte que sobrevive, nem o mais inteligente, mas o que melhor se adapta às mudanças.",
    author: "Leon C. Megginson",
    insight: "A flexibilidade é a maior vantagem competitiva em um mundo incerto.",
    bgColor: "from-teal-500 via-emerald-600 to-green-700",
    emoji: "🦎"
  },
  {
    quote: "A liberdade é o que você faz com o que foi feito a você.",
    author: "Jean-Paul Sartre",
    insight: "Não somos vítimas do passado, somos os autores da nossa resposta a ele.",
    bgColor: "from-sky-500 via-blue-600 to-indigo-700",
    emoji: "🕊️"
  },
  {
    quote: "Um homem que não lê não tem vantagem sobre o homem que não sabe ler.",
    author: "Mark Twain",
    insight: "O conhecimento disponível só tem valor se for ativamente buscado e aplicado.",
    bgColor: "from-amber-500 via-orange-600 to-red-700",
    emoji: "📚"
  },
  {
    quote: "Nenhum mar calmo fez um marinheiro especialista.",
    author: "Provérbio Inglês",
    insight: "A maestria nasce da superação de tempestades, não da facilidade.",
    bgColor: "from-blue-600 via-indigo-700 to-purple-800",
    emoji: "⛵"
  },
  {
    quote: "Se você cansar, aprenda a descansar, não a desistir.",
    author: "Banksy",
    insight: "A pausa é estratégica para a longevidade; a desistência é o fim da possibilidade.",
    bgColor: "from-fuchsia-500 via-pink-600 to-rose-700",
    emoji: "😴"
  },
  {
    quote: "O entusiasmo é a base de todo progresso.",
    author: "Henry Ford",
    insight: "Sem paixão e energia, o talento permanece estagnado.",
    bgColor: "from-yellow-500 via-amber-600 to-orange-700",
    emoji: "🔥"
  },
  {
    quote: "Você nunca é velho demais para estabelecer outro objetivo ou sonhar um novo sonho.",
    author: "C.S. Lewis",
    insight: "O crescimento não tem data de validade enquanto houver fôlego.",
    bgColor: "from-green-500 via-teal-600 to-cyan-700",
    emoji: "🌳"
  },
  {
    quote: "Nada é tão permanente quanto uma mudança temporária.",
    author: "Milton Friedman",
    insight: "Cuidado com os hábitos que você adota 'só por agora', eles tendem a se enraizar.",
    bgColor: "from-violet-500 via-purple-600 to-indigo-700",
    emoji: "⚠️"
  },
  {
    quote: "O maior risco é não correr nenhum risco.",
    author: "Mark Zuckerberg",
    insight: "Em um mundo que muda rápido, a inércia é o caminho mais curto para a obsolescência.",
    bgColor: "from-blue-500 via-indigo-600 to-violet-700",
    emoji: "📱"
  },
  {
    quote: "Faça o que você pode, com o que você tem, onde você estiver.",
    author: "Theodore Roosevelt",
    insight: "A falta de recursos não justifica a falta de iniciativa.",
    bgColor: "from-emerald-500 via-green-600 to-lime-700",
    emoji: "🎖️"
  },
  {
    quote: "A felicidade é um perfume que você não pode passar nos outros sem cair algumas gotas em você.",
    author: "Ralph Waldo Emerson",
    insight: "Fazer o bem ao próximo é a forma mais egoísta de ser feliz.",
    bgColor: "from-pink-400 via-rose-500 to-fuchsia-600",
    emoji: "🌸"
  },
  {
    quote: "Trabalhe enquanto eles dormem, estude enquanto eles se divertem.",
    author: "Atribuído a diversos empreendedores",
    insight: "O sacrifício temporário gera um privilégio permanente.",
    bgColor: "from-slate-600 via-gray-700 to-zinc-800",
    emoji: "🌙"
  },
  {
    quote: "Quem tem um 'porquê' suporta quase qualquer 'como'.",
    author: "Friedrich Nietzsche",
    insight: "Um propósito forte torna qualquer sacrifício suportável.",
    bgColor: "from-red-500 via-rose-600 to-pink-700",
    emoji: "❓"
  },
  {
    quote: "O otimista vê a oportunidade em cada perigo; o pessimista vê o perigo em cada oportunidade.",
    author: "Winston Churchill",
    insight: "A atitude mental determina o que você extrai das circunstâncias.",
    bgColor: "from-amber-400 via-yellow-500 to-lime-600",
    emoji: "☀️"
  },
  {
    quote: "A imaginação é mais importante que o conhecimento.",
    author: "Albert Einstein",
    insight: "O conhecimento é limitado ao que sabemos; a imaginação abrange tudo o que viremos a saber.",
    bgColor: "from-purple-500 via-violet-600 to-indigo-700",
    emoji: "💡"
  },
  {
    quote: "Saber não é suficiente; devemos aplicar. Querer não é suficiente; devemos fazer.",
    author: "Johann Wolfgang von Goethe",
    insight: "A teoria sem prática é estéril; a intenção sem ação é ilusão.",
    bgColor: "from-cyan-500 via-teal-600 to-emerald-700",
    emoji: "⚙️"
  },
  {
    quote: "O sucesso não é a chave para a felicidade. A felicidade é a chave para o sucesso.",
    author: "Albert Schweitzer",
    insight: "Se você ama o que faz, o sucesso será um efeito colateral inevitável.",
    bgColor: "from-orange-500 via-amber-600 to-yellow-700",
    emoji: "🔑"
  },
  {
    quote: "A disciplina é a ponte entre metas e realizações.",
    author: "Jim Rohn",
    insight: "O desejo planeja, mas é a repetição diária que constrói.",
    bgColor: "from-blue-500 via-sky-600 to-cyan-700",
    emoji: "🌉"
  },
  {
    quote: "Nós somos o que fazemos repetidamente.",
    author: "Aristóteles",
    insight: "A excelência é um estilo de vida cultivado, não um evento fortuito.",
    bgColor: "from-indigo-500 via-purple-600 to-violet-700",
    emoji: "🔄"
  },
  {
    quote: "Cada dia é uma nova vida para um homem sábio.",
    author: "Dale Carnegie",
    insight: "Esqueça os erros de ontem e as preocupações de amanhã; foque no presente.",
    bgColor: "from-rose-500 via-pink-600 to-fuchsia-700",
    emoji: "🌄"
  },
  {
    quote: "Mire na lua. Mesmo que você erre, cairá entre as estrelas.",
    author: "Les Brown",
    insight: "Ambições elevadas garantem um padrão de vida superior, mesmo que o objetivo final mude.",
    bgColor: "from-slate-600 via-indigo-700 to-purple-800",
    emoji: "🌙"
  },
  {
    quote: "Para ser insubstituível, deve-se sempre ser diferente.",
    author: "Coco Chanel",
    insight: "A autenticidade é o que protege seu valor em um mercado de cópias.",
    bgColor: "from-pink-500 via-fuchsia-600 to-purple-700",
    emoji: "👗"
  },
  {
    quote: "Sua imaginação é a prévia das próximas atrações da sua vida.",
    author: "Albert Einstein",
    insight: "O que você visualiza hoje prepara o terreno para o que você viverá amanhã.",
    bgColor: "from-violet-500 via-purple-600 to-indigo-700",
    emoji: "🎬"
  },
  {
    quote: "A melhor maneira de prever o futuro é criá-lo.",
    author: "Peter Drucker",
    insight: "Deixe de ser um espectador do destino e assuma o protagonismo das suas ações.",
    bgColor: "from-teal-500 via-cyan-600 to-blue-700",
    emoji: "🔮"
  },
  {
    quote: "Seus problemas são seus maiores tesouros.",
    author: "Provérbio Budista",
    insight: "São os conflitos que forçam o crescimento da alma e da inteligência.",
    bgColor: "from-amber-500 via-orange-600 to-red-700",
    emoji: "💰"
  },
  {
    quote: "O silêncio é uma fonte de grande força.",
    author: "Lao Tzu",
    insight: "A quietude permite ouvir a intuição e processar a sabedoria antes de agir.",
    bgColor: "from-emerald-500 via-teal-600 to-cyan-700",
    emoji: "🤫"
  }
];

const STORAGE_KEY = 'dailyQuote_dismissState';
const DISMISS_DELAY = 60 * 60 * 1000; // 1 hour
const QUOTE_ROTATION_INTERVAL = 30 * 1000; // 30 seconds per quote

interface DismissState {
  dismissCount: number;
  lastDismissTime: number;
  lastQuoteIndex: number;
}

function getRandomQuoteIndex(excludeIndex?: number): number {
  let index = Math.floor(Math.random() * QUOTES.length);
  if (excludeIndex !== undefined && QUOTES.length > 1) {
    while (index === excludeIndex) {
      index = Math.floor(Math.random() * QUOTES.length);
    }
  }
  return index;
}

function getDailyQuoteIndex(): number {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return seed % QUOTES.length;
}

export function DailyQuoteCard() {
  const [isHidden, setIsHidden] = useState(true);
  const [quoteIndex, setQuoteIndex] = useState(getDailyQuoteIndex);
  const [animationKey, setAnimationKey] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [showAuthor, setShowAuthor] = useState(false);
  const [showInsight, setShowInsight] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const dailyQuote = useMemo(() => QUOTES[quoteIndex], [quoteIndex]);

  // Check if should be visible based on dismiss state
  useEffect(() => {
    const checkVisibility = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
          setIsHidden(false);
          return;
        }

        const state: DismissState = JSON.parse(stored);
        const now = Date.now();
        const elapsed = now - state.lastDismissTime;

        if (elapsed >= DISMISS_DELAY) {
          // Dismiss expired, show with new quote
          const newIndex = getRandomQuoteIndex(state.lastQuoteIndex);
          setQuoteIndex(newIndex);
          localStorage.removeItem(STORAGE_KEY);
          setIsHidden(false);
        } else {
          // Still within dismiss period
          setIsHidden(true);
        }
      } catch {
        setIsHidden(false);
      }
    };

    checkVisibility();

    // Check every minute for visibility changes
    const interval = setInterval(checkVisibility, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsClosing(true);
    
    setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const now = Date.now();
        
        let newState: DismissState;
        
        if (stored) {
          const state: DismissState = JSON.parse(stored);
          newState = {
            dismissCount: state.dismissCount + 1,
            lastDismissTime: now,
            lastQuoteIndex: quoteIndex,
          };
        } else {
          newState = {
            dismissCount: 1,
            lastDismissTime: now,
            lastQuoteIndex: quoteIndex,
          };
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        setIsHidden(true);
        setIsClosing(false);
      } catch {
        setIsHidden(true);
        setIsClosing(false);
      }
    }, 400);
  }, [quoteIndex]);

  const runAnimation = useCallback(() => {
    setIsVisible(true);
    setShowBadge(false);
    setShowQuote(false);
    setShowAuthor(false);
    setShowInsight(false);

    const timers = [
      setTimeout(() => setShowBadge(true), 300),
      setTimeout(() => setShowQuote(true), 600),
      setTimeout(() => setShowAuthor(true), 900),
      setTimeout(() => setShowInsight(true), 1200),
    ];

    return timers;
  }, []);

  // Smooth crossfade transition to next quote
  const transitionToNextQuote = useCallback(() => {
    setIsTransitioning(true);
    
    // Fade out current content smoothly
    setShowInsight(false);
    setTimeout(() => setShowAuthor(false), 100);
    setTimeout(() => setShowQuote(false), 200);
    setTimeout(() => setShowBadge(false), 300);
    
    // After fade out, change quote and fade in
    setTimeout(() => {
      setQuoteIndex(prev => getRandomQuoteIndex(prev));
      setAnimationKey(prev => prev + 1);
      setIsTransitioning(false);
      
      // Fade in new content with staggered delays
      setTimeout(() => setShowBadge(true), 200);
      setTimeout(() => setShowQuote(true), 500);
      setTimeout(() => setShowAuthor(true), 800);
      setTimeout(() => setShowInsight(true), 1100);
    }, 600);
  }, []);

  useEffect(() => {
    if (isHidden) return;

    const timers = runAnimation();

    const interval = setInterval(() => {
      transitionToNextQuote();
    }, QUOTE_ROTATION_INTERVAL);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [runAnimation, isHidden, transitionToNextQuote]);

  if (isHidden) return null;

  return (
    <div 
      key={animationKey}
      className={`
        relative w-full overflow-hidden rounded-xl 
        bg-gradient-to-r ${dailyQuote.bgColor} 
        p-3 sm:p-4 shadow-lg
        border border-white/20
        transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${isClosing 
          ? 'opacity-0 scale-95 translate-y-4' 
          : isVisible 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 translate-y-6 scale-98'
        }
        ${isTransitioning ? 'bg-opacity-95' : 'bg-opacity-100'}
      `}
    >
      {/* Close Button - More Visible */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 z-20 p-1.5 rounded-full 
          bg-white/30 hover:bg-white/50 backdrop-blur-sm
          text-white hover:text-white shadow-md
          transition-all duration-200 hover:scale-110
          border border-white/40"
        title="Fechar (volta em 1 hora)"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Animated gradient overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0"
        style={{
          backgroundSize: '200% 100%',
          animation: 'shimmer 4s ease-in-out infinite',
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            style={{
              left: `${15 + i * 20}%`,
              animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
              top: '80%',
            }}
          />
        ))}
      </div>

      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className={`
            absolute -top-6 -right-6 text-[80px] rotate-12
            transition-all duration-1000 delay-300
            ${isVisible ? 'text-white/10 translate-x-0 rotate-12' : 'text-white/0 translate-x-20 rotate-45'}
          `}
        >
          {dailyQuote.emoji}
        </div>
        <div 
          className={`
            absolute -bottom-6 -left-6 
            transition-all duration-1000 delay-500
            ${isVisible ? 'text-white/5 translate-y-0 rotate-0' : 'text-white/0 translate-y-10 -rotate-12'}
          `}
        >
          <Lightbulb className="w-20 h-20" />
        </div>
        <div 
          className={`
            absolute top-2 left-2 text-white/20
            transition-all duration-700 delay-200
            ${showBadge ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
          `}
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
        </div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Badge */}
        <div 
          className={`
            inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 mb-2
            transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
            ${showBadge 
              ? 'opacity-100 translate-x-0 scale-100' 
              : 'opacity-0 -translate-x-6 scale-90'
            }
          `}
        >
          <Sparkles 
            className={`w-3 h-3 text-yellow-300 transition-transform duration-700 ease-out ${showBadge ? 'rotate-[360deg]' : 'rotate-0'}`} 
          />
          <span className="text-white text-[10px] font-semibold tracking-wide">FRASE DO DIA</span>
        </div>

        {/* Quote */}
        <div 
          className={`
            flex items-start gap-1.5 mb-2 pr-6
            transition-all duration-600 ease-[cubic-bezier(0.4,0,0.2,1)]
            ${showQuote 
              ? 'opacity-100 translate-y-0 blur-0' 
              : 'opacity-0 translate-y-4 blur-[2px]'
            }
          `}
        >
          <Quote 
            className={`
              w-4 h-4 text-white/60 flex-shrink-0 mt-0.5
              transition-all duration-500 ease-out
              ${showQuote ? 'rotate-0 scale-100' : '-rotate-45 scale-0'}
            `} 
          />
          <p className="text-white font-bold text-sm sm:text-base leading-snug drop-shadow-md transition-all duration-500">
            {dailyQuote.quote}
          </p>
        </div>
        
        {/* Author */}
        <p 
          className={`
            text-white/90 text-xs font-medium mb-2 pl-5
            transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
            ${showAuthor 
              ? 'opacity-100 translate-x-0 blur-0' 
              : 'opacity-0 translate-x-6 blur-[1px]'
            }
          `}
        >
          — {dailyQuote.author}
        </p>
        
        {/* Insight Box */}
        <div 
          className={`
            flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-lg px-2.5 py-2
            transition-all duration-600 ease-[cubic-bezier(0.4,0,0.2,1)]
            ${showInsight 
              ? 'opacity-100 translate-y-0 scale-100 blur-0' 
              : 'opacity-0 translate-y-6 scale-95 blur-[2px]'
            }
          `}
        >
          <div 
            className={`
              flex-shrink-0 w-7 h-7 bg-yellow-400/90 rounded-full flex items-center justify-center shadow-md
              transition-all duration-500 ease-out delay-75
              ${showInsight ? 'scale-100 rotate-0' : 'scale-0 -rotate-180'}
            `}
          >
            <Lightbulb className="w-3.5 h-3.5 text-yellow-900" />
          </div>
          <div className="transition-all duration-400">
            <p className="text-yellow-300 text-[10px] font-semibold uppercase tracking-wider">Insight</p>
            <p className="text-white text-xs leading-tight">
              {dailyQuote.insight}
            </p>
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes float {
          0%, 100% { 
            transform: translateY(0) scale(1); 
            opacity: 0.2;
          }
          50% { 
            transform: translateY(-100px) scale(1.5); 
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
}
