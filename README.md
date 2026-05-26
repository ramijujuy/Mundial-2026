# 🏆 Prode Mundial 2026 - Aplicación de Apuestas de Fútbol

¡Bienvenido al sistema completo de apuestas y predicciones (Prode) para el **Mundial de la FIFA 2026** y otros campeonatos internacionales! 

Esta aplicación web permite a múltiples jugadores registrarse, pronosticar fixtures completos, competir en un ranking general basado en aciertos y a los administradores automatizar la gestión de torneos a través de la carga masiva de partidos con planillas de Excel y la entrada en tiempo real de resultados oficiales.

---

## 📂 Estructura del Proyecto

El código está organizado en dos subcarpetas independientes, preparadas para alojarse en repositorios separados o en una estructura de monorepo:

*   **`/mi-app-backend`**: Servidor Node.js + Express + MongoDB (Mongoose) que expone endpoints REST, procesa archivos Excel, realiza autenticación mediante JWT y calcula dinámicamente las tablas de posiciones.
*   **`/mi-app-frontend`**: Interfaz de usuario SPA en React (Create React App) construida con CSS premium, componentes con glassmorphism, responsive, e íconos dinámicos.

---

## 🚀 Ejecución en Entorno Local

### Requisitos Previos
*   **Node.js** (v16 o superior) instalado.
*   **MongoDB** corriendo de forma local o una cadena de conexión a MongoDB Atlas.

---

### 1. Servidor Backend (`/mi-app-backend`)

1.  Navega hacia la carpeta del backend en tu terminal:
    ```bash
    cd mi-app-backend
    ```
2.  Instala todas las dependencias requeridas:
    ```bash
    npm install
    ```
3.  Configura las variables de entorno. Copia el archivo `.env.example` y renómbralo a `.env`:
    ```bash
    cp .env.example .env
    ```
4.  Asegúrate de configurar los valores correctos en tu archivo `.env`:
    *   `PORT`: Puerto donde correrá el servidor local (ej: `5000`).
    *   `MONGO_URI`: Cadena de conexión a MongoDB.
    *   `JWT_SECRET`: Llave secreta para firmar tokens.
    *   `ADMIN_USERNAME`: Nombre del primer usuario administrador que se creará de forma automática en la base de datos (ej: `admin`).
    *   `ADMIN_PASSWORD`: Contraseña secreta para ese administrador (ej: `admin123`).
5.  Inicia el servidor en modo desarrollo:
    ```bash
    npm run dev
    ```
    *El backend conectará con MongoDB y creará de forma automática el usuario administrador inicial si este no existía.*

---

### 2. Cliente Frontend (`/mi-app-frontend`)

1.  Navega hacia la carpeta del frontend en tu terminal:
    ```bash
    cd ../mi-app-frontend
    ```
2.  Instala todas las dependencias requeridas:
    ```bash
    npm install
    ```
3.  Crea un archivo `.env` en la raíz de `/mi-app-frontend` para apuntar al backend local:
    ```env
    REACT_APP_API_URL=http://localhost:5000
    ```
4.  Inicia la aplicación en el servidor de desarrollo de React:
    ```bash
    npm start
    ```
