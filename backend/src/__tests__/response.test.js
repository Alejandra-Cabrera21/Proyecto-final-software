const request = require('supertest')

jest.mock('@prisma/client', () => {
  const mockPrisma = {
    survey: { findUnique: jest.fn() },
    response: { findFirst: jest.fn(), create: jest.fn() },
    $disconnect: jest.fn(),
  }
  return { PrismaClient: jest.fn(() => mockPrisma) }
})

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const app = require('../app')

const PUBLISHED_SURVEY = {
  id: 'survey-1',
  status: 'published',
  slug: 'encuesta-test',
  closesAt: null,
  questions: [{ id: 'q1', text: '¿Cómo calificarías el servicio?', type: 'likert' }],
}

beforeEach(() => jest.clearAllMocks())

// ─── EP-10: Responder encuesta por enlace público ─────────────────────────────
describe('POST /api/responses/:slug', () => {
  test('EP-10 — registra respuesta exitosamente', async () => {
    prisma.survey.findUnique.mockResolvedValue(PUBLISHED_SURVEY)
    prisma.response.findFirst.mockResolvedValue(null)
    prisma.response.create.mockResolvedValue({ id: 'resp-1', isComplete: true })

    const res = await request(app)
      .post('/api/responses/encuesta-test')
      .send({
        deviceFingerprint: 'device-abc',
        answers: [{ questionId: 'q1', value: '5' }],
      })

    expect(res.status).toBe(201)
    expect(res.body.message).toBe('Respuesta registrada correctamente')
    expect(res.body).toHaveProperty('responseId')
  })

  // EP-11: Prevención de respuesta duplicada
  test('EP-11 — previene respuesta duplicada del mismo dispositivo', async () => {
    prisma.survey.findUnique.mockResolvedValue(PUBLISHED_SURVEY)
    prisma.response.findFirst.mockResolvedValue({ id: 'resp-existing' })

    const res = await request(app)
      .post('/api/responses/encuesta-test')
      .send({
        deviceFingerprint: 'device-abc',
        answers: [{ questionId: 'q1', value: '3' }],
      })

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('Ya respondiste esta encuesta')
  })

  // EP-12: Encuesta cerrada no disponible
  test('EP-12 — encuesta no publicada retorna 404', async () => {
    prisma.survey.findUnique.mockResolvedValue({
      ...PUBLISHED_SURVEY,
      status: 'closed',
    })

    const res = await request(app)
      .post('/api/responses/encuesta-test')
      .send({ answers: [] })

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Encuesta no disponible')
  })

  test('encuesta pausada retorna 404', async () => {
    prisma.survey.findUnique.mockResolvedValue({
      ...PUBLISHED_SURVEY,
      status: 'paused',
    })

    const res = await request(app)
      .post('/api/responses/encuesta-test')
      .send({ answers: [] })

    expect(res.status).toBe(404)
  })

  test('encuesta con fecha de cierre pasada retorna 410', async () => {
    prisma.survey.findUnique.mockResolvedValue({
      ...PUBLISHED_SURVEY,
      closesAt: new Date('2020-01-01'),
    })

    const res = await request(app)
      .post('/api/responses/encuesta-test')
      .send({ answers: [] })

    expect(res.status).toBe(410)
    expect(res.body.error).toBe('Encuesta cerrada')
  })

  test('encuesta inexistente retorna 404', async () => {
    prisma.survey.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/responses/no-existe')
      .send({ answers: [] })

    expect(res.status).toBe(404)
  })

  test('permite respuesta sin deviceFingerprint (usuario anónimo)', async () => {
    prisma.survey.findUnique.mockResolvedValue(PUBLISHED_SURVEY)
    prisma.response.create.mockResolvedValue({ id: 'resp-anon', isComplete: true })

    const res = await request(app)
      .post('/api/responses/encuesta-test')
      .send({ answers: [{ questionId: 'q1', value: '4' }] })

    expect(res.status).toBe(201)
  })
})
