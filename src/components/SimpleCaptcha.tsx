import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimpleCaptchaProps {
  onValidChange: (isValid: boolean) => void;
}

export function SimpleCaptcha({ onValidChange }: SimpleCaptchaProps) {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [operator, setOperator] = useState<'+' | '-'>('+');
  const [answer, setAnswer] = useState('');
  const [isValid, setIsValid] = useState(false);

  const generateCaptcha = useCallback(() => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    const op = Math.random() > 0.5 ? '+' : '-';
    
    // Ensure subtraction doesn't result in negative
    if (op === '-' && n2 > n1) {
      setNum1(n2);
      setNum2(n1);
    } else {
      setNum1(n1);
      setNum2(n2);
    }
    setOperator(op);
    setAnswer('');
    setIsValid(false);
    onValidChange(false);
  }, [onValidChange]);

  useEffect(() => {
    generateCaptcha();
  }, []);

  const correctAnswer = operator === '+' ? num1 + num2 : num1 - num2;

  const handleAnswerChange = (value: string) => {
    setAnswer(value);
    const userAnswer = parseInt(value, 10);
    const valid = !isNaN(userAnswer) && userAnswer === correctAnswer;
    setIsValid(valid);
    onValidChange(valid);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground flex items-center gap-1">
        🔒 Verificação de Segurança
      </Label>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border border-border">
          <span className="text-lg font-mono font-bold text-primary">
            {num1} {operator} {num2} = ?
          </span>
        </div>
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={answer}
          onChange={(e) => {
            const value = e.target.value.replace(/[^0-9-]/g, '');
            handleAnswerChange(value);
          }}
          placeholder="?"
          className={`w-20 text-center font-mono text-lg ${
            answer && (isValid ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20')
          }`}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={generateCaptcha}
          className="h-10 w-10 text-muted-foreground hover:text-foreground"
          title="Gerar novo cálculo"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {answer && !isValid && (
        <p className="text-xs text-red-500">Resposta incorreta. Tente novamente.</p>
      )}
      {isValid && (
        <p className="text-xs text-green-600 dark:text-green-400">✓ Verificação concluída!</p>
      )}
    </div>
  );
}
