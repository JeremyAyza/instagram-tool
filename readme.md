# 🚀 Instagram Follow Manager PRO

![Demo Preview](/assets/demo.png)
<!-- 💡 Tip: Añade un GIF aquí mostrando el proceso de análisis o la interfaz -->

> **Gestiona tus conexiones de Instagram de manera profesional.**
> Una extensión de Chrome potente que analiza tu círculo social de forma segura utilizando tu sesión de navegador local. Sin compartir contraseñas, sin riesgos en la nube.

## ✨ Funcionalidades Clave

*   **🛡️ Privacy First:** Funciona completamente en el cliente (client-side) usando tu sesión activa. Las credenciales nunca salen de tu máquina.
*   **📊 Smart Analysis:** Compara al instante "Seguidores" vs "Seguidos" para identificar quién no te sigue de vuelta.
*   **⚡ Safe Automation:** Capacidades de "unfollow" masivo con tiempos de espera aleatorios (delays) para respetar los rate limits.
*   **💾 Data Export:** Importación/exportación fluida de CSV para análisis de datos externos.

## 🛠️ Tech Stack

![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?style=flat-square&logo=javascript)
![Chrome Extensions](https://img.shields.io/badge/Chrome_API-Manifest_V3-4285F4?style=flat-square&logo=google-chrome)
![HTML5/CSS3](https://img.shields.io/badge/UI-HTML5%2FCSS3-orange?style=flat-square)

## � Instrucciones de Uso

### 1. Instalación
1.  Ve a `chrome://extensions/` y activa el **Developer Mode**.
2.  Haz clic en **Load Unpacked** y selecciona la carpeta de esta extensión.

### 2. Conectar Cuenta (Importante 🔑)
Para que la extensión funcione de forma segura, necesita sincronizarse con tu sesión actual de Instagram.
1.  Abre Instagram.com y pulsa `F12` para abrir las **DevTools**.
2.  Ve a la pestaña **Network** (Red).
3.  Haz scroll en tu lista de seguidores hasta que veas aparecer peticiones.
4.  Busca una petición que contenga `friendships` o similar (suelen ser endpoints de GraphQL).
5.  Haz clic derecho -> **Copy** -> **Copy as fetch**.
6.  Pégalo en la extensión y pulsa "Conectar".

### 3. Analizar
Usa los botones para descargar tus listas y ejecuta el comparador para ver estadísticas y limpiar tu lista de seguidos.

## ⚠️ Seguridad y Ética
Esta herramienta está diseñada para uso personal. Implementa retrasos aleatorios (1-2s) para imitar el comportamiento humano y cumplir con las políticas de uso justo. Todo el análisis ocurre localmente.

