# 🚀 Instagram Follow Manager PRO - Instrucciones

Esta extensión te permite gestionar tus seguidores de Instagram de forma profesional, utilizando tu propia sesión de navegador para máxima seguridad.

## 🛠️ Instalación

1.  Abre Google Chrome y ve a `chrome://extensions/`.
2.  Activa el **"Modo de desarrollador"** (esquina superior derecha).
3.  Haz clic en **"Cargar descomprimida"**.
4.  Selecciona la carpeta `extension` que acabamos de generar.
5.  ¡Listo! Verás el icono de la extensión en tu barra.

## 📖 Cómo usar

### Paso 1: Obtener Credenciales (Fetch)
Para que la extensión funcione con tu cuenta, necesita "permiso" para actuar como tú.
1.  Abre Instagram.com en una pestaña y abre la consola de desarrollador (`F12`).
2.  Ve a la pestaña **Network** (Red).
3.  Haz scroll en tu lista de seguidores o seguidos para que aparezca una petición de red.
4.  Busca una petición que empiece por `?count=12` o similar (suelen ser endpoints de graphQL o friendships).
5.  Haz clic derecho sobre ella -> **Copy** -> **Copy as fetch**.
6.  Abre la extensión, pega ese texto en el área de texto y pulsa **"Conectar API"**.

### Paso 2: Obtener Datos
*   Usa los botones **"⬇ Seguidores"** y **"⬇ Seguidos"** para descargar tu lista actual desde Instagram.
*   O si ya tienes archivos CSV, súbelos en la pestaña **"Datos"**.

### Paso 3: Analizar y Limpiar
1.  Ve a la pestaña **"Análisis"**.
2.  Pulsa **"Comparar"**.
3.  Verás la lista de gente que tú sigues pero no te siguen a ti.
4.  Puedes dejar de seguirlos uno a uno o usar el botón masivo (¡Úsalo con precaución!).

## ⚠️ Notas de Seguridad
*   La extensión usa tiempos de espera aleatorios (1-2 segundos) entre acciones para evitar bloqueos de Instagram.
*   No abuses de la función "Dejar de seguir a todos". Instagram tiene límites diarios (aprox 150-200 al día).
*   Tus datos se guardan solo en tu navegador (`LocalStorage`).

## 📂 Estructura de Archivos
*   `manifest.json`: Configuración de la extensión.
*   `background.js`: El "cerebro" que hace las llamadas a la API en segundo plano.
*   `popup.html/js/css`: La interfaz visual.
*   `utils/`: Funciones de ayuda para CSV y comparaciones.
