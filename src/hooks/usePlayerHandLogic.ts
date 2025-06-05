// /home/heagueron/jmu/dominando/src/hooks/usePlayerHandLogic.ts
import { useState, useCallback, useEffect } from 'react';

/**
 * Información sobre la ficha seleccionada por el jugador.
 */
export interface FichaSeleccionadaInfo {
  idFicha: string;
  idJugadorMano: string;
}

export interface UsePlayerHandLogicProps {
  /** ID del jugador cuya mano está siendo gestionada (normalmente el jugador local). */
  idJugadorMano: string | null;
  /** Indica si es el turno del jugador actual. */
  isMyTurn: boolean;
  /** Indica si la ronda está activa y se pueden realizar acciones. */
  isRoundActive: boolean;
  /** Indica si el temporizador del turno del jugador acaba de expirar. */
  isMyTurnTimerJustExpired: boolean;
  /** Indica si el jugador está en un estado de auto-pase. */
  isAutoPasoForMe: boolean;
  /** Array de IDs de las fichas que el jugador puede jugar actualmente. */
  currentPlayableFichaIds: string[];
}

export interface UsePlayerHandLogicReturn {
  /** Información de la ficha actualmente seleccionada, o undefined si no hay ninguna. */
  selectedFichaInfo: FichaSeleccionadaInfo | undefined;
  /** Función para intentar seleccionar una ficha. */
  selectFicha: (fichaId: string) => void;
  /** Función para deseleccionar cualquier ficha. */
  clearSelection: () => void;
}

export const usePlayerHandLogic = ({
  idJugadorMano,
  isMyTurn,
  isRoundActive,
  isMyTurnTimerJustExpired,
  isAutoPasoForMe,
  currentPlayableFichaIds,
}: UsePlayerHandLogicProps): UsePlayerHandLogicReturn => {
  const [selectedFichaInfo, setSelectedFichaInfo] = useState<FichaSeleccionadaInfo | undefined>();

  const selectFicha = useCallback((fichaId: string) => {
    if (!isRoundActive || !idJugadorMano || !isMyTurn || isAutoPasoForMe || isMyTurnTimerJustExpired || !currentPlayableFichaIds.includes(fichaId)) {
      // Si alguna condición no se cumple, no se puede seleccionar o se deselecciona si ya estaba seleccionada con otra lógica (no aplica aquí directamente).
      // Opcionalmente, podrías deseleccionar si se intenta seleccionar una no jugable:
      // if (!currentPlayableFichaIds.includes(fichaId)) setSelectedFichaInfo(undefined);
      return;
    }

    setSelectedFichaInfo(prev =>
      (prev && prev.idFicha === fichaId && prev.idJugadorMano === idJugadorMano)
        ? undefined // Si se hace clic en la misma ficha seleccionada, se deselecciona
        : { idFicha: fichaId, idJugadorMano } // Selecciona la nueva ficha
    );
  }, [
    isRoundActive, idJugadorMano, isMyTurn, isAutoPasoForMe,
    isMyTurnTimerJustExpired, currentPlayableFichaIds,
  ]);

  const clearSelection = useCallback(() => {
    setSelectedFichaInfo(undefined);
  }, []);

  return { selectedFichaInfo, selectFicha, clearSelection };
};