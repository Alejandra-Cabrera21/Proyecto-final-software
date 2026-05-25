# Microencuestas — ISWII Proyecto

Plataforma de microencuestas desarrollada con React + Node.js + PostgreSQL.

## Requisitos previos
- Node.js 18+
- PostgreSQL instalado y corriendo
- npm

---

## Instalación rápida

### 1. Base de datos
Crea una base de datos en PostgreSQL:
```sql
CREATE DATABASE microencuestas;
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales de PostgreSQL:
```
DATABASE_URL="postgresql://TU_USUARIO:TU_PASSWORD@localhost:5432/microencuestas"
JWT_SECRET="cualquier_clave_secreta_larga"
```

Ejecuta las migraciones y el seed:
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Inicia el servidor:
```bash
npm run dev
```
El backend corre en http://localhost:4000

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
El frontend corre en http://localhost:5173

---

## Usuarios de prueba (después del seed)
| Email | Contraseña | Rol |
|-------|-----------|-----|
| admin@demo.com | admin123 | Administrador |
| user@demo.com | user123 | Usuario |

---

## Funcionalidades implementadas
- Registro e inicio de sesión con JWT
- Crear encuestas con preguntas de opción múltiple, respuesta corta y escala Likert
- Publicar, pausar y cerrar encuestas
- Enlace público para responder sin registro
- Prevención de respuestas duplicadas por dispositivo
- Dashboard de analytics con gráficas
- Panel de administración (usuarios, encuestas, log de auditoría)
- Duplicar encuestas como plantilla

---

## Estructura del proyecto
```
microencuestas/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Modelo de base de datos
│   │   └── seed.js          # Datos iniciales
│   └── src/
│       ├── controllers/     # Lógica de negocio
│       ├── middleware/      # Autenticación JWT
│       └── routes/          # Endpoints de la API
└── frontend/
    └── src/
        ├── pages/           # Pantallas de la aplicación
        ├── components/      # Componentes reutilizables
        ├── hooks/           # useAuth
        └── utils/           # Cliente API
```

## Ejecutar pruebas

```bash
cd backend
npm test              # pruebas con reporte de cobertura
npm run test:ci       # modo CI/CD sin interactividad
```

Cobertura mínima requerida: **70%** (RNF-06).  
Las pruebas cubren los 5 módulos: Auth, Encuestas, Respuestas, Analytics y Admin.  
Incluye pruebas de seguridad basadas en OWASP Top 10 (A01, A02, A03, A05, A07).

---

## CI/CD

Pipeline en `.github/workflows/ci.yml` con 3 fases secuenciales:

1. **Build** — instala dependencias y verifica que compile
2. **Test** — ejecuta Jest, bloquea el merge si cobertura < 70%
3. **Deploy** — automático a Vercel (frontend) y Railway (backend) solo desde `main`

Ningún integrante puede hacer push directo a `main` — todo cambio requiere Pull Request con aprobación de al menos un compañero.

---

## Arquitectura
CBSE — Component Based Software Engineering con 3 capas:
- Frontend: React 18 + Vite
- Backend: Node.js + Express + Prisma ORM
- Base de datos: PostgreSQL
