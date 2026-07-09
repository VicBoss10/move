#!/bin/bash
# Setup Keycloak - Genera move-realm-import.json desde .env y move-realm.example.json

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== Configuración de Keycloak ===${NC}"

# Verificar que .env existe
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: Archivo .env no encontrado${NC}"
    echo "Crea el archivo .env primero: cp .env.example .env"
    exit 1
fi

# Verificar que move-realm.example.json existe
if [ ! -f "keycloak/move-realm.example.json" ]; then
    echo -e "${RED}Error: keycloak/move-realm.example.json no encontrado${NC}"
    exit 1
fi

# Leer variables de .env (línea a línea, para soportar valores con espacios o caracteres especiales)
echo -e "${YELLOW}Leyendo configuración de .env...${NC}"
while IFS='=' read -r key value; do
    key="${key%%[[:space:]]*}"
    [[ -z "$key" || "$key" == \#* ]] && continue
    value="${value%$'\r'}"
    export "$key=$value"
done < .env

# Validar que existen los secretos necesarios
if [ -z "$VEHICLE_CLIENT_SECRET" ]; then
    echo -e "${RED}Error: VEHICLE_CLIENT_SECRET no está definido en .env${NC}"
    exit 1
fi

if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    echo -e "${YELLOW}Advertencia: GOOGLE_CLIENT_SECRET no está definido en .env${NC}"
    GOOGLE_CLIENT_SECRET="REPLACE_WITH_OAUTH_SECRET"
fi

echo -e "${GREEN}✓ Secretos encontrados${NC}"

# Generar move-realm-import.json desde el template
echo -e "${YELLOW}Generando move-realm-import.json...${NC}"

# Reemplazar placeholders con valores de .env (sustitución nativa de bash:
# trata el valor como literal, a diferencia de sed, y funciona igual en macOS)
content="$(cat keycloak/move-realm.example.json)"
content="${content//REPLACE_WITH_YOUR_CLIENT_SECRET/"${VEHICLE_CLIENT_SECRET}"}"
content="${content//REPLACE_WITH_OAUTH_SECRET/"${GOOGLE_CLIENT_SECRET}"}"
printf '%s\n' "$content" > keycloak/move-realm-import.json

echo -e "${GREEN}✓ move-realm-import.json generado exitosamente${NC}"

# Verificar que se reemplazaron los valores
if grep -q "REPLACE_WITH" keycloak/move-realm-import.json; then
    echo -e "${YELLOW}⚠ Advertencia: Aún hay placeholders sin reemplazar${NC}"
    echo "Revisa manualmente: keycloak/move-realm-import.json"
else
    echo -e "${GREEN}✓ Todos los placeholders fueron reemplazados${NC}"
fi

echo ""
echo -e "${GREEN}=== Setup Completado ===${NC}"
echo "Próximos pasos:"
echo "  1. Levanta Keycloak: docker compose up -d keycloak"
echo "  2. El realm se importará automáticamente"
echo "  3. Accede a: http://localhost:8081/admin"
