const express = require('express');
const service = require('../services/authService');
const router = express.Router();
router.post('/register', async (req,res,next) => { try { return res.status(201).json(await service.register(req.body)); } catch(e) { next(e); } });
router.post('/login', async (req,res,next) => { try { return res.status(200).json(await service.login(req.body)); } catch(e) { next(e); } });
module.exports = router;
