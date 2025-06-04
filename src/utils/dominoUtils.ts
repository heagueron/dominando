/**
 * Interfaz que representa una ficha de dominó.
 */
export interface FichaDomino {
  id: string;        // Identificador único, ej: "00", "12", "56"
  valorSuperior: number; // Valor en la parte superior de la ficha
  valorInferior: number; // Valor en la parte inferior de la ficha
}

export interface FichaEnMesaParaLogica extends FichaDomino {
  posicionCuadricula: { fila: number; columna: number };
  rotacion: number;
}

/**
 * Interfaz que representa la mano de un jugador.
 */
export interface ManoDeJugador {
  idJugador: string; // Identificador del jugador, ej: "jugador1"
  fichas: FichaDomino[]; // Arreglo de fichas que tiene el jugador
}

/**
 * Interfaz que representa una ficha de dominó colocada en la mesa.
 * Extiende FichaDomino y añade propiedades de posición y rotación.
 */
export interface FichaDominoEnMesa extends FichaDomino {
  posicionCuadricula: { fila: number; columna: number };
  rotacion: number; // 0 para vertical, 90 para horizontal
}

/**
 * Genera el conjunto completo de 28 fichas de dominó.
 * Las fichas dobles (ej. [6,6]) y las combinaciones (ej. [2,4]) son incluidas.
 * El id se forma concatenando el valor menor seguido del valor mayor.
 * @returns Un arreglo de objetos FichaDomino.
 */
export function generarFichasCompletas(): FichaDomino[] {
  const fichasCompletas: FichaDomino[] = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      fichasCompletas.push({
        id: `${i}${j}`, // ej: 00, 01, 11, 24
        valorSuperior: i,
        valorInferior: j,
      });
    }
  }
  return fichasCompletas;
}

/**
 * Baraja un arreglo de elementos de forma aleatoria (algoritmo Fisher-Yates).
 * @param array El arreglo a barajar.
 * @returns Un nuevo arreglo con los elementos barajados.
 */
function barajarArray<T>(array: T[]): T[] {
  const newArray = [...array]; // Copiar el arreglo para no mutar el original
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]]; // Intercambiar elementos
  }
  return newArray;
}

/**
 * Genera el conjunto completo de fichas de dominó, las baraja y las reparte
 * entre un número específico de jugadores.
 * Por defecto, reparte 7 fichas a 4 jugadores.
 * @param numeroDeJugadores El número de jugadores para repartir las fichas.
 * @param fichasPorJugador El número de fichas a repartir a cada jugador.
 * @returns Un arreglo de objetos ManoDeJugador, donde cada objeto contiene el id del jugador y sus fichas.
 *          También puede devolver las fichas sobrantes si las hay.
 */
export function generarYRepartirFichas(
  numeroDeJugadores: number = 4,
  fichasPorJugador: number = 7
): { manos: ManoDeJugador[]; sobrantes: FichaDomino[] } {
  const todasLasFichas = generarFichasCompletas();

  if (numeroDeJugadores * fichasPorJugador > todasLasFichas.length) {
    throw new Error(
      "No hay suficientes fichas para repartir la cantidad especificada a cada jugador."
    );
  }

  const fichasBarajadas = barajarArray(todasLasFichas);
  const manos: ManoDeJugador[] = [];
  let indiceFichaActual = 0;

  for (let i = 0; i < numeroDeJugadores; i++) {
    const fichasDelJugador = fichasBarajadas.slice(indiceFichaActual, indiceFichaActual + fichasPorJugador);
    manos.push({ idJugador: `jugador${i + 1}`, fichas: fichasDelJugador });
    indiceFichaActual += fichasPorJugador;
  }
  const sobrantes = fichasBarajadas.slice(indiceFichaActual);
  return { manos, sobrantes };
}

/**
 * Calcula la suma de los puntos de las fichas en una mano.
 * @param fichas Array de fichas en la mano.
 * @returns La suma total de los puntos.
 */
export const calcularPuntosMano = (fichas: FichaDomino[]): number => {
  return fichas.reduce((sum, ficha) => sum + ficha.valorSuperior + ficha.valorInferior, 0);
};

/**
 * Determina el ganador en un juego trancado basado en el menor puntaje.
 * @param manos Array de las manos de todos los jugadores.
 * @returns Objeto con el id del ganador y su puntaje, o null si no se puede determinar.
 */
export const determinarGanadorJuegoTrancado = (
  manos: ManoDeJugador[]
): { ganadorId: string; puntajeMinimo: number } | null => {
  if (manos.length === 0) return null;

  return manos.reduce((mejorResultado, manoActual) => {
    const puntosManoActual = calcularPuntosMano(manoActual.fichas);
    if (puntosManoActual < mejorResultado.puntajeMinimo) {
      return { ganadorId: manoActual.idJugador, puntajeMinimo: puntosManoActual };
    }
    return mejorResultado;
  }, { ganadorId: manos[0]?.idJugador || '', puntajeMinimo: calcularPuntosMano(manos[0]?.fichas || []) });
};

/**
 * Determina si una ficha puede jugarse en un extremo dado y devuelve información de conexión.
 * @param ficha La ficha que se intenta jugar.
 * @param valorExtremo El valor numérico del extremo de la mesa donde se intenta jugar.
 * @returns Un objeto indicando si se puede jugar, el valor de conexión y el nuevo valor del extremo.
 */
export const determinarJugadaCliente = (ficha: FichaDomino, valorExtremo: number): { puedeJugar: boolean; valorConexion?: number; valorNuevoExtremo?: number } => {
  if (ficha.valorSuperior === valorExtremo) return { puedeJugar: true, valorConexion: ficha.valorSuperior, valorNuevoExtremo: ficha.valorInferior };
  if (ficha.valorInferior === valorExtremo) return { puedeJugar: true, valorConexion: ficha.valorInferior, valorNuevoExtremo: ficha.valorSuperior };
  return { puedeJugar: false };
};