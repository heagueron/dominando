// src/utils/dominoConstants.ts (NUEVO ARCHIVO)
export const DOMINO_WIDTH_PX = 48;
export const DOMINO_HEIGHT_PX = 96;
export const DOMINO_WIDTH_PX_SMALL = 36;
export const DOMINO_HEIGHT_PX_SMALL = 72;
export const DOMINO_WIDTH_PX_MEDIUM = 48;
export const DOMINO_HEIGHT_PX_MEDIUM = 96;
export const DOMINO_WIDTH_PX_LARGE = 60;
export const DOMINO_HEIGHT_PX_LARGE = 120;
export const DOMINO_WIDTH_PX_EXTRA_LARGE = 72;
export const DOMINO_HEIGHT_PX_EXTRA_LARGE = 144;

// Nuevas constantes para el área de diseño de la mesa
export const DESIGN_TABLE_WIDTH_PX = 1100; // Ancho del lienzo de diseño (ajusta según sea necesario)
export const DESIGN_TABLE_HEIGHT_PX = 900; // Alto del lienzo de diseño (debe ser igual al ancho si es cuadrado)

/*Elige un DESIGN_TABLE_WIDTH_PX que sea lo 
suficientemente grande como para acomodar la cadena de 
dominós más larga que esperas, usando DOMINO_WIDTH_PX y 
DOMINO_HEIGHT_PX como referencia. Por ejemplo, si una 
cadena puede tener unas 15 fichas de ancho (48px), 
15 * 48 = 720px. 800px podría ser un buen punto de partida

NOTA: UTILICE 9 fichas de ancho como referencia, 9 * 96 = 864px */
