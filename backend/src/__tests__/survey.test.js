const request = require('supertest')
const jwt = require('jsonwebtoken')

jest.mock('@prisma/client', () => {
  const mockPrisma = {
    survey: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    question: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    response: {
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $disconnect: jest.fn(),
  }
  return { PrismaClient: jest.fn(() => mockPrisma) }
})

jest.mock('jsonwebtoken')

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const app = require('../app')

const TOKEN = 'Bearer valid-token'
const USER = { id: 'user-1', email: 'test@uni.gt', role: 'user' }

beforeEach(() => {
  jest.clearAllMocks()
  process.env.JWT_SECRET = 'test-secret'
  jwt.verify.mockReturnValue(USER)
})

// ─── EP-05: Crear encuesta exitosamente ───────────────────────────────────────
describe('POST /api/surveys', () => {
  test('EP-05 — crea encuesta con estado draft', async () => {
    prisma.survey.create.mockResolvedValue({
      id: 'survey-1',
      title: 'Encuesta de satisfacción',
      status: 'draft',
      slug: 'abc-def',
      questions: [],
    })
    prisma.auditLog.create.mockResolvedValue({})

    const res = await request(app)
      .post('/api/surveys')
      .set('Authorization', TOKEN)
      .send({ title: 'Encuesta de satisfacción', questions: [] })

    expect(res.status).toBe(201)
    expect(res.body.status).toBe('draft')
    expect(res.body.title).toBe('Encuesta de satisfacción')
  })

  test('retorna 400 si falta el título', async () => {
    const res = await request(app)
      .post('/api/surveys')
      .set('Authorization', TOKEN)
      .send({ questions: [] })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('El título es requerido')
  })

  test('retorna 401 sin token de autenticación', async () => {
    const res = await request(app)
      .post('/api/surveys')
      .send({ title: 'Test' })

    expect(res.status).toBe(401)
  })
})

// ─── EP-06: Publicar encuesta ─────────────────────────────────────────────────
describe('PATCH /api/surveys/:id/status', () => {
  test('EP-06 — cambia estado a published', async () => {
    prisma.survey.findFirst.mockResolvedValue({ id: 'survey-1', userId: USER.id, status: 'draft' })
    prisma.survey.update.mockResolvedValue({ id: 'survey-1', status: 'published', slug: 'abc-def' })
    prisma.auditLog.create.mockResolvedValue({})

    const res = await request(app)
      .patch('/api/surveys/survey-1/status')
      .set('Authorization', TOKEN)
      .send({ status: 'published' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('published')
  })

  test('retorna 400 con estado inválido', async () => {
    const res = await request(app)
      .patch('/api/surveys/survey-1/status')
      .set('Authorization', TOKEN)
      .send({ status: 'invalido' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Estado inválido')
  })
})

// ─── EP-07 y EP-08: Editar encuesta ──────────────────────────────────────────
describe('PUT /api/surveys/:id', () => {
  test('EP-07 — edita encuesta sin respuestas correctamente', async () => {
    prisma.survey.findFirst.mockResolvedValue({ id: 'survey-1', userId: USER.id })
    prisma.response.count.mockResolvedValue(0)
    prisma.question.deleteMany.mockResolvedValue({})
    prisma.question.createMany.mockResolvedValue({})
    prisma.survey.update.mockResolvedValue({
      id: 'survey-1',
      title: 'Título actualizado',
      questions: [],
    })

    const res = await request(app)
      .put('/api/surveys/survey-1')
      .set('Authorization', TOKEN)
      .send({ title: 'Título actualizado' })

    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Título actualizado')
  })

  test('EP-08 — bloquea edición si la encuesta tiene respuestas', async () => {
    prisma.survey.findFirst.mockResolvedValue({ id: 'survey-1', userId: USER.id })
    prisma.response.count.mockResolvedValue(3)

    const res = await request(app)
      .put('/api/surveys/survey-1')
      .set('Authorization', TOKEN)
      .send({ title: 'Intento fallido' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('No se puede editar una encuesta con respuestas')
  })

  test('retorna 404 si la encuesta no existe o no pertenece al usuario', async () => {
    prisma.survey.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .put('/api/surveys/no-existe')
      .set('Authorization', TOKEN)
      .send({ title: 'x' })

    expect(res.status).toBe(404)
  })
})

// ─── EP-09: Duplicar encuesta ─────────────────────────────────────────────────
describe('POST /api/surveys/:id/duplicate', () => {
  test('EP-09 — duplica encuesta con estado draft y sufijo (copia)', async () => {
    prisma.survey.findFirst.mockResolvedValue({
      id: 'survey-1',
      userId: USER.id,
      title: 'Encuesta original',
      description: 'Desc',
      questions: [{ text: 'P1', type: 'multiple_choice', options: null, orderIndex: 0 }],
    })
    prisma.survey.create.mockResolvedValue({
      id: 'survey-2',
      title: 'Encuesta original (copia)',
      status: 'draft',
      questions: [],
    })

    const res = await request(app)
      .post('/api/surveys/survey-1/duplicate')
      .set('Authorization', TOKEN)

    expect(res.status).toBe(201)
    expect(res.body.title).toContain('(copia)')
    expect(res.body.status).toBe('draft')
  })
})

// ─── EP-12: Encuesta cerrada no disponible (vista pública) ────────────────────
describe('GET /api/surveys/public/:slug', () => {
  test('EP-12 — retorna 404 si encuesta no está publicada', async () => {
    prisma.survey.findUnique.mockResolvedValue({
      id: 'survey-1',
      status: 'closed',
      slug: 'abc-def',
      questions: [],
    })

    const res = await request(app).get('/api/surveys/public/abc-def')

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Encuesta no disponible')
  })

  test('retorna 404 si la encuesta no existe', async () => {
    prisma.survey.findUnique.mockResolvedValue(null)

    const res = await request(app).get('/api/surveys/public/no-existe')

    expect(res.status).toBe(404)
  })
})