5.  Abre tu navegador en [http://localhost:3000](http://localhost:3000).

---

## 📊 Formato de Fixture Excel

El módulo del administrador procesa archivos Excel para crear automáticamente los campeonatos y sus partidos correspondientes. El parser está diseñado para capturar la cuadrícula dual (side-by-side) de la Copa del Mundo 2026 (Grupos A-F en la izquierda, Grupos G-L en la derecha), tal como se especifica en la imagen provista.

### Estructura Requerida de Columnas:
El Excel debe contener en sus filas de cabecera los campos `Fecha`, `Hora` y `Jor.` en columnas adyacentes para que el scanner los reconozca:
1.  **Fecha**: Formato de texto `DD/MM/YY` (ej. `11/06/26`) o un campo de fecha nativo de Excel.
2.  **Hora**: Hora del partido `HH:MM` (ej. `15:00`).
3.  **Jor.**: Fase o jornada del partido (ej. `J1`, `J2`, `J3`, `Octavos`).
4.  **Local (Equipo)**: Nombre del equipo local a cuatro columnas a la derecha de la fecha.
5.  **Visitante (Equipo)**: Nombre del equipo visitante a seis columnas a la derecha de la fecha.

Tanto las cuadrículas de la izquierda como de la derecha que cumplan estas especificaciones serán importadas simultáneamente en una sola operación.

---

## ☁️ Despliegue en Vercel (Paso a Paso)

Ambos proyectos están listos para ser desplegados como aplicaciones independientes en la nube de Vercel usando la configuración del archivo `vercel.json` ya incorporado.

### 🌟 Paso 1: Subir el código a GitHub
Crea un repositorio en tu perfil de GitHub y sube tu código. Recomendamos una estructura unificada:
```
/tu-repositorio
  ├── /mi-app-backend
  └── /mi-app-frontend
```

---

### 🌟 Paso 2: Desplegar el Backend en Vercel
1.  Inicia sesión en tu consola de [Vercel Dashboard](https://vercel.com).
2.  Haz clic en **"Add New"** > **"Project"** e importa tu repositorio de GitHub.
3.  En la configuración de importación:
    *   **Root Directory**: Selecciona la carpeta `mi-app-backend`.
    *   **Framework Preset**: Elige **"Other"** (Vercel detectará el archivo `vercel.json` y usará `@vercel/node` para habilitar funciones serverless de Express).
4.  Despliega la sección **"Environment Variables"** y añade las siguientes llaves:
    *   `MONGO_URI` = *Tu cadena de conexión a MongoDB Atlas*
    *   `JWT_SECRET` = *Tu frase secreta de JWT*
    *   `ADMIN_USERNAME` = *Nombre del usuario admin*
    *   `ADMIN_PASSWORD` = *Contraseña del admin*
5.  Haz clic en **"Deploy"**. Una vez terminado, Vercel te proveerá un dominio de producción (ej: `https://mi-prode-backend.vercel.app`). **Cópialo.**

---

### 🌟 Paso 3: Desplegar el Frontend en Vercel
1.  Regresa a tu consola de Vercel y haz clic en **"Add New"** > **"Project"** de nuevo para importar el mismo repositorio.
2.  En la configuración de importación:
    *   **Root Directory**: Selecciona la carpeta `mi-app-frontend`.
    *   **Framework Preset**: Elige **"Create React App"**.
3.  Despliega la sección **"Environment Variables"** y añade la variable que conecta la web con la base de datos de producción:
    *   `REACT_APP_API_URL` = *Ingresa el dominio copiado del backend en el Paso 2* (ej: `https://mi-prode-backend.vercel.app`).
4.  Haz clic en **"Deploy"**. Vercel compilará la SPA de React y configurará las redirecciones de SPA dinámicas especificadas en su respectivo `vercel.json`.

---

## 🔒 Reglas de Validación y Flujo del Sistema

1.  **Aprobación Obligatoria**: Cuando un jugador se registra, entra a una cola de espera. Únicamente los usuarios con estado `approved` pueden acceder al fixture, guardar pronósticos o aparecer en la tabla de posiciones.
2.  **Confirmación y Bloqueo Definitivo**: El jugador puede guardar un borrador parcial de sus partidos en cualquier momento. Sin embargo, no se le permitirá confirmar su participación hasta completar el **100%** de los partidos del campeonato. Al presionar "Confirmar", el pronóstico queda **bloqueado permanentemente** para el jugador.
3.  **Auditoría de Resultados**: Solo el Administrador puede ingresar los goles reales de cada encuentro deportivo. Al guardar los resultados oficiales, el sistema recalcula en segundo plano los puntajes acumulados de todos los jugadores de forma instantánea.
4.  **Bloqueo de Modificaciones**: Si el administrador marca un campeonato como **Finalizado**, todas las operaciones quedan deshabilitadas, congelando las posiciones finales del podio.
