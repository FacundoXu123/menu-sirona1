# Publicar el menú en Railway

Esta versión está preparada para:

- URL pública de Railway.
- Panel privado en `/admin`.
- Fotos y cambios persistentes mediante un volumen.
- Dominio personalizado opcional.

## Variables de entorno

En Railway, agregá estas variables:

```text
ADMIN_PASSWORD=una-clave-segura
SESSION_SECRET=un-texto-largo-y-aleatorio
NODE_ENV=production
STORAGE_DIR=/app/storage
```

Después de generar el dominio público, agregá:

```text
PUBLIC_BASE_URL=https://tu-dominio.up.railway.app
```

## Volumen

Creá un volumen y montalo en:

```text
/app/storage
```

Ahí se guardarán:

- `menu.json`
- la carpeta `uploads/` con las fotos

## Direcciones

- Menú público: `https://tu-dominio.up.railway.app`
- Administrador: `https://tu-dominio.up.railway.app/admin`
