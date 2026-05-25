# Pull Request — Plataforma de Microencuestas

## Descripción
<!-- Qué cambio introduce este PR y por qué es necesario -->

## Tipo de cambio
- [ ] Nueva funcionalidad
- [ ] Corrección de bug
- [ ] Refactor
- [ ] Pruebas
- [ ] Documentación

## Módulo afectado
- [ ] Autenticación
- [ ] Encuestas
- [ ] Respuestas
- [ ] Analytics
- [ ] Administración
- [ ] CI/CD / Infraestructura

## Checklist antes de solicitar revisión

### Código
- [ ] El código sigue el estándar de estilo del proyecto
- [ ] No se dejaron `console.log` de depuración
- [ ] No se exponen credenciales ni secrets en el código

### Pruebas
- [ ] Se agregaron o actualizaron pruebas unitarias para los cambios
- [ ] Todas las pruebas pasan (`npm test` sin errores)
- [ ] La cobertura de código se mantiene por encima del 70% (RNF-06)

### Seguridad
- [ ] Los nuevos endpoints están protegidos con autenticación JWT donde corresponde
- [ ] Los inputs de usuario son validados en el backend
- [ ] No se introducen vulnerabilidades OWASP conocidas

### Base de datos
- [ ] Si hay cambios al schema, se generó la migración con `prisma migrate dev`
- [ ] La migración fue probada en ambiente local antes de este PR

## Ambiente probado
- [ ] Local (localhost:4000 + localhost:5173)
- [ ] Staging (Vercel preview + Railway staging)

## Screenshots / evidencia (si aplica)
<!-- Agrega capturas de pantalla o logs si el cambio es visible en UI -->

---
> Todo PR a `main` requiere aprobación de al menos un compañero del equipo antes del merge.
