import { createError } from "h3";
import { ensureUsersInfra } from "../db/setup";

export default defineEventHandler(async () => {
  try {
    await ensureUsersInfra();
    return {
      success: true,
      message: "Base de datos inicializada correctamente",
      tables: ["users"],
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Error al inicializar la base de datos: ${
        error?.message || error
      }`,
    });
  }
});
