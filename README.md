# Menú digital para cafetería — versión con fotos

Este proyecto tiene dos vistas separadas:

- **Menú público:** los clientes solo ven productos, categorías, precios y fotos.
- **Panel privado:** permite editar el menú, subir fotos, ocultar productos y generar el QR.

## Inicio rápido en Windows

1. Extraé esta carpeta fuera de OneDrive, por ejemplo en `C:\menu-cafeteria-fotos`.
2. Hacé doble clic en `INICIAR-EN-WINDOWS.bat`.
3. La primera vez instalará las dependencias y abrirá el panel administrador.

También se puede iniciar desde CMD dentro de la carpeta:

```cmd
npm install
npm start
```

Direcciones locales:

- Menú: `http://localhost:3000`
- Administración: `http://localhost:3000/admin`
- Contraseña inicial: `demo1234`

## Subir fotos descargadas

En **Productos → Nuevo producto / Editar** aparece el campo **Foto del producto**.

- Se puede elegir una foto desde la computadora o el celular.
- La foto es opcional: si no se elige ninguna, el producto aparece solo con texto.
- Formatos aceptados: JPG, PNG, WEBP y GIF.
- Tamaño máximo: 5 MB.
- También se puede reemplazar o quitar una foto existente.

En **Datos del local** también se puede elegir una foto de portada.

Las fotos quedan guardadas en `public/uploads`.

## Nombre de la dirección

En **Datos del local → Ruta corta local** se puede escribir, por ejemplo:

```text
sironacafe
```

Entonces el menú también se puede abrir en:

```text
http://localhost:3000/sironacafe
```

`localhost` significa que la web está funcionando solamente en esa computadora. Para que los clientes entren desde sus teléfonos hace falta publicar el proyecto en internet.

## Usar un dominio como MenuSirona.com

Es posible, pero el dominio no cambia solamente escribiendo el nombre. Los pasos reales son:

1. Comprobar que el dominio esté disponible y comprarlo.
2. Publicar esta web en un hosting.
3. Conectar el dominio con el hosting mediante DNS.
4. En el panel, escribir la URL final en **Dominio o URL pública**, por ejemplo `https://menusirona.com`.
5. Volver a generar y descargar el QR.

Una vez conectado, las direcciones serían:

- Menú público: `https://menusirona.com`
- Panel privado: `https://menusirona.com/admin`

## Configuración para producción

Variables de entorno recomendadas:

```text
ADMIN_PASSWORD=una-clave-segura
SESSION_SECRET=un-texto-largo-y-aleatorio
PUBLIC_BASE_URL=https://menusirona.com
NODE_ENV=production
```

En producción conviene agregar almacenamiento persistente o una base de datos. En algunos hostings, los archivos subidos al disco pueden desaparecer después de un reinicio o un nuevo despliegue.

## Publicación en Railway

Esta versión incluye `railway.json` y admite almacenamiento persistente mediante:

```text
STORAGE_DIR=/app/storage
```

Creá un volumen montado en `/app/storage`. Allí se guardarán el menú y las fotos. Consultá `GUIA-PUBLICAR-RAILWAY.md`.
