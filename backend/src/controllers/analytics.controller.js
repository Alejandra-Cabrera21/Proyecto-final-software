const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const getSummary = async (req, res) => {
  try {
    const survey = await prisma.survey.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { questions: { include: { answers: true } }, responses: true }
    })
    if (!survey) return res.status(404).json({ error: 'Encuesta no encontrada' })

    const totalResponses = survey.responses.length
    const complete = survey.responses.filter(r => r.isComplete).length
    const completionRate = totalResponses > 0 ? Math.round((complete / totalResponses) * 100) : 0

    const questionStats = survey.questions.map(q => {
      const answers = q.answers.map(a => a.value)
      if (q.type === 'multiple_choice' || q.type === 'likert') {
        const counts = {}
        answers.forEach(v => { counts[v] = (counts[v] || 0) + 1 })
        return { questionId: q.id, text: q.text, type: q.type, total: answers.length, counts }
      }
      return { questionId: q.id, text: q.text, type: q.type, total: answers.length, answers }
    })

    res.json({ totalResponses, completionRate, questionStats })
  } catch { res.status(500).json({ error: 'Error al obtener analytics' }) }
}

module.exports = { getSummary }
