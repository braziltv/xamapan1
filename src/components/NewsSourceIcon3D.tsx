import React from 'react';

interface NewsSourceIcon3DProps {
  source: string;
  className?: string;
}

export function NewsSourceIcon3D({ source, className = '' }: NewsSourceIcon3DProps) {
  const baseClasses = `inline-flex items-center justify-center shrink-0 ${className}`;
  const iconSize = 'w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7';

  // Globo / G1 - Red sphere with shine
  if (source === 'G1' || source === 'O Globo') {
    return (
      <div className={`${baseClasses} ${iconSize}`} style={{ perspective: '100px' }}>
        <div 
          className="w-full h-full rounded-full relative animate-spin-slow"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #ff6b6b 0%, #ee5a24 40%, #c0392b 70%, #922b21 100%)',
            boxShadow: '0 2px 8px rgba(238,90,36,0.6), inset 0 -2px 6px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.3)',
            transform: 'rotateX(15deg) rotateY(-15deg)',
          }}
        >
          {/* Shine effect */}
          <div 
            className="absolute top-[15%] left-[20%] w-[30%] h-[20%] rounded-full"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.8) 0%, transparent 70%)',
            }}
          />
          {/* G letter */}
          <span className="absolute inset-0 flex items-center justify-center text-white font-black text-[8px] sm:text-[10px] lg:text-xs drop-shadow-lg">
            G
          </span>
        </div>
      </div>
    );
  }

  // UOL - Orange cube
  if (source === 'UOL') {
    return (
      <div className={`${baseClasses} ${iconSize}`} style={{ perspective: '100px' }}>
        <div 
          className="w-full h-full relative"
          style={{
            transform: 'rotateX(-10deg) rotateY(20deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Front face */}
          <div 
            className="absolute inset-0 rounded-sm flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #ff9500 0%, #ff6b00 50%, #e55d00 100%)',
              boxShadow: '2px 2px 0 #cc5500, 4px 4px 8px rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <span className="text-white font-black text-[7px] sm:text-[9px] lg:text-[11px] tracking-tight drop-shadow-md">
              UOL
            </span>
          </div>
          {/* Right edge */}
          <div 
            className="absolute top-0 right-0 w-[4px] h-full rounded-r-sm"
            style={{
              background: 'linear-gradient(to bottom, #cc5500 0%, #994400 100%)',
              transform: 'translateX(100%) rotateY(90deg)',
              transformOrigin: 'left',
            }}
          />
        </div>
      </div>
    );
  }

  // Folha - Blue newspaper fold
  if (source === 'Folha') {
    return (
      <div className={`${baseClasses} ${iconSize}`} style={{ perspective: '120px' }}>
        <div 
          className="w-full h-full relative"
          style={{
            transform: 'rotateX(5deg) rotateY(-10deg)',
          }}
        >
          {/* Paper base */}
          <div 
            className="absolute inset-0 rounded-sm"
            style={{
              background: 'linear-gradient(145deg, #1e88e5 0%, #1565c0 50%, #0d47a1 100%)',
              boxShadow: '0 3px 6px rgba(21,101,192,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
          />
          {/* Fold corner */}
          <div 
            className="absolute top-0 right-0 w-[35%] h-[35%]"
            style={{
              background: 'linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%)',
              clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
              boxShadow: 'inset -1px 1px 2px rgba(0,0,0,0.2)',
            }}
          />
          {/* F letter */}
          <span className="absolute inset-0 flex items-center justify-center text-white font-black text-[9px] sm:text-[11px] lg:text-sm drop-shadow-md">
            F
          </span>
        </div>
      </div>
    );
  }

  // Estadão - Dark elegant prism
  if (source === 'Estadão') {
    return (
      <div className={`${baseClasses} ${iconSize}`} style={{ perspective: '100px' }}>
        <div 
          className="w-full h-full relative"
          style={{
            transform: 'rotateX(-5deg) rotateY(15deg)',
          }}
        >
          <div 
            className="absolute inset-0 rounded-sm"
            style={{
              background: 'linear-gradient(145deg, #455a64 0%, #37474f 40%, #263238 100%)',
              boxShadow: '3px 3px 0 #1c2529, 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            <span className="absolute inset-0 flex items-center justify-center text-slate-200 font-serif font-bold text-[8px] sm:text-[10px] lg:text-xs italic">
              E
            </span>
          </div>
        </div>
      </div>
    );
  }

  // CNN - Breaking news hexagon
  if (source === 'CNN') {
    return (
      <div className={`${baseClasses} ${iconSize} animate-pulse`} style={{ perspective: '100px' }}>
        <div 
          className="w-full h-full relative flex items-center justify-center"
          style={{
            transform: 'rotateX(10deg)',
          }}
        >
          <div 
            className="w-[90%] h-[90%] relative"
            style={{
              background: 'linear-gradient(180deg, #d32f2f 0%, #b71c1c 50%, #8b0000 100%)',
              clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
              boxShadow: '0 4px 8px rgba(183,28,28,0.5), inset 0 2px 4px rgba(255,255,255,0.2)',
            }}
          >
            <span className="absolute inset-0 flex items-center justify-center text-white font-black text-[6px] sm:text-[8px] lg:text-[10px] tracking-wide">
              CNN
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Band - Green diamond
  if (source === 'Band') {
    return (
      <div className={`${baseClasses} ${iconSize}`} style={{ perspective: '100px' }}>
        <div 
          className="w-full h-full relative flex items-center justify-center"
          style={{
            transform: 'rotateZ(45deg) rotateX(15deg)',
          }}
        >
          <div 
            className="w-[75%] h-[75%] rounded-sm"
            style={{
              background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 50%, #1b5e20 100%)',
              boxShadow: '2px 2px 0 #145214, 0 4px 8px rgba(46,125,50,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
          >
            <span 
              className="absolute inset-0 flex items-center justify-center text-white font-bold text-[7px] sm:text-[9px] lg:text-[11px]"
              style={{ transform: 'rotateZ(-45deg)' }}
            >
              B
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Terra - Earth sphere
  if (source === 'Terra') {
    return (
      <div className={`${baseClasses} ${iconSize}`} style={{ perspective: '100px' }}>
        <div 
          className="w-full h-full rounded-full relative animate-spin-slow"
          style={{
            background: 'radial-gradient(circle at 35% 35%, #26c6da 0%, #00acc1 30%, #00838f 60%, #006064 100%)',
            boxShadow: '0 2px 8px rgba(0,172,193,0.5), inset 0 -3px 6px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.4)',
            transform: 'rotateX(10deg) rotateY(-20deg)',
          }}
        >
          {/* Continents */}
          <div 
            className="absolute top-[25%] left-[20%] w-[35%] h-[30%] rounded-full"
            style={{
              background: 'rgba(76,175,80,0.7)',
              filter: 'blur(1px)',
            }}
          />
          <div 
            className="absolute top-[45%] left-[50%] w-[25%] h-[25%] rounded-full"
            style={{
              background: 'rgba(76,175,80,0.6)',
              filter: 'blur(1px)',
            }}
          />
          {/* Shine */}
          <div 
            className="absolute top-[12%] left-[18%] w-[25%] h-[15%] rounded-full"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.7) 0%, transparent 70%)',
            }}
          />
        </div>
      </div>
    );
  }

  // IG - Pink/Rose gradient gem
  if (source === 'IG') {
    return (
      <div className={`${baseClasses} ${iconSize}`} style={{ perspective: '100px' }}>
        <div 
          className="w-full h-full relative"
          style={{
            transform: 'rotateX(-10deg) rotateY(10deg)',
          }}
        >
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #ec407a 0%, #e91e63 40%, #c2185b 70%, #880e4f 100%)',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
              boxShadow: '0 3px 8px rgba(233,30,99,0.5), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            <span className="absolute inset-0 flex items-center justify-center text-white font-black text-[8px] sm:text-[10px] lg:text-xs">
              IG
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Itatiaia - Gold radio wave
  if (source === 'Itatiaia') {
    return (
      <div className={`${baseClasses} ${iconSize}`} style={{ perspective: '100px' }}>
        <div 
          className="w-full h-full relative flex items-center justify-center"
          style={{
            transform: 'rotateX(5deg)',
          }}
        >
          {/* Radio waves */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="w-[120%] h-[120%] rounded-full border-2 border-amber-400/30 animate-ping"
              style={{ animationDuration: '2s' }}
            />
          </div>
          {/* Main circle */}
          <div 
            className="w-[80%] h-[80%] rounded-full relative"
            style={{
              background: 'radial-gradient(circle at 30% 30%, #ffd54f 0%, #ffb300 40%, #ff8f00 70%, #e65100 100%)',
              boxShadow: '0 2px 8px rgba(255,179,0,0.6), inset 0 -2px 4px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.5)',
            }}
          >
            <span className="absolute inset-0 flex items-center justify-center text-amber-900 font-black text-[6px] sm:text-[8px] lg:text-[9px]">
              📻
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Correio - Sky blue envelope
  if (source === 'Correio') {
    return (
      <div className={`${baseClasses} ${iconSize}`} style={{ perspective: '100px' }}>
        <div 
          className="w-full h-[75%] relative"
          style={{
            transform: 'rotateX(-15deg) rotateY(5deg)',
          }}
        >
          {/* Envelope body */}
          <div 
            className="absolute inset-0 rounded-sm"
            style={{
              background: 'linear-gradient(180deg, #4fc3f7 0%, #29b6f6 50%, #03a9f4 100%)',
              boxShadow: '0 3px 6px rgba(3,169,244,0.4), inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          />
          {/* Envelope flap */}
          <div 
            className="absolute top-0 left-0 right-0 h-[50%]"
            style={{
              background: 'linear-gradient(180deg, #81d4fa 0%, #4fc3f7 100%)',
              clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
              boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.1)',
            }}
          />
          {/* C letter */}
          <span className="absolute inset-0 flex items-center justify-center pt-1 text-white font-bold text-[8px] sm:text-[10px] lg:text-xs drop-shadow-md">
            C
          </span>
        </div>
      </div>
    );
  }

  // Metrópoles - Purple modern tower
  if (source === 'Metrópoles') {
    return (
      <div className={`${baseClasses} ${iconSize}`} style={{ perspective: '120px' }}>
        <div 
          className="w-full h-full relative flex items-end justify-center"
          style={{
            transform: 'rotateX(-5deg) rotateY(15deg)',
          }}
        >
          {/* Building */}
          <div 
            className="w-[60%] h-[90%] relative"
            style={{
              background: 'linear-gradient(180deg, #9c27b0 0%, #7b1fa2 40%, #6a1b9a 70%, #4a148c 100%)',
              clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
              boxShadow: '3px 0 0 #38006b, 0 4px 8px rgba(106,27,154,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            {/* Windows */}
            <div className="absolute top-[15%] left-[30%] w-[15%] h-[8%] bg-yellow-300/80 rounded-sm" />
            <div className="absolute top-[15%] right-[30%] w-[15%] h-[8%] bg-yellow-300/60 rounded-sm" />
            <div className="absolute top-[30%] left-[30%] w-[15%] h-[8%] bg-yellow-300/70 rounded-sm" />
            <div className="absolute top-[30%] right-[30%] w-[15%] h-[8%] bg-yellow-300/50 rounded-sm" />
          </div>
        </div>
      </div>
    );
  }

  // Google News - Multi-color G
  if (source === 'Google' || source === 'Google News') {
    return (
      <div className={`${baseClasses} ${iconSize}`} style={{ perspective: '100px' }}>
        <div 
          className="w-full h-full rounded-full relative"
          style={{
            transform: 'rotateX(10deg) rotateY(-10deg)',
            background: 'conic-gradient(from 0deg, #4285f4 0deg 90deg, #ea4335 90deg 180deg, #fbbc04 180deg 270deg, #34a853 270deg 360deg)',
            boxShadow: '0 3px 8px rgba(66,133,244,0.4), inset 0 -2px 4px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.3)',
          }}
        >
          {/* Inner white circle */}
          <div 
            className="absolute top-[25%] left-[25%] w-[50%] h-[50%] rounded-full bg-white"
            style={{
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
            }}
          />
          {/* G cutout effect */}
          <div 
            className="absolute top-[25%] right-[15%] w-[35%] h-[25%] bg-white"
          />
          <div 
            className="absolute top-[40%] right-[15%] w-[35%] h-[10%]"
            style={{
              background: '#4285f4',
            }}
          />
        </div>
      </div>
    );
  }

  // Informativo - Megaphone 3D
  if (source === '📢 Informativo') {
    return (
      <div className={`${baseClasses} ${iconSize} animate-bounce`} style={{ perspective: '100px' }}>
        <div 
          className="w-full h-full relative flex items-center justify-center"
          style={{
            transform: 'rotateY(-15deg) rotateX(5deg)',
          }}
        >
          {/* Megaphone body */}
          <div 
            className="w-[90%] h-[60%] relative"
            style={{
              background: 'linear-gradient(90deg, #ef5350 0%, #e53935 50%, #c62828 100%)',
              clipPath: 'polygon(0% 30%, 60% 0%, 100% 0%, 100% 100%, 60% 100%, 0% 70%)',
              boxShadow: '0 3px 6px rgba(229,57,53,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
          />
          {/* Sound waves */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex gap-[2px]">
            <div className="w-[2px] h-2 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-[2px] h-3 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-[2px] h-2 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // Créditos - Star 3D
  if (source === 'Créditos') {
    return (
      <div className={`${baseClasses} ${iconSize}`} style={{ perspective: '100px' }}>
        <div 
          className="w-full h-full relative flex items-center justify-center animate-spin-slow"
          style={{
            transform: 'rotateX(15deg)',
          }}
        >
          <div 
            className="w-[85%] h-[85%]"
            style={{
              background: 'linear-gradient(135deg, #ffd700 0%, #ffb300 40%, #ff8f00 70%, #e65100 100%)',
              clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
              boxShadow: '0 3px 8px rgba(255,179,0,0.6), inset 0 1px 0 rgba(255,255,255,0.5)',
            }}
          />
        </div>
      </div>
    );
  }

  // Default - Generic news icon
  return (
    <div className={`${baseClasses} ${iconSize}`} style={{ perspective: '100px' }}>
      <div 
        className="w-full h-full rounded-sm relative"
        style={{
          background: 'linear-gradient(145deg, #78909c 0%, #607d8b 50%, #455a64 100%)',
          boxShadow: '2px 2px 0 #37474f, 0 3px 6px rgba(96,125,139,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
          transform: 'rotateX(-5deg) rotateY(10deg)',
        }}
      >
        <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-[7px] sm:text-[9px] lg:text-[11px]">
          📰
        </span>
      </div>
    </div>
  );
}
