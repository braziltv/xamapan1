import { useState, useEffect, useCallback, useRef, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, Clock, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SimpleCaptchaProps {
  onValidChange: (isValid: boolean) => void;
}

const CAPTCHA_TIMEOUT_SECONDS = 60;

export const SimpleCaptcha = forwardRef<HTMLDivElement, SimpleCaptchaProps>(
  ({ onValidChange }, ref) => {
    const [num1, setNum1] = useState(0);
    const [num2, setNum2] = useState(0);
    const [operator, setOperator] = useState<'+' | '-'>('+');
    const [answer, setAnswer] = useState('');
    const [isValid, setIsValid] = useState(false);
    const [timeLeft, setTimeLeft] = useState(CAPTCHA_TIMEOUT_SECONDS);
    const [animationState, setAnimationState] = useState<'idle' | 'correct' | 'incorrect'>('idle');
    const timerRef = useRef<NodeJS.Timeout | null>(null);

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
      setAnimationState('idle');
      setTimeLeft(CAPTCHA_TIMEOUT_SECONDS);
      onValidChange(false);
    }, [onValidChange]);

    // Initialize captcha on mount
    useEffect(() => {
      generateCaptcha();
    }, []);

    // Timer countdown
    useEffect(() => {
      if (isValid) {
        // Stop timer when solved
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return;
      }

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time expired, generate new captcha
            generateCaptcha();
            return CAPTCHA_TIMEOUT_SECONDS;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }, [isValid, generateCaptcha]);

    const correctAnswer = operator === '+' ? num1 + num2 : num1 - num2;

    const handleAnswerChange = (value: string) => {
      setAnswer(value);
      const userAnswer = parseInt(value, 10);
      const valid = !isNaN(userAnswer) && userAnswer === correctAnswer;
      
      if (value && !isNaN(userAnswer)) {
        if (valid) {
          setAnimationState('correct');
        } else {
          setAnimationState('incorrect');
          // Reset animation after shake
          setTimeout(() => {
            if (!valid) setAnimationState('idle');
          }, 600);
        }
      } else {
        setAnimationState('idle');
      }
      
      setIsValid(valid);
      onValidChange(valid);
    };

    const isLowTime = timeLeft <= 10;

    return (
      <div ref={ref} className="space-y-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-2">
          🔒 Verificação de Segurança
          {!isValid && (
            <span className={`flex items-center gap-1 ${isLowTime ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`}>
              <Clock className="h-3 w-3" />
              {timeLeft}s
            </span>
          )}
        </Label>
        <div className="flex items-center gap-2">
          <div 
            className={`flex-1 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border transition-all duration-300 ${
              animationState === 'correct' 
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 scale-105' 
                : animationState === 'incorrect'
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20 animate-[shake_0.5s_ease-in-out]'
                : 'border-border'
            }`}
          >
            <span className={`text-lg font-mono font-bold transition-colors duration-300 ${
              animationState === 'correct' ? 'text-green-600 dark:text-green-400' : 'text-primary'
            }`}>
              {num1} {operator} {num2} = ?
            </span>
          </div>
          <div className="relative">
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
              className={`w-20 text-center font-mono text-lg transition-all duration-300 ${
                animationState === 'correct' 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 ring-2 ring-green-500/30' 
                  : animationState === 'incorrect'
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20 ring-2 ring-red-500/30'
                  : ''
              }`}
            />
            {/* Animation icons */}
            {animationState === 'correct' && (
              <div className="absolute -right-2 -top-2 bg-green-500 rounded-full p-1 animate-[bounce_0.5s_ease-in-out]">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
            {animationState === 'incorrect' && (
              <div className="absolute -right-2 -top-2 bg-red-500 rounded-full p-1 animate-[shake_0.5s_ease-in-out]">
                <X className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={generateCaptcha}
            className={`h-10 w-10 text-muted-foreground hover:text-foreground transition-transform ${
              animationState === 'incorrect' ? 'animate-spin' : ''
            }`}
            title="Gerar novo cálculo"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {answer && animationState === 'incorrect' && (
          <p className="text-xs text-red-500 animate-fade-in flex items-center gap-1">
            <X className="h-3 w-3" /> Resposta incorreta. Tente novamente.
          </p>
        )}
        {isValid && (
          <p className="text-xs text-green-600 dark:text-green-400 animate-fade-in flex items-center gap-1">
            <Check className="h-3 w-3" /> Verificação concluída!
          </p>
        )}
        {!isValid && isLowTime && (
          <p className="text-xs text-amber-500 animate-pulse">⏰ Tempo acabando! O cálculo será renovado.</p>
        )}
      </div>
    );
  }
);

SimpleCaptcha.displayName = 'SimpleCaptcha';
