// /home/heagueron/projects/dominando/src/utils/turnosUtils.ts
import { FichaDomino, ManoDeJugador } from './dominoUtils';

/**
 * Calcula la suma de los puntos de una ficha.
 * @param ficha La ficha de dominó.
 * @returns La suma de los puntos de la ficha.
 */
const calcularPuntosFicha = (ficha: FichaDomino): number => {
  return ficha.valorSuperior + ficha.valorInferior;
};

/**
 * Determina el ID del jugador que debe iniciar la partida.
 * Criterio: El jugador que tenga la ficha con la mayor suma de puntos.
 * En caso de empate en la suma de puntos, se podría añadir un criterio de desempate (ej. ficha doble más alta),
 * pero por ahora, se tomará el primer jugador encontrado con la ficha de mayor puntuación.
 * @param manosJugadores Un arreglo con las manos de todos los jugadores.
 * @returns El ID del jugador que tiene el primer turno.
 */
export const determinarPrimerJugador = (manosJugadores: ManoDeJugador[]): string | null => {
  if (!manosJugadores || manosJugadores.length === 0) return null;

  let idJugadorPrimerTurno: string | null = null;
  let maxPuntosFicha = -1;

  manosJugadores.forEach(mano => {
    mano.fichas.forEach(ficha => {
      const puntos = calcularPuntosFicha(ficha);
      if (puntos > maxPuntosFicha) {
        maxPuntosFicha = puntos;
        idJugadorPrimerTurno = mano.idJugador;
      }
    });
  });

  return idJugadorPrimerTurno;
};