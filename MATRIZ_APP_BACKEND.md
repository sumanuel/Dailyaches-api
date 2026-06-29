# Matriz app/backend: DailyAches

Ultima actualizacion: 2026-06-29

Esta matriz replica el contrato desde el backend y debe mantenerse sincronizada con DailyAches/MATRIZ_APP_BACKEND.md.

## Validaciones y campos fragiles

| Ruta                    | Validaciones backend                                                                                | Campos fragiles                            |
| ----------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| POST /api/auth/register | email y password obligatorios, password min 6, name opcional                                        | email, password, name                      |
| POST /api/auth/login    | email y password obligatorios                                                                       | token, user                                |
| PUT /api/auth/profile   | name no vacio si se envia, email valido, phone string o null, birth_date YYYY-MM-DD                 | birth_date, email, phone                   |
| POST /api/people        | name obligatorio; relation, image_url, phone opcionales; whatsapp_enabled bool                      | image_url, whatsapp_enabled                |
| PUT /api/people/:id     | id entero, ownership por user, name obligatorio                                                     | id, name, whatsapp_enabled                 |
| POST /api/pain-types    | name obligatorio y unico por usuario                                                                | name, image_url                            |
| PUT /api/pain-types/:id | id entero, ownership, name obligatorio, evita duplicados                                            | id, name                                   |
| POST /api/records       | person_id, pain_type_id, pain_level obligatorios; pain_level 1..10; ownership de person y pain_type | person_id, pain_type_id, pain_level        |
| PUT /api/records/:id    | id entero, ownership, pain_level 1..10 si se envia                                                  | person_id, pain_type_id, pain_level, notes |
| GET /api/records        | response enriquecida con person_name, pain_type_name, pain_type_image                               | esos tres campos enriquecidos              |
| GET /api/records/today  | depende de fecha del servidor                                                                       | created_at y timezone                      |

## Reglas de coordinacion

1. Mantener nombres snake_case del API mientras la app siga enviando esos payloads.
2. Si se cambia la respuesta de records, validar pantallas de historial y detalles.
3. Si se cambia bootstrap o auth, probar la secuencia register -> login -> me -> carga de listas.
