const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(users)
  } catch { res.status(500).json({ error: 'Error al obtener usuarios' }) }
}

const toggleUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
    const updated = await prisma.user.update({
      where: { id: user.id }, data: { isActive: !user.isActive }
    })
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: updated.isActive ? 'ACTIVATE_USER' : 'SUSPEND_USER', entity: user.id }
    })
    res.json({ id: updated.id, isActive: updated.isActive })
  } catch { res.status(500).json({ error: 'Error al actualizar usuario' }) }
}

const getAllSurveys = async (req, res) => {
  try {
    const surveys = await prisma.survey.findMany({
      include: { user: { select: { email: true } }, _count: { select: { responses: true } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json(surveys)
  } catch { res.status(500).json({ error: 'Error al obtener encuestas' }) }
}

const getAuditLog = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
    res.json(logs)
  } catch { res.status(500).json({ error: 'Error al obtener logs' }) }
}

module.exports = { getUsers, toggleUser, getAllSurveys, getAuditLog }
