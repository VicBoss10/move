#!/bin/sh
# docker-entrypoint.sh
# Inyecta variables de entorno en los archivos estáticos de Angular en runtime.
# Esto permite configurar la API Key de Google Maps sin reconstruir la imagen.

# Reemplazar el placeholder de Google Maps API Key
if [ -n "$GOOGLE_MAPS_API_KEY" ]; then
  echo "Injecting GOOGLE_MAPS_API_KEY into index.html..."
  sed -i "s|__GOOGLE_MAPS_KEY_PLACEHOLDER__|${GOOGLE_MAPS_API_KEY}|g" /usr/share/nginx/html/index.html
else
  echo "WARNING: GOOGLE_MAPS_API_KEY not set. Google Maps will not be available."
fi

# Generar assets/config.json en runtime a partir de variables de entorno
mkdir -p /usr/share/nginx/html/assets
cat > /usr/share/nginx/html/assets/config.json <<EOF
{
  "GOOGLE_MAPS_API_KEY": "${GOOGLE_MAPS_API_KEY:-}",
  "apiBaseUrl": "${FRONTEND_API_BASE_URL:-http://localhost:8080}",
  "authBaseUrl": "${FRONTEND_AUTH_BASE_URL:-http://localhost:8081}"
}
EOF

echo "Wrote /usr/share/nginx/html/assets/config.json"

# Ejecutar el comando original (nginx)
exec "$@"
