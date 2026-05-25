const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const prisma = new PrismaClient()

const register = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ error: 'Email y contraseña son requeridos' })
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return res.status(400).json({ error: 'El email ya está registrado' })
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { email, passwordHash } })
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN })
    res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } })
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar usuario' })
  }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive)
      return res.status(401).json({ error: 'Credenciales inválidas' })
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' })
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN })
    await prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN', entity: 'user' } })
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } })
  } catch (err) {
    res.status(500).json({ error: 'Error al iniciar sesión' })
  }
}

const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, email: true, role: true, createdAt: true } })
    res.json(user)
  } catch {
    res.status(500).json({ error: 'Error al obtener usuario' })
  }
}

module.exports = { register, login, me }
