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
  }
];

const STORAGE_KEY = 'dailyQuote_dismissState';
const FIRST_DISMISS_DELAY = 15 * 60 * 1000; // 15 minutes
const SECOND_DISMISS_DELAY = 9 * 60 * 60 * 1000; // 9 hours
const ANIMATION_CYCLE = 15000; // 15 seconds per animation cycle

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

        if (state.dismissCount === 1 && elapsed >= FIRST_DISMISS_DELAY) {
          // First dismiss expired, show with new quote
          const newIndex = getRandomQuoteIndex(state.lastQuoteIndex);
          setQuoteIndex(newIndex);
          setIsHidden(false);
        } else if (state.dismissCount >= 2 && elapsed >= SECOND_DISMISS_DELAY) {
          // Second dismiss expired, reset and show
          localStorage.removeItem(STORAGE_KEY);
          setQuoteIndex(getDailyQuoteIndex());
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
    setIsVisible(false);
    setShowBadge(false);
    setShowQuote(false);
    setShowAuthor(false);
    setShowInsight(false);

    const timers = [
      setTimeout(() => setIsVisible(true), 100),
      setTimeout(() => setShowBadge(true), 500),
      setTimeout(() => setShowQuote(true), 900),
      setTimeout(() => setShowAuthor(true), 1300),
      setTimeout(() => setShowInsight(true), 1700),
    ];

    return timers;
  }, []);

  useEffect(() => {
    if (isHidden) return;

    let timers = runAnimation();

    const interval = setInterval(() => {
      timers.forEach(clearTimeout);
      setAnimationKey(prev => prev + 1);
      timers = runAnimation();
    }, ANIMATION_CYCLE);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(interval);
    };
  }, [runAnimation, isHidden]);

  if (isHidden) return null;

  return (
    <div 
      key={animationKey}
      className={`
        relative w-full overflow-hidden rounded-xl 
        bg-gradient-to-r ${dailyQuote.bgColor} 
        p-3 sm:p-4 shadow-lg
        border border-white/20
        transition-all duration-500 ease-out
        ${isClosing 
          ? 'opacity-0 scale-95 translate-y-4' 
          : isVisible 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 translate-y-6 scale-98'
        }
      `}
    >
      {/* Close Button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 z-20 p-1 rounded-full bg-black/20 hover:bg-black/40 
          text-white/70 hover:text-white transition-all duration-200 hover:scale-110"
        title="Fechar (volta depois)"
      >
        <X className="w-3 h-3" />
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
            transition-all duration-700 ease-out
            ${showBadge 
              ? 'opacity-100 translate-x-0 scale-100' 
              : 'opacity-0 -translate-x-8 scale-90'
            }
          `}
        >
          <Sparkles 
            className={`w-3 h-3 text-yellow-300 transition-transform duration-1000 ${showBadge ? 'rotate-[360deg]' : 'rotate-0'}`} 
          />
          <span className="text-white text-[10px] font-semibold tracking-wide">FRASE DO DIA</span>
        </div>

        {/* Quote */}
        <div 
          className={`
            flex items-start gap-1.5 mb-2 pr-6
            transition-all duration-800 ease-out
            ${showQuote 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-6'
            }
          `}
        >
          <Quote 
            className={`
              w-4 h-4 text-white/60 flex-shrink-0 mt-0.5
              transition-all duration-700
              ${showQuote ? 'rotate-0 scale-100' : '-rotate-45 scale-0'}
            `} 
          />
          <p className="text-white font-bold text-sm sm:text-base leading-snug drop-shadow-md">
            {dailyQuote.quote}
          </p>
        </div>
        
        {/* Author */}
        <p 
          className={`
            text-white/90 text-xs font-medium mb-2 pl-5
            transition-all duration-700 ease-out
            ${showAuthor 
              ? 'opacity-100 translate-x-0' 
              : 'opacity-0 translate-x-8'
            }
          `}
        >
          — {dailyQuote.author}
        </p>
        
        {/* Insight Box */}
        <div 
          className={`
            flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-lg px-2.5 py-2
            transition-all duration-900 ease-out
            ${showInsight 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 translate-y-8 scale-95'
            }
          `}
        >
          <div 
            className={`
              flex-shrink-0 w-7 h-7 bg-yellow-400/90 rounded-full flex items-center justify-center shadow-md
              transition-all duration-700 delay-100
              ${showInsight ? 'scale-100 rotate-0' : 'scale-0 -rotate-180'}
            `}
          >
            <Lightbulb className="w-3.5 h-3.5 text-yellow-900" />
          </div>
          <div>
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
