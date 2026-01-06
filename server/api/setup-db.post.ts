import { createError } from "h3";
import { ensureUsersInfra } from "../db/setup";

export default defineEventHandler(async () => {
  console.log("Setup DB endpoint called");
  try {
    console.log("Starting database setup...");
    await ensureUsersInfra();
    console.log("Database setup completed successfully");
    return {
      success: true,
      message: "Base de datos inicializada correctamente",
      tables: ["users"],
      columns: [
        "id",
        "email",
        "password_hash",
        "name",
        "phone",
        "birth_date",
        "role",
        "is_active",
        "created_at",
        "updated_at",
      ],
    };
  } catch (error) {
    console.error("Error setting up database:", error);
    throw createError({
      statusCode: 500,
      statusMessage: `Error al inicializar la base de datos: ${
        error?.message || error
      }`,
    });
  }
});
