/**
 * Interfaz que representa una ficha de dominó.
 */
export interface FichaDomino {
  id: string;        // Identificador único, ej: "00", "12", "56"
  valorSuperior: number; // Valor en la parte superior de la ficha
  valorInferior: number; // Valor en la parte inferior de la ficha
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