# Matriz app/backend: DailyAches

Ultima actualizacion: 2026-06-29

Esta matriz replica el contrato desde el backend y debe mantenerse sincronizada con DailyAches/MATRIZ_APP_BACKEND.md.

## Validaciones y campos fragiles

| Ruta                    | Validaciones backend                                                                                | Campos fragiles                            |
| ----------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| POST /api/auth/register | email y password obligatorios, password min 6, name opcional                                        | email, password, name                      |
| POST /api/auth/login    | email y password obligatorios                                                                       | token, user                                |
| PUT /api/auth/profile   | name no vacio si se envia, email valido, phone string o null, birth_date YYYY-MM-DD                 | birth_date, email, phone                   |
| PUT /api/auth/password  | current_password y new_password (minimo 6, distinta); actual incorrecta = 403; responde `{ success, token }` | token nuevo que la app guarda; sesiones anteriores dejan de valer |
| DELETE /api/auth/account | password en el body; 403 si es incorrecta; 409 si es el unico admin; transaccion sobre records, people, pain_types, users | la app borra tambien sus datos locales |
| POST /api/people        | name obligatorio; relation, image_url, phone opcionales; whatsapp_enabled bool                      | image_url, whatsapp_enabled                |
| PUT /api/people/:id     | id entero, ownership por user, name obligatorio                                                     | id, name, whatsapp_enabled                 |
| POST /api/pain-types    | name obligatorio y unico por usuario                                                                | name, image_url                            |
| PUT /api/pain-types/:id | id entero, ownership, name obligatorio, evita duplicados                                            | id, name                                   |
| POST /api/records       | person_id, pain_type_id, pain_level obligatorios; pain_level 1..10; ownership de person y pain_type; created_at opcional (ISO 8601, entre 2000-01-01 y ahora) | person_id, pain_type_id, pain_level, created_at |
| PUT /api/records/:id    | id entero, ownership, pain_level 1..10 si se envia, created_at con las mismas reglas                | person_id, pain_type_id, pain_level, notes, created_at |
| GET /api/records        | `{ records, total, limit, offset }`; query opcional limit (1..200), offset, from (inclusivo), to (exclusivo), person_id, pain_type_id; sin limit devuelve todo | person_name, pain_type_name, pain_type_image y total |
| DELETE /api/people/:id  | borra tambien los records de la persona (cascada)                                                   | removePerson en la app                     |
| DELETE /api/pain-types/:id | 409 mientras haya records que lo usen                                                            | mensaje de error en la app                 |
| GET /api/records/today  | depende de fecha del servidor                                                                       | created_at y timezone                      |

## Reglas de coordinacion

1. Mantener nombres snake_case del API mientras la app siga enviando esos payloads.
2. Si se cambia la respuesta de records, validar pantallas de historial y detalles.
3. Si se cambia bootstrap o auth, probar la secuencia register -> login -> me -> carga de listas.
