const request = require('supertest')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

// Mock Prisma antes de importar la app
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $disconnect: jest.fn(),
  }
  return { PrismaClient: jest.fn(() => mockPrisma) }
})

jest.mock('bcryptjs')
jest.mock('jsonwebtoken')

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const app = require('../app')

beforeEach(() => {
  jest.clearAllMocks()
  process.env.JWT_SECRET = 'test-secret'
  process.env.JWT_EXPIRES_IN = '1h'
})

// ─── EP-01: Registro exitoso de usuario ───────────────────────────────────────
describe('POST /api/auth/register', () => {
  test('EP-01 — registra usuario correctamente y retorna token', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    bcrypt.hash.mockResolvedValue('hashed_password')
    prisma.user.create.mockResolvedValue({
      id: 'uuid-1',
      email: 'test@uni.gt',
      role: 'user',
    })
    jwt.sign.mockReturnValue('fake-jwt-token')

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@uni.gt', password: 'password123' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('token')
    expect(res.body.user.email).toBe('test@uni.gt')
  })

  test('retorna 400 si faltan email o contraseña', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@uni.gt' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Email y contraseña son requeridos')
  })

  test('retorna 400 si el email ya está registrado', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'uuid-existing' })

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'existe@uni.gt', password: 'password123' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('El email ya está registrado')
  })
})

// ─── EP-02: Login con credenciales correctas ──────────────────────────────────
describe('POST /api/auth/login', () => {
  test('EP-02 — login exitoso retorna token JWT', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'uuid-1',
      email: 'test@uni.gt',
      passwordHash: 'hashed',
      role: 'user',
      isActive: true,
    })
    bcrypt.compare.mockResolvedValue(true)
    jwt.sign.mockReturnValue('fake-jwt-token')
    prisma.auditLog.create.mockResolvedValue({})

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@uni.gt', password: 'password123' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token', 'fake-jwt-token')
  })

  // EP-03: Login con credenciales incorrectas
  test('EP-03 — retorna 401 con contraseña incorrecta', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'uuid-1',
      email: 'test@uni.gt',
      passwordHash: 'hashed',
      isActive: true,
    })
    bcrypt.compare.mockResolvedValue(false)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@uni.gt', password: 'wrong' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Credenciales inválidas')
  })

  test('EP-03 — retorna 401 si el usuario no existe', async () => {
    prisma.user.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexiste@uni.gt', password: 'pass' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Credenciales inválidas')
  })

  // EP-16: Usuario suspendido no puede iniciar sesión
  test('EP-16 — usuario suspendido no puede iniciar sesión', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'uuid-suspended',
      email: 'suspendido@uni.gt',
      passwordHash: 'hashed',
      isActive: false,
    })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'suspendido@uni.gt', password: 'password123' })

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Credenciales inválidas')
  })
})

// ─── EP-04: Acceso denegado sin token ─────────────────────────────────────────
describe('GET /api/auth/me', () => {
  test('EP-04 — retorna 401 si no hay token', async () => {
    const res = await request(app).get('/api/auth/me')

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token requerido')
  })

  test('EP-04 — retorna 401 con token inválido', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('invalid') })

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token-invalido')

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Token inválido')
  })
})

// ─── Health check ─────────────────────────────────────────────────────────────
describe('GET /health', () => {
  test('retorna status ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})
