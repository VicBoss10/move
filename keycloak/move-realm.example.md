# Configuración de Keycloak - move-realm.example.json

## Uso

Este archivo es una plantilla de ejemplo del realm de Keycloak. Contiene placeholders para los secretos que debes reemplazar con tus valores reales.

### Pasos

> Estos son los pasos manuales. La forma recomendada es ejecutar `./scripts/setup-keycloak.sh` (o `.\scripts\setup-keycloak.ps1` en Windows) desde la raíz del proyecto, que hace todo esto automáticamente con los valores de `.env`.

1. Desde la raíz del proyecto, copia el archivo de ejemplo:
   ```bash
   cp keycloak/move-realm.example.json keycloak/move-realm-import.json
   ```

2. Abre `keycloak/move-realm-import.json` y reemplaza los placeholders (ver sección siguiente)

3. Reinicia Keycloak:
   ```bash
   docker restart move-keycloak
   ```
   El realm se importará automáticamente.

---

## Placeholders a Reemplazar

### 1. Cliente Backend Secret

Ubicación en el archivo:
```json
{
  "clientId" : "move-backend",
  ...
  "secret" : "REPLACE_WITH_YOUR_CLIENT_SECRET",
```

Qué hacer:
- Reemplaza `REPLACE_WITH_YOUR_CLIENT_SECRET` con tu secreto real
- Este secret se usa para comunicación server-to-server entre backend y Keycloak
- Ejemplo: `move-backend-secret-dev` (desarrollo) o un valor aleatorio seguro

---

### 2. Google OAuth Secret

Ubicación en el archivo:
```json
"identityProviders" : [ {
  "alias" : "google",
  "providerId" : "google",
  ...
  "config" : {
    "clientId" : "TU_CLIENT_ID.apps.googleusercontent.com",
    "clientSecret" : "REPLACE_WITH_OAUTH_SECRET",
```

Qué hacer:
- Reemplaza `REPLACE_WITH_OAUTH_SECRET` con tu Google OAuth secret real
- Este se obtiene en Google Cloud Console
- Tiene el formato `GOCSPX-` seguido de 28 caracteres

---

## Verificación

Después de importar, verifica en la consola de Keycloak:

1. Accede a `http://localhost:8081/admin`
2. Ve a Clients → move-backend
3. Verifica que el Secret esté configurado correctamente
4. Ve a Identity Providers → google
5. Verifica que Client ID y Secret estén configurados
