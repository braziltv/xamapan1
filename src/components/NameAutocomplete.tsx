import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { searchNames, searchSurnames } from '@/data/brazilianNames';
import { cn } from '@/lib/utils';

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

  // Atualiza sugestões baseado no texto atual
  const updateSuggestions = useCallback(() => {
    const { word, isFirstWord } = getCurrentWord();
    
    if (word.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

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
    setShowSuggestions(results.length > 0);
    setSelectedIndex(-1);
  }, [getCurrentWord]);

  // Seleciona uma sugestão
  const selectSuggestion = useCallback((suggestion: string) => {
    const words = value.split(' ');
    const { index } = getCurrentWord();
    
    words[index] = suggestion;
    
    const newValue = words.join(' ');
    onChange(newValue + ' ');
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Foca no input após seleção
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  }, [value, getCurrentWord, onChange]);

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
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => value.length > 0 && updateSuggestions()}
        placeholder={placeholder}
        className={cn("uppercase", className)}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
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
                {suggestion.normalize("NFD").includes('\u0301') || 
                 suggestion.normalize("NFD").includes('\u0300') ||
                 suggestion.normalize("NFD").includes('\u0303') ||
                 suggestion.normalize("NFD").includes('\u0302') ? (
                  <span className="ml-2 text-xs text-muted-foreground">(acentuado)</span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground bg-muted/50">
            ↑↓ navegar • Enter/Tab selecionar • Esc fechar
          </div>
        </div>
      )}
    </div>
  );
}
