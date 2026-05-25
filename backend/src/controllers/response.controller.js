const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const submit = async (req, res) => {
  try {
    const { slug } = req.params
    const { answers, deviceFingerprint } = req.body
    const survey = await prisma.survey.findUnique({
      where: { slug }, include: { questions: true }
    })
    if (!survey || survey.status !== 'published')
      return res.status(404).json({ error: 'Encuesta no disponible' })
    if (survey.closesAt && new Date(survey.closesAt) < new Date())
      return res.status(410).json({ error: 'Encuesta cerrada' })
    if (deviceFingerprint) {
      const existing = await prisma.response.findFirst({
        where: { surveyId: survey.id, deviceFingerprint }
      })
      if (existing) return res.status(409).json({ error: 'Ya respondiste esta encuesta' })
    }
    const response = await prisma.response.create({
      data: {
        surveyId: survey.id,
        deviceFingerprint: deviceFingerprint || null,
        isComplete: true,
        answers: {
          create: answers.map(a => ({
            questionId: a.questionId,
            value: String(a.value)
          }))
        }
      }
    })
    res.status(201).json({ message: 'Respuesta registrada correctamente', responseId: response.id })
  } catch { res.status(500).json({ error: 'Error al registrar respuesta' }) }
}

module.exports = { submit }
