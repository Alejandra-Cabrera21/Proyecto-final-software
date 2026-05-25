/**
 * Pruebas de Seguridad — OWASP Top 10
 * Verifica que la API resista los vectores de ataque más comunes.
 */
const request = require('supertest')
const jwt = require('jsonwebtoken')

jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    survey: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn(), findMany: jest.fn() },
    response: { count: jest.fn() },
    $disconnect: jest.fn(),
  }
  return { PrismaClient: jest.fn(() => mockPrisma) }
})

jest.mock('bcryptjs')
jest.mock('jsonwebtoken')

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()
const app = require('../app')

const ADMIN = { id: 'admin-1', email: 'admin@uni.gt', role: 'admin' }
const USER  = { id: 'user-1',  email: 'user@uni.gt',  role: 'user'  }

beforeEach(() => {
  jest.clearAllMocks()
  process.env.JWT_SECRET = 'test-secret'
  process.env.JWT_EXPIRES_IN = '1h'
})

// ─── A01: Broken Access Control ───────────────────────────────────────────────
describe('A01 — Control de acceso roto', () => {
  test('usuario sin token no accede a rutas protegidas', async () => {
    const res = await request(app).get('/api/surveys')
    expect(res.status).toBe(401)
  })

  test('usuario normal no accede al panel /admin', async () => {
    jwt.verify.mockReturnValue(USER)
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', 'Bearer token')
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Acceso solo para administradores')
  })

  test('usuario normal no puede ver encuestas de otro usuario', async () => {
    jwt.verify.mockReturnValue(USER)
    prisma.survey.findFirst.mockResolvedValue(null)
    const res = await request(app)
      .get('/api/surveys/survey-de-otro')
      .set('Authorization', 'Bearer token')
    expect(res.status).toBe(404)
  })
})

// ─── A02: Cryptographic Failures ──────────────────────────────────────────────
describe('A02 — Fallas criptográficas', () => {
  test('las contraseñas se hashean con bcrypt antes de guardar', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    bcrypt.hash.mockResolvedValue('$2b$10$hashedpassword')
    prisma.user.create.mockResolvedValue({ id: 'u1', email: 'x@uni.gt', role: 'user' })
    jwt.sign.mockReturnValue('token')

    await request(app)
      .post('/api/auth/register')
      .send({ email: 'x@uni.gt', password: 'password123' })

    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10)
    const savedData = prisma.user.create.mock.calls[0][0].data
    expect(savedData.passwordHash).toBe('$2b$10$hashedpassword')
    expect(savedData).not.toHaveProperty('password')
  })

  test('tokens JWT malformados son rechazados', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('jwt malformed') })
    const res = await request(app)
      .get('/api/surveys')
      .set('Authorization', 'Bearer token.invalido.xxx')
    expect(res.status).toBe(401)
  })
})

// ─── A03: Injection ───────────────────────────────────────────────────────────
describe('A03 — Inyección', () => {
  test('inputs con caracteres especiales SQL no rompen la API', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: "' OR '1'='1", password: "' OR '1'='1" })
    // La API usa Prisma ORM con queries parametrizadas, nunca SQL crudo
    expect([400, 401, 500]).toContain(res.status)
    expect(res.body).not.toHaveProperty('token')
  })

  test('inputs con scripts XSS no se ejecutan en respuestas JSON', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    const xssPayload = '<script>alert("xss")</script>'
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: xssPayload, password: 'pass' })
    // La respuesta es JSON, no HTML — XSS no aplica en este contexto
    expect(res.headers['content-type']).toMatch(/json/)
    expect(res.status).not.toBe(200)
  })
})

// ─── A07: Authentication Failures ─────────────────────────────────────────────
describe('A07 — Fallas de autenticación', () => {
  test('requests sin header Authorization son rechazados con 401', async () => {
    const routes = ['/api/surveys', '/api/auth/me', '/api/admin/users']
    for (const route of routes) {
      const res = await request(app).get(route)
      expect(res.status).toBe(401)
    }
  })

  test('header Authorization sin prefijo Bearer es rechazado', async () => {
    const res = await request(app)
      .get('/api/surveys')
      .set('Authorization', 'solo-un-token-sin-bearer')
    expect(res.status).toBe(401)
  })

  test('token expirado es rechazado', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('TokenExpiredError') })
    const res = await request(app)
      .get('/api/surveys')
      .set('Authorization', 'Bearer token-expirado')
    expect(res.status).toBe(401)
  })
})

// ─── A05: Security Misconfiguration ───────────────────────────────────────────
describe('A05 — Configuración incorrecta de seguridad', () => {
  test('la API no expone stack traces en errores 500', async () => {
    jwt.verify.mockReturnValue(USER)
    prisma.survey.findMany.mockRejectedValue(new Error('DB connection failed'))
    const res = await request(app)
      .get('/api/surveys')
      .set('Authorization', 'Bearer token')
    expect(res.status).toBe(500)
    expect(res.body).not.toHaveProperty('stack')
    expect(res.body.error).toBe('Error al obtener encuestas')
  })
})
