// /home/heagueron/projects/dominando/src/utils/posicionamientoUtils.ts
import { FichaDomino } from './dominoUtils';

// Constantes de posicionamiento
export const FILA_ANCLA_INICIAL = 5;
export const COLUMNA_BORDE_IZQUIERDO = 1;

// --- Función Auxiliar para Calcular Rotación de Fichas Horizontales No Dobles ---
export const calcularRotacionHorizontalNoDoble = (
  ficha: FichaDomino,
  extremoElegido: 'izquierda' | 'derecha',
  valorConexionEnFicha: number // El valor en `ficha` que hace match con el extremo
): number => {
  // Si jugamos en el extremo DERECHO de la cadena, el lado IZQUIERDO de la nueva ficha debe conectar.
  // Visualmente: [LadoConecta][OtroLado]
  if (extremoElegido === 'derecha') {
    if (valorConexionEnFicha === ficha.valorSuperior) {
      // Queremos que S (valorSuperior) quede a la IZQUIERDA. Rotación: -90 ([S][I])
      return -90;
    } else { // valorConexionEnFicha === ficha.valorInferior
      // Queremos que I (valorInferior) quede a la IZQUIERDA. Rotación: 90 ([I][S])
      return 90;
    }
  }
  // Si jugamos en el extremo IZQUIERDO de la cadena, el lado DERECHO de la nueva ficha debe conectar.
  // Visualmente: [OtroLado][LadoConecta]
  else { // extremoElegido === 'izquierda'
    if (valorConexionEnFicha === ficha.valorSuperior) {
      // Queremos que S (valorSuperior) quede a la DERECHA. Rotación: 90 ([I][S])
      return 90;
    } else { // valorConexionEnFicha === ficha.valorInferior
      // Queremos que I (valorInferior) quede a la DERECHA. Rotación: -90 ([S][I])
      return -90;
    }
  }
};
// --- Fin Función Auxiliar ---

