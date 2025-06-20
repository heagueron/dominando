'use server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EMType } from "@prisma/client"; // Import EMType from Prisma client

interface CreateEntryMessageData {
  content: string;
  type: EMType;
  source?: string;
}

export async function createEntryMessage(data: CreateEntryMessageData) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.is_admin) {
    return { error: "Acceso no autorizado." };
  }

  try {
    const newEntryMessage = await prisma.entryMessage.create({
      data: {
        content: data.content,
        type: data.type,
        source: data.source && data.source.trim() !== '' ? data.source.trim() : null, // Ensure null if empty or undefined
      },
    }); // La revalidación y redirección se harán después del try/catch
  } catch (error: any) {
    console.error("Error creating entry message:", error);
    // Handle Prisma unique constraint error for 'content' if it's unique
    if (error.code === 'P2002' && error.meta?.target?.includes('content')) {
      return { error: "Ya existe un mensaje con este contenido." };
    }
    return { error: "Error al crear el mensaje de entrada: " + (error.message || "Error desconocido.") };
  }

  revalidatePath("/admin/mensajes-entrada"); // Revalidate the list page
  redirect("/admin/mensajes-entrada?message=Mensaje creado exitosamente.");
}

export async function deleteEntryMessage(id: string) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.is_admin) {
    return { error: "Acceso no autorizado." };
  }

  try {
    await prisma.entryMessage.delete({
      where: { id },
    });

    revalidatePath("/admin/mensajes-entrada");
    return { success: "Mensaje eliminado exitosamente." };
  } catch (error: any) {
    console.error("Error deleting entry message:", error);
    // Maneja el caso en que el registro no se encuentra
    if (error.code === 'P2025') {
        return { error: "No se encontró el mensaje para eliminar." };
    }
    return { error: "Error al eliminar el mensaje de entrada." };
  }
}