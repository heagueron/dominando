import React from 'react';

export type BubbleDirection = 'top' | 'bottom' | 'left' | 'right';

interface SpeechBubbleProps {
  text: string;
  direction: BubbleDirection; // Indicates where the pointer/tail of the bubble points
  className?: string;
}

const SpeechBubble: React.FC<SpeechBubbleProps> = ({ text, direction, className = '' }) => {
  // Aumentamos el padding, el tamaño del texto y la sombra para un globo un poco más grande y notable.
  const baseBubbleStyle = "bg-white text-gray-700 px-4 py-2 rounded-lg shadow-xl relative text-base font-bold";
  let pointerClasses = "";

  // Ya no usamos pointerSizeValue directamente en la clase para el ancho.
  // Intentaremos usar utilidades de Tailwind directas como 'after:border-t-8',
  // que por defecto en Tailwind debería corresponder a border-top-width: 8px;

  switch (direction) {
    case 'top': // Pointer points upwards, bubble is typically below the target
      pointerClasses = `after:content-[''] after:absolute after:left-1/2 after:bottom-full after:-translate-x-1/2 
                       after:w-0 after:h-0 
                       after:border-l-8 after:border-l-transparent 
                       after:border-r-8 after:border-r-transparent 
                       after:border-b-8 after:border-b-white`; 
      break;
    case 'bottom': // Pointer points downwards, bubble is typically above the target
      pointerClasses = `after:content-[''] after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 
                       after:w-0 after:h-0 
                       after:border-l-8 after:border-l-transparent 
                       after:border-r-8 after:border-r-transparent 
                       after:border-t-8 after:border-t-white`; 
      break;
    case 'left': // Pointer points leftwards, bubble is typically to the right of the target
      pointerClasses = `after:content-[''] after:absolute after:top-1/2 after:right-full after:-translate-y-1/2 
                       after:w-0 after:h-0 
                       after:border-t-8 after:border-t-transparent 
                       after:border-b-8 after:border-b-transparent 
                       after:border-r-8 after:border-r-white`; 
      break;
    case 'right': // Pointer points rightwards, bubble is typically to the left of the target
      pointerClasses = `after:content-[''] after:absolute after:top-1/2 after:left-full after:-translate-y-1/2 
                       after:w-0 after:h-0 
                       after:border-t-8 after:border-t-transparent 
                       after:border-b-8 after:border-b-transparent 
                       after:border-l-8 after:border-l-white`; 
      break;
  }

  return (
    <div 
      className={`${baseBubbleStyle} ${pointerClasses} ${className}`}
      // Ya no es necesario definir la variable CSS --pointer-size aquí
      // style={{ '--pointer-size': `${pointerSizeValue}px` } as React.CSSProperties}
    >
      {text}
    </div>
  );
};

export default SpeechBubble;