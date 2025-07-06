import React from 'react';

interface ProgressTimerBarProps {
  tiempoRestante: number;
  duracionTotal: number;
}

const ProgressTimerBar: React.FC<ProgressTimerBarProps> = ({
  tiempoRestante,
  duracionTotal,
}) => {
  if (duracionTotal <= 0) return null;
  const porcentaje = Math.max(0, Math.min(100, (tiempoRestante / duracionTotal) * 100));

  return (
    <div className="w-full bg-gray-600 rounded-full h-2.5 md:h-3 my-1 md:my-0">
      <div
        className="bg-yellow-400 h-2.5 md:h-3 rounded-full transition-width duration-1000 ease-linear"
        style={{ width: `${porcentaje}%` }}
      ></div>
    </div>
  );
};

export default ProgressTimerBar;
