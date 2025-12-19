import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { searchNames, searchSurnames } from '@/data/brazilianNames';
import { cn } from '@/lib/utils';
import { correctAccents, suggestCorrection, hasAccents, getAccentCorrection } from '@/utils/accentCorrection';
import { Undo2 } from 'lucide-react';
import { toast } from 'sonner';

interface NameAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function NameAutocomplete({
  value,
  onChange,
  placeholder = "Nome do paciente",
  className,
  disabled
}: NameAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [accentSuggestion, setAccentSuggestion] = useState<{ original: string; suggestion: string } | null>(null);
  const [recentCorrections, setRecentCorrections] = useState<{ original: string; corrected: string; position: number }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Determina qual parte do nome está sendo editada
  const getCurrentWord = useCallback(() => {
    const words = value.split(' ');
    const cursorPosition = inputRef.current?.selectionStart || value.length;
    
    let charCount = 0;
    for (let i = 0; i < words.length; i++) {
      charCount += words[i].length;
      if (charCount >= cursorPosition) {
        return { word: words[i], index: i, isFirstWord: i === 0 };
      }
      charCount += 1; // espaço
    }
    
    return { word: words[words.length - 1], index: words.length - 1, isFirstWord: words.length <= 1 };
  }, [value]);

  // Aplica correção automática a uma palavra específica
  const autoCorrectWord = useCallback((word: string): { corrected: string; wasChanged: boolean } => {
    if (!word || word.length < 2) return { corrected: word, wasChanged: false };
    
    // Verifica se já tem acentos - não corrige
    if (hasAccents(word)) return { corrected: word, wasChanged: false };
    
    const correction = getAccentCorrection(word);
    if (correction && correction.toLowerCase() !== word.toLowerCase()) {
      return { corrected: correction, wasChanged: true };
    }
    
    // Capitaliza a primeira letra se não houver correção
    const capitalized = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    return { corrected: capitalized, wasChanged: false };
  }, []);

  // Atualiza sugestões baseado no texto atual
  const updateSuggestions = useCallback(() => {
    const { word, isFirstWord } = getCurrentWord();
    
    if (word.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      setAccentSuggestion(null);
      return;
    }

    // Verifica se há sugestão de acento para a palavra atual
    const accentSug = suggestCorrection(word);
    setAccentSuggestion(accentSug);

    // Primeiro nome: busca em nomes próprios
    // Demais palavras: busca em sobrenomes + nomes
    let results: string[];
    if (isFirstWord) {
      results = searchNames(word, 8);
    } else {
      // Prioriza sobrenomes para palavras após o primeiro nome
      const surnameResults = searchSurnames(word, 5);
      const nameResults = searchNames(word, 3);
      results = [...new Set([...surnameResults, ...nameResults])].slice(0, 8);
    }

    setSuggestions(results);
    setShowSuggestions(results.length > 0 || accentSug !== null);
    setSelectedIndex(-1);
  }, [getCurrentWord]);

  // Seleciona uma sugestão
  const selectSuggestion = useCallback((suggestion: string) => {
    const words = value.split(' ');
    const { index } = getCurrentWord();
    
    words[index] = suggestion;
    
    const newValue = words.join(' ') + ' ';
    onChange(newValue);
    setShowSuggestions(false);
    setSuggestions([]);
    setAccentSuggestion(null);
    
    // Foca no input e move cursor para o final após seleção
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const len = newValue.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }, 10);
  }, [value, getCurrentWord, onChange]);

  // Aplica correção de acentos ao nome completo
  const applyAccentCorrection = useCallback(() => {
    const { corrected } = correctAccents(value);
    onChange(corrected);
    setAccentSuggestion(null);
  }, [value, onChange]);

  // Desfaz uma correção recente
  const undoCorrection = useCallback((correction: { original: string; corrected: string; position: number }) => {
    const words = value.split(' ');
    if (words[correction.position] === correction.corrected) {
      words[correction.position] = correction.original.charAt(0).toUpperCase() + correction.original.slice(1).toLowerCase();
      const newValue = words.join(' ');
      onChange(newValue);
      setRecentCorrections(prev => prev.filter(c => c.position !== correction.position));
    }
  }, [value, onChange]);

  // Handler de mudança com correção automática ao digitar espaço
  const handleChange = useCallback((newValue: string) => {
    // Verifica se há números e mostra aviso
    if (/[0-9]/.test(newValue)) {
      toast.warning('Números não são permitidos', { duration: 2000 });
    }
    // Remove números e converte automaticamente para maiúsculas
    newValue = newValue.replace(/[0-9]/g, '').toUpperCase();
    const oldValue = value;
    const oldWords = oldValue.split(' ');
    const newWords = newValue.split(' ');
    
    // Detecta se acabou de adicionar um espaço (terminou uma palavra)
    if (newValue.endsWith(' ') && !oldValue.endsWith(' ') && newWords.length > oldWords.length) {
      // Pega a palavra que acabou de ser terminada (penúltima palavra no novo valor)
      const wordIndex = newWords.length - 2;
      const wordToCorrect = newWords[wordIndex];
      
      if (wordToCorrect && wordToCorrect.length >= 2) {
        const { corrected, wasChanged } = autoCorrectWord(wordToCorrect);
        
        if (wasChanged) {
          newWords[wordIndex] = corrected;
          const correctedValue = newWords.join(' ');
          onChange(correctedValue);
          
          // Adiciona à lista de correções recentes para permitir desfazer
          setRecentCorrections(prev => {
            const filtered = prev.filter(c => c.position !== wordIndex);
            return [...filtered, { original: wordToCorrect, corrected, position: wordIndex }].slice(-5);
          });
          return;
        }
      }
    }
    
    onChange(newValue);
  }, [value, onChange, autoCorrectWord]);

  // Handlers de teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectSuggestion(suggestions[selectedIndex]);
        } else if (suggestions.length > 0) {
          selectSuggestion(suggestions[0]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
      case 'Tab':
        if (suggestions.length > 0) {
          e.preventDefault();
          selectSuggestion(suggestions[selectedIndex >= 0 ? selectedIndex : 0]);
        }
        break;
    }
  };

  // Atualiza sugestões quando o valor muda
  useEffect(() => {
    updateSuggestions();
  }, [value, updateSuggestions]);

  // Limpa correções quando o valor é limpo
  useEffect(() => {
    if (!value.trim()) {
      setRecentCorrections([]);
    }
  }, [value]);

  // Fecha sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => value.length > 0 && updateSuggestions()}
        onPaste={(e) => {
          e.preventDefault();
          toast.warning('Colar não permitido', {
            description: 'Por favor, digite o nome do paciente manualmente.',
            duration: 3000,
          });
        }}
        placeholder={placeholder}
        className={cn("uppercase", className)}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      
      {/* Indicadores de correção recente com opção de desfazer */}
      {recentCorrections.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {recentCorrections.map((correction, idx) => (
            <button
              key={`${correction.position}-${idx}`}
              type="button"
              onClick={() => undoCorrection(correction)}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
              title={`Clique para manter "${correction.original}" sem correção`}
            >
              <span className="line-through text-muted-foreground">{correction.original}</span>
              <span>→</span>
              <span className="font-medium">{correction.corrected}</span>
              <Undo2 className="w-3 h-3 ml-0.5" />
            </button>
          ))}
        </div>
      )}
      
      {showSuggestions && (suggestions.length > 0 || accentSuggestion) && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {/* Sugestão de correção de acento */}
          {accentSuggestion && (
            <div className="p-2 border-b border-border bg-amber-50 dark:bg-amber-900/20">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-amber-600 dark:text-amber-400">✨</span>
                  <span className="text-muted-foreground">Corrigir:</span>
                  <span className="line-through text-muted-foreground">{accentSuggestion.original}</span>
                  <span className="text-foreground">→</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-300">{accentSuggestion.suggestion}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => selectSuggestion(accentSuggestion.suggestion)}
                    className="px-2 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {suggestions.length > 0 && (
            <div className="p-1">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-sm text-sm transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    index === selectedIndex && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => selectSuggestion(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="font-medium">{suggestion}</span>
                  {/* Indicador se é variação acentuada */}
                  {hasAccents(suggestion) && (
                    <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">(acentuado)</span>
                  )}
                </button>
              ))}
            </div>
          )}
          
          <div className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground bg-muted/50">
            ↑↓ navegar • Enter/Tab selecionar • Esc fechar
          </div>
        </div>
      )}
    </div>
  );
}
