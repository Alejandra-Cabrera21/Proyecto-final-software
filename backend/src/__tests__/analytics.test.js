const request = require('supertest')
const jwt = require('jsonwebtoken')

jest.mock('@prisma/client', () => {
  const mockPrisma = {
    survey: { findFirst: jest.fn() },
    $disconnect: jest.fn(),
  }
  return { PrismaClient: jest.fn(() => mockPrisma) }
})

jest.mock('jsonwebtoken')

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const app = require('../app')

const USER = { id: 'user-1', email: 'test@uni.gt', role: 'user' }
const TOKEN = 'Bearer valid-token'

beforeEach(() => {
  jest.clearAllMocks()
  process.env.JWT_SECRET = 'test-secret'
  jwt.verify.mockReturnValue(USER)
})

// ─── EP-13: Ver resultados en tiempo real ─────────────────────────────────────
describe('GET /api/analytics/:id', () => {
  test('EP-13 — retorna gráficas y estadísticas generales', async () => {
    prisma.survey.findFirst.mockResolvedValue({
      id: 'survey-1',
      userId: USER.id,
      questions: [
        {
          id: 'q1',
          text: '¿Recomendarías el servicio?',
          type: 'multiple_choice',
          answers: [
            { value: 'Definitivamente' },
            { value: 'Definitivamente' },
            { value: 'Probablemente sí' },
          ],
        },
        {
          id: 'q2',
          text: '¿Cómo calificarías la atención?',
          type: 'likert',
          answers: [{ value: '5' }, { value: '4' }, { value: '5' }],
        },
      ],
      responses: [
        { isComplete: true },
        { isComplete: true },
        { isComplete: false },
      ],
    })

    const res = await request(app)
      .get('/api/analytics/survey-1')
      .set('Authorization', TOKEN)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('totalResponses', 3)
    expect(res.body).toHaveProperty('questionStats')
    expect(res.body.questionStats).toHaveLength(2)
  })

  // EP-14: Estadísticas generales correctas
  test('EP-14 — calcula tasa de completitud correctamente', async () => {
    prisma.survey.findFirst.mockResolvedValue({
      id: 'survey-1',
      userId: USER.id,
      questions: [],
      responses: [
        { isComplete: true },
        { isComplete: true },
        { isComplete: true },
        { isComplete: true },
        { isComplete: true },
        { isComplete: true },
        { isComplete: true },
        { isComplete: true },
        { isComplete: false },
        { isComplete: false },
      ],
    })

    const res = await request(app)
      .get('/api/analytics/survey-1')
      .set('Authorization', TOKEN)

    expect(res.status).toBe(200)
    expect(res.body.totalResponses).toBe(10)
    expect(res.body.completionRate).toBe(80)
  })

  test('retorna 0% si no hay respuestas', async () => {
    prisma.survey.findFirst.mockResolvedValue({
      id: 'survey-1',
      userId: USER.id,
      questions: [],
      responses: [],
    })

    const res = await request(app)
      .get('/api/analytics/survey-1')
      .set('Authorization', TOKEN)

    expect(res.status).toBe(200)
    expect(res.body.totalResponses).toBe(0)
    expect(res.body.completionRate).toBe(0)
  })

  test('retorna conteos por opción en preguntas de opción múltiple', async () => {
    prisma.survey.findFirst.mockResolvedValue({
      id: 'survey-1',
      userId: USER.id,
      questions: [
        {
          id: 'q1',
          text: '¿Sí o No?',
          type: 'multiple_choice',
          answers: [
            { value: 'Sí' }, { value: 'Sí' }, { value: 'No' },
          ],
        },
      ],
      responses: [{ isComplete: true }, { isComplete: true }, { isComplete: true }],
    })

    const res = await request(app)
      .get('/api/analytics/survey-1')
      .set('Authorization', TOKEN)

    expect(res.status).toBe(200)
    const q = res.body.questionStats[0]
    expect(q.counts['Sí']).toBe(2)
    expect(q.counts['No']).toBe(1)
  })

  test('retorna 404 si la encuesta no existe o no pertenece al usuario', async () => {
    prisma.survey.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .get('/api/analytics/no-existe')
      .set('Authorization', TOKEN)

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Encuesta no encontrada')
  })

  test('retorna 401 sin token', async () => {
    const res = await request(app).get('/api/analytics/survey-1')
    expect(res.status).toBe(401)
  })
})
