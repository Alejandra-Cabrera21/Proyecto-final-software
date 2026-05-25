const request = require('supertest')
const jwt = require('jsonwebtoken')

jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    survey: { findMany: jest.fn() },
    auditLog: { create: jest.fn(), findMany: jest.fn() },
    $disconnect: jest.fn(),
  }
  return { PrismaClient: jest.fn(() => mockPrisma) }
})

jest.mock('jsonwebtoken')

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const app = require('../app')

const ADMIN = { id: 'admin-1', email: 'admin@uni.gt', role: 'admin' }
const USER  = { id: 'user-1',  email: 'user@uni.gt',  role: 'user'  }
const ADMIN_TOKEN = 'Bearer admin-token'
const USER_TOKEN  = 'Bearer user-token'

beforeEach(() => {
  jest.clearAllMocks()
  process.env.JWT_SECRET = 'test-secret'
})

// ─── EP-18: Acceso al panel admin denegado a usuarios normales ────────────────
describe('Acceso al panel /api/admin', () => {
  test('EP-18 — usuario con rol user recibe 403', async () => {
    jwt.verify.mockReturnValue(USER)

    const routes = ['/api/admin/users', '/api/admin/surveys', '/api/admin/audit']
    for (const route of routes) {
      const res = await request(app).get(route).set('Authorization', USER_TOKEN)
      expect(res.status).toBe(403)
    }
  })

  test('EP-04 — usuario sin token recibe 401', async () => {
    const res = await request(app).get('/api/admin/users')
    expect(res.status).toBe(401)
  })

  test('admin con rol correcto accede al panel', async () => {
    jwt.verify.mockReturnValue(ADMIN)
    prisma.user.findMany.mockResolvedValue([])

    const res = await request(app).get('/api/admin/users').set('Authorization', ADMIN_TOKEN)
    expect(res.status).toBe(200)
  })
})

// ─── EP-15: Suspender cuenta de usuario ───────────────────────────────────────
describe('PATCH /api/admin/users/:id/toggle', () => {
  test('EP-15 — admin suspende usuario activo', async () => {
    jwt.verify.mockReturnValue(ADMIN)
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', isActive: true })
    prisma.user.update.mockResolvedValue({ id: 'user-1', isActive: false })
    prisma.auditLog.create.mockResolvedValue({})

    const res = await request(app)
      .patch('/api/admin/users/user-1/toggle')
      .set('Authorization', ADMIN_TOKEN)

    expect(res.status).toBe(200)
    expect(res.body.isActive).toBe(false)
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'SUSPEND_USER' }),
      })
    )
  })

  test('admin reactiva usuario suspendido', async () => {
    jwt.verify.mockReturnValue(ADMIN)
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', isActive: false })
    prisma.user.update.mockResolvedValue({ id: 'user-1', isActive: true })
    prisma.auditLog.create.mockResolvedValue({})

    const res = await request(app)
      .patch('/api/admin/users/user-1/toggle')
      .set('Authorization', ADMIN_TOKEN)

    expect(res.status).toBe(200)
    expect(res.body.isActive).toBe(true)
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ACTIVATE_USER' }),
      })
    )
  })

  test('retorna 404 si el usuario no existe', async () => {
    jwt.verify.mockReturnValue(ADMIN)
    prisma.user.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .patch('/api/admin/users/no-existe/toggle')
      .set('Authorization', ADMIN_TOKEN)

    expect(res.status).toBe(404)
  })

  test('usuario normal no puede suspender cuentas', async () => {
    jwt.verify.mockReturnValue(USER)

    const res = await request(app)
      .patch('/api/admin/users/user-1/toggle')
      .set('Authorization', USER_TOKEN)

    expect(res.status).toBe(403)
  })
})

// ─── EP-17: Log de auditoría registra acciones ────────────────────────────────
describe('GET /api/admin/audit', () => {
  test('EP-17 — retorna log con acción, usuario y fecha', async () => {
    jwt.verify.mockReturnValue(ADMIN)
    prisma.auditLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        action: 'SUSPEND_USER',
        entity: 'user-1',
        createdAt: new Date('2026-05-24T10:42:00Z'),
        user: { email: 'admin@uni.gt' },
      },
      {
        id: 'log-2',
        action: 'LOGIN',
        entity: 'user',
        createdAt: new Date('2026-05-24T09:15:00Z'),
        user: { email: 'j.choc@uni.gt' },
      },
    ])

    const res = await request(app)
      .get('/api/admin/audit')
      .set('Authorization', ADMIN_TOKEN)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]).toHaveProperty('action', 'SUSPEND_USER')
    expect(res.body[0]).toHaveProperty('createdAt')
    expect(res.body[0].user).toHaveProperty('email')
  })

  test('usuario normal no puede ver el log de auditoría', async () => {
    jwt.verify.mockReturnValue(USER)
    const res = await request(app)
      .get('/api/admin/audit')
      .set('Authorization', USER_TOKEN)
    expect(res.status).toBe(403)
  })
})

// ─── Ver todas las encuestas del sistema ──────────────────────────────────────
describe('GET /api/admin/surveys', () => {
  test('admin ve todas las encuestas con su estado', async () => {
    jwt.verify.mockReturnValue(ADMIN)
    prisma.survey.findMany.mockResolvedValue([
      { id: 's1', title: 'Enc A', status: 'published', user: { email: 'x@uni.gt' }, _count: { responses: 10 } },
      { id: 's2', title: 'Enc B', status: 'draft',     user: { email: 'y@uni.gt' }, _count: { responses: 0  } },
    ])

    const res = await request(app)
      .get('/api/admin/surveys')
      .set('Authorization', ADMIN_TOKEN)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]).toHaveProperty('status')
  })
})