export const calcularPosicionRotacionSiguienteFicha = (
    fichaParaJugar: FichaDomino,
    posicionFichaConexion: { fila: number; columna: number },
    rotacionFichaConexion: number,
    extremoElegido: 'izquierda' | 'derecha',
    esDobleNuevaFicha: boolean,
    valorConexionDeNuevaFicha: number
  ): { nuevaPosicion: { fila: number; columna: number }; rotacionCalculada: number } => {
    let rotacionCalculada: number = 0;
    let nuevaPosicion: { fila: number; columna: number } = { fila: -1, columna: -1 };
    
    // Usamos alias para claridad, correspondiendo a las variables originales en page.tsx
    const uPos = posicionFichaConexion;
    const uRot = rotacionFichaConexion;
    const esDoble = esDobleNuevaFicha; // esDoble se refiere a la fichaParaJugar
  
    console.log(`[POS_UTIL] Conectando a: uPos=(${uPos.fila},${uPos.columna}), uRot=${uRot}. Ficha nueva ${esDoble ? 'DOBLE' : 'NO DOBLE'}`);
  
    let haSidoProcesadoPorLogicaDeGiroEspecial = false;
  
    // --- LÓGICA DE GIROS ESPECIALES ---
    const condFila6 = uPos.fila === 6;
    const condCol11_giroFila7 = uPos.columna === 11;
    const condExtremoDer = extremoElegido === 'derecha';
    const condRotVertical = (uRot === 0 || uRot === 180);
    
    const combinedCondInicioFila7 = condFila6 && condCol11_giroFila7 && condExtremoDer && condRotVertical;
  
    if (combinedCondInicioFila7) {
      console.log(`[POS_UTIL] DETECTADO: Inicio fila 7 desde (6,11). uRot=${uRot}, fichaParaJugar=${fichaParaJugar.valorSuperior}/${fichaParaJugar.valorInferior}, esDoble=${esDoble}`);
      nuevaPosicion = { fila: uPos.fila + 1, columna: uPos.columna }; // Celda (7,11)
      if (esDoble) {
        rotacionCalculada = 90;
      } else {
        rotacionCalculada = (valorConexionDeNuevaFicha === fichaParaJugar.valorSuperior) ? 90 : -90;
      }
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (extremoElegido === 'derecha' && uPos.fila === 7 && uPos.columna > 1) {
      nuevaPosicion = { fila: 7, columna: uPos.columna - 1 };
      if (esDoble) {
        rotacionCalculada = 0;
      } else {
        rotacionCalculada = (valorConexionDeNuevaFicha === fichaParaJugar.valorSuperior) ? 90 : -90;
      }
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (extremoElegido === 'derecha' && uPos.fila === 7 && uPos.columna === 1) {
      nuevaPosicion = { fila: 8, columna: 1 };
      if (esDoble) {
        rotacionCalculada = 0;
      } else {
        rotacionCalculada = (valorConexionDeNuevaFicha === fichaParaJugar.valorSuperior) ? 0 : 180;
      }
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (extremoElegido === 'derecha' && uPos.fila === 8 && uPos.columna === 1) {
      nuevaPosicion = { fila: 9, columna: 1 };
      if (esDoble) {
        rotacionCalculada = 90;
      } else {
        rotacionCalculada = (valorConexionDeNuevaFicha === fichaParaJugar.valorSuperior) ? -90 : 90;
      }
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (extremoElegido === 'derecha' && uPos.fila === 9 && uPos.columna < 11) {
      nuevaPosicion = { fila: 9, columna: uPos.columna + 1 };
      if (esDoble) {
        rotacionCalculada = 0;
      } else {
        rotacionCalculada = calcularRotacionHorizontalNoDoble(fichaParaJugar, 'derecha', valorConexionDeNuevaFicha);
      }
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (uPos.fila === FILA_ANCLA_INICIAL && uPos.columna === 11 && extremoElegido === 'derecha') {
      nuevaPosicion = { fila: uPos.fila + 1, columna: uPos.columna };
      rotacionCalculada = (valorConexionDeNuevaFicha === fichaParaJugar.valorSuperior) ? 0 : 180;
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (extremoElegido === 'izquierda' && uPos.fila === FILA_ANCLA_INICIAL && uPos.columna > COLUMNA_BORDE_IZQUIERDO) {
      nuevaPosicion = { fila: FILA_ANCLA_INICIAL, columna: uPos.columna - 1 };
      if (esDoble) {
        rotacionCalculada = 0;
      } else {
        rotacionCalculada = calcularRotacionHorizontalNoDoble(fichaParaJugar, 'izquierda', valorConexionDeNuevaFicha);
      }
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (extremoElegido === 'izquierda' && uPos.fila === 4 && uPos.columna === 1) {
      nuevaPosicion = { fila: 3, columna: 1 };
      if (esDoble) {
        rotacionCalculada = 90;
      } else {
        rotacionCalculada = (valorConexionDeNuevaFicha === fichaParaJugar.valorSuperior) ? -90 : 90;
      }
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (extremoElegido === 'izquierda' && uPos.fila === 3 && uPos.columna < 11) {
      nuevaPosicion = { fila: 3, columna: uPos.columna + 1 };
      if (esDoble) {
        rotacionCalculada = 0;
      } else {
        rotacionCalculada = (valorConexionDeNuevaFicha === fichaParaJugar.valorSuperior) ? -90 : 90;
      }
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (extremoElegido === 'izquierda' && uPos.fila === 3 && uPos.columna === 11) {
      nuevaPosicion = { fila: 2, columna: 11 };
      if (esDoble) {
        rotacionCalculada = 0;
      } else {
        rotacionCalculada = (valorConexionDeNuevaFicha === fichaParaJugar.valorSuperior) ? 180 : 0;
      }
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (extremoElegido === 'izquierda' && uPos.fila === 2 && uPos.columna === 11) {
      nuevaPosicion = { fila: 1, columna: 11 };
      if (esDoble) {
        rotacionCalculada = 90;
      } else {
        rotacionCalculada = (valorConexionDeNuevaFicha === fichaParaJugar.valorSuperior) ? 90 : -90;
      }
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
    else if (uPos.fila === FILA_ANCLA_INICIAL && extremoElegido === 'izquierda' && uPos.columna === 1) {
      nuevaPosicion = { fila: uPos.fila - 1, columna: uPos.columna };
      rotacionCalculada = (valorConexionDeNuevaFicha === fichaParaJugar.valorInferior) ? 0 : 180;
      haSidoProcesadoPorLogicaDeGiroEspecial = true;
    }
  
    // LÓGICA DE CAMINO Y ROTACIÓN GENERAL (si no hubo giro especial)
    if (!haSidoProcesadoPorLogicaDeGiroEspecial) {
      console.log(`[POS_UTIL] NO GIRO ESPECIAL: Entrando a lógica general.`);
      if (extremoElegido === 'derecha') {
        nuevaPosicion = { fila: uPos.fila, columna: uPos.columna + (uRot === 0 || uRot === 180 || esDoble ? 1 : 1) }; // Simplificado, revisar si esDoble necesita ajuste de fila
        if (esDoble && !(uRot === 90 || uRot === -90)) nuevaPosicion.fila = uPos.fila + 1; // Ajuste para dobles verticales
      } else { // extremoElegido === 'izquierda'
        nuevaPosicion = { fila: uPos.fila, columna: uPos.columna - (uRot === 0 || uRot === 180 || esDoble ? 1 : 1) }; // Simplificado
        if (esDoble && !(uRot === 90 || uRot === -90)) nuevaPosicion.fila = uPos.fila - 1; // Ajuste para dobles verticales
      }
  
      if (esDoble) {
        rotacionCalculada = 0;
      } else {
        // Giro en T o continuación horizontal
        if (((uRot === 90 || uRot === -90) && nuevaPosicion.fila !== uPos.fila) || // H -> V (T-shape)
            ((uRot === 0 || uRot === 180) && nuevaPosicion.fila !== uPos.fila)) {  // V -> V (no doble)
          rotacionCalculada = 0; // Ficha se pone vertical
        } else { // Colocación Horizontal
          rotacionCalculada = calcularRotacionHorizontalNoDoble(
            fichaParaJugar,
            extremoElegido,
            valorConexionDeNuevaFicha
          );
        }
      }
    }
    console.log(`[POS_UTIL] FINAL: nuevaPos=(${nuevaPosicion.fila},${nuevaPosicion.columna}), rotCalc=${rotacionCalculada}`);
    return { nuevaPosicion, rotacionCalculada };
  };