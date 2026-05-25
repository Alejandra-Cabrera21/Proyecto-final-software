const router = require('express').Router()
const { submit } = require('../controllers/response.controller')
router.post('/:slug', submit)
module.exports = router
