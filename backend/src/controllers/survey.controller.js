const { PrismaClient } = require('@prisma/client')
const { v4: uuidv4 } = require('uuid')

const prisma = new PrismaClient()

const getAll = async (req, res) => {
  try {
    const surveys = await prisma.survey.findMany({
      where: { userId: req.user.id },
      include: { _count: { select: { responses: true, questions: true } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json(surveys)
  } catch { res.status(500).json({ error: 'Error al obtener encuestas' }) }
}

const getOne = async (req, res) => {
  try {
    const survey = await prisma.survey.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { questions: { orderBy: { orderIndex: 'asc' } } }
    })
    if (!survey) return res.status(404).json({ error: 'Encuesta no encontrada' })
    res.json(survey)
  } catch { res.status(500).json({ error: 'Error al obtener encuesta' }) }
}

const getBySlug = async (req, res) => {
  try {
    const survey = await prisma.survey.findUnique({
      where: { slug: req.params.slug },
      include: { questions: { orderBy: { orderIndex: 'asc' } } }
    })
    if (!survey || survey.status !== 'published')
      return res.status(404).json({ error: 'Encuesta no disponible' })
    if (survey.closesAt && new Date(survey.closesAt) < new Date())
      return res.status(410).json({ error: 'Encuesta cerrada' })
    res.json(survey)
  } catch { res.status(500).json({ error: 'Error al obtener encuesta' }) }
}

const create = async (req, res) => {
  try {
    const { title, description, closesAt, questions } = req.body
    if (!title) return res.status(400).json({ error: 'El título es requerido' })
    const slug = uuidv4().split('-')[0] + '-' + uuidv4().split('-')[0]
    const survey = await prisma.survey.create({
      data: {
        userId: req.user.id, title, description, slug,
        closesAt: closesAt ? new Date(closesAt) : null,
        questions: questions?.length ? {
          create: questions.map((q, i) => ({
            text: q.text, type: q.type,
            options: q.options || null,
            orderIndex: i
          }))
        } : undefined
      },
      include: { questions: true }
    })
    await prisma.auditLog.create({ data: { userId: req.user.id, action: 'CREATE_SURVEY', entity: survey.id } })
    res.status(201).json(survey)
  } catch { res.status(500).json({ error: 'Error al crear encuesta' }) }
}

const update = async (req, res) => {
  try {
    const survey = await prisma.survey.findFirst({ where: { id: req.params.id, userId: req.user.id } })
    if (!survey) return res.status(404).json({ error: 'Encuesta no encontrada' })
    const responseCount = await prisma.response.count({ where: { surveyId: survey.id } })
    if (responseCount > 0) return res.status(400).json({ error: 'No se puede editar una encuesta con respuestas' })
    const { title, description, closesAt, questions } = req.body
    if (questions) {
      await prisma.question.deleteMany({ where: { surveyId: survey.id } })
      await prisma.question.createMany({
        data: questions.map((q, i) => ({
          surveyId: survey.id, text: q.text, type: q.type,
          options: q.options || null, orderIndex: i
        }))
      })
    }
    const updated = await prisma.survey.update({
      where: { id: survey.id },
      data: { title, description, closesAt: closesAt ? new Date(closesAt) : null },
      include: { questions: { orderBy: { orderIndex: 'asc' } } }
    })
    res.json(updated)
  } catch { res.status(500).json({ error: 'Error al actualizar encuesta' }) }
}

const changeStatus = async (req, res) => {
  try {
    const { status } = req.body
    const valid = ['draft', 'published', 'paused', 'closed']
    if (!valid.includes(status)) return res.status(400).json({ error: 'Estado inválido' })
    const survey = await prisma.survey.findFirst({ where: { id: req.params.id, userId: req.user.id } })
    if (!survey) return res.status(404).json({ error: 'Encuesta no encontrada' })
    const updated = await prisma.survey.update({ where: { id: survey.id }, data: { status } })
    await prisma.auditLog.create({ data: { userId: req.user.id, action: `STATUS_${status.toUpperCase()}`, entity: survey.id } })
    res.json(updated)
  } catch { res.status(500).json({ error: 'Error al cambiar estado' }) }
}

const duplicate = async (req, res) => {
  try {
    const original = await prisma.survey.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { questions: true }
    })
    if (!original) return res.status(404).json({ error: 'Encuesta no encontrada' })
    const slug = uuidv4().split('-')[0] + '-' + uuidv4().split('-')[0]
    const copy = await prisma.survey.create({
      data: {
        userId: req.user.id, title: `${original.title} (copia)`,
        description: original.description, slug, status: 'draft',
        questions: { create: original.questions.map(q => ({ text: q.text, type: q.type, options: q.options, orderIndex: q.orderIndex })) }
      },
      include: { questions: true }
    })
    res.status(201).json(copy)
  } catch { res.status(500).json({ error: 'Error al duplicar encuesta' }) }
}

const remove = async (req, res) => {
  try {
    const survey = await prisma.survey.findFirst({ where: { id: req.params.id, userId: req.user.id } })
    if (!survey) return res.status(404).json({ error: 'Encuesta no encontrada' })
    await prisma.response.deleteMany({ where: { surveyId: survey.id } })
    await prisma.survey.delete({ where: { id: survey.id } })
    res.json({ message: 'Encuesta eliminada' })
  } catch { res.status(500).json({ error: 'Error al eliminar encuesta' }) }
}

module.exports = { getAll, getOne, getBySlug, create, update, changeStatus, duplicate, remove }
