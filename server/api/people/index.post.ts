import { getAuthUser } from "../../auth/requireUser";
import { query } from "../../db/query";

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event);

  const body = await readBody(event);
  const name = body.name?.trim();
  const relation = body.relation?.trim();
  const imageUrl = body.image_url?.trim();
  const phone = body.phone?.trim();
  const whatsappEnabled = body.whatsapp_enabled;

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: "Name is required" });
  }

  const result = await query(
    "INSERT INTO people (user_id, name, relation, image_url, phone, whatsapp_enabled) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, relation, image_url, phone, whatsapp_enabled, created_at",
    [
      user.id,
      name,
      relation || null,
      imageUrl || null,
      phone || null,
      whatsappEnabled || false,
    ]
  );

  return { person: result.rows[0] };
});
