'use server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EMType } from "@prisma/client"; // Import EMType from Prisma client
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'; // Import for specific Prisma error handling

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
    // No es necesario asignar a una variable si no se usa después
    await prisma.entryMessage.create({
      data: {
        content: data.content,
        type: data.type,
        source: data.source && data.source.trim() !== '' ? data.source.trim() : null, // Ensure null if empty or undefined
      },
    });
  } catch (error: unknown) {
    console.error("Error creating entry message:", error);
    if (error instanceof PrismaClientKnownRequestError) {
      // Manejar error de restricción única para 'content' (código P2002)
      // Se usa 'as { target?: string[] }' para tipar 'meta' de forma segura
      if (error.code === 'P2002' && (error.meta as { target?: string[] })?.target?.includes('content')) {
        return { error: "Ya existe un mensaje con este contenido." };
      }
    }
    let errorMessage = "Error desconocido.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: "Error al crear el mensaje de entrada: " + errorMessage };
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
  } catch (error: unknown) {
    console.error("Error deleting entry message:", error);
    if (error instanceof PrismaClientKnownRequestError) {
      // Maneja el caso en que el registro no se encuentra
      if (error.code === 'P2025') {
        return { error: "No se encontró el mensaje para eliminar." };
      }
    }
    let errorMessage = "Error desconocido.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: "Error al eliminar el mensaje de entrada: " + errorMessage };
  }
}

export async function getRandomEntryMessage() {
  try {
    const messageCount = await prisma.entryMessage.count();
    if (messageCount === 0) {
      return null;
    }
    const skip = Math.floor(Math.random() * messageCount);
    const randomMessages = await prisma.entryMessage.findMany({
      take: 1,
      skip: skip,
    });
    return randomMessages[0];
  } catch (error) {
    console.error("Error fetching random entry message:", error);
    return null;
  }
}
