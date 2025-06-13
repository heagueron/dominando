// /home/heagueron/jmu/dominando/src/components/jugador/UserAvatar.tsx
'use client';

import Image from 'next/image';
import { useSession } from 'next-auth/react';

interface UserAvatarProps {
  size?: number; // Tamaño opcional para el avatar
  className?: string; // Para clases adicionales si es necesario
  src?: string | null; // URL de la imagen, opcional
  name?: string | null; // Nombre para alt text e iniciales, opcional
}

export default function UserAvatar({ size = 32, className = "", src, name }: UserAvatarProps) { // Default size 32
  const { data: session } = useSession();

  // Priorizar props, luego sesión (si src/name no se pasan, útil para Navbar), luego fallback
  const userImage = src !== undefined ? src : session?.user?.image;
  const userName = name !== undefined ? name : session?.user?.name ?? session?.user?.email ?? 'Usuario';
  
  // Generar iniciales de forma más robusta
  const getInitials = (nameInput: string | null) => { // Aceptar string | null
    if (!nameInput) return 'U'; 
    const nameParts = nameInput.split(' ').filter(part => part.length > 0);
    if (nameParts.length === 0) return 'U';
    if (nameParts.length === 1) return nameParts[0].substring(0, 2).toUpperCase();
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(userName);

  if (userImage) {
    return (
      <Image
        src={userImage}
        alt={`Avatar de ${userName}`}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`} // object-cover para mejor ajuste
        onError={(e) => {
          // Opcional: manejar error si la imagen no carga,
          // podrías cambiar a un placeholder o simplemente ocultar la imagen
          // y dejar que el div de iniciales (si lo tuvieras como fallback) se muestre.
          // Por ahora, si hay error, no se mostrará nada (o el alt text si el navegador lo hace).
          // Para un fallback más visual, podrías tener un estado que cambie a mostrar iniciales.
          console.warn("Error al cargar la imagen del avatar:", e);
          (e.target as HTMLImageElement).style.display = 'none'; // Oculta la imagen rota
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
