// /home/heagueron/jmu/dominando/src/utils/stringUtils.ts

/**
 * Formats a player name for display, typically shortening it.
 * If the name starts with "Jugador ", that prefix is removed.
 * Then, the last 4 characters of the processed name are returned.
 * Returns an empty string if the input name is null or undefined.
 */
export const formatPlayerNameForTitle = (name: string | null | undefined): string => {
    if (!name) return "";
    const processedName = name.startsWith("Jugador ") ? name.substring("Jugador ".length) : name;
    return processedName.slice(-4);
  };