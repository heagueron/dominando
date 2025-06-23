// /home/heagueron/jmu/dominando/src/components/jugador/UserAvatar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface UserAvatarProps {
  size?: number; // Tamaño opcional para el avatar
  className?: string; // Para clases adicionales si es necesario
  src?: string | null; // URL de la imagen, opcional
  name?: string | null; // Nombre para alt text e iniciales, opcional
}

export default function UserAvatar({ size = 32, className = "", src, name }: UserAvatarProps) { // Default size 32
  const [imageLoadError, setImageLoadError] = useState(false);

  // El componente ahora solo depende de las props
  const userImage = src;
  const userName = name ?? 'Usuario';
  
  // Resetear el estado de error si la imagen cambia (ej. el usuario cambia o se actualiza la sesión)
  useEffect(() => {
    setImageLoadError(false);
  }, [userImage]);

  // Generar iniciales de forma más robusta
  const getInitials = (nameInput: string | null) => { // Aceptar string | null
    if (!nameInput) return 'U'; 
    const nameParts = nameInput.split(' ').filter(part => part.length > 0);
    if (nameParts.length === 0) return 'U';
    if (nameParts.length === 1) return nameParts[0].substring(0, 2).toUpperCase();
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(userName);

  if (userImage && !imageLoadError) {
    return (
      <Image
        src={userImage}
        alt={`Avatar de ${userName}`}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`} // object-cover para mejor ajuste
        onError={(e) => {
          console.warn("Error al cargar la imagen del avatar:", e);
          setImageLoadError(true); // Si la imagen falla, activa el estado de error para mostrar el fallback
        }}
      />
    );
  }

  // Placeholder si no hay imagen (ej. iniciales)
  return (
    <div
      className={`rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size / 2.5) }} // Asegurar un tamaño mínimo de fuente
      title={userName ?? undefined} // Convertir null a undefined para el atributo title
    >
      {initials}
    </div>
  );
}
