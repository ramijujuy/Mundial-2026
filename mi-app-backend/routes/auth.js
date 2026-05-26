const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, championshipId } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    if (username.length < 3) {
      return res.status(400).json({ message: 'El usuario debe tener al menos 3 caracteres' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'El nombre de usuario ya está registrado' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if the username matches the configured Admin Username
    const envAdminUser = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
    const isAdmin = username.toLowerCase() === envAdminUser;
    const status = isAdmin ? 'approved' : 'pending';

    if (!isAdmin && !championshipId) {
      return res.status(400).json({ message: 'Debes seleccionar un campeonato para registrarte' });
    }

    const newUser = new User({
      username: username.toLowerCase(),
      password: hashedPassword,
      isAdmin,
      status,
      championshipId: isAdmin ? null : championshipId
    });

    await newUser.save();

    res.status(201).json({
      message: isAdmin 
        ? 'Administrador registrado con éxito' 
        : 'Registro exitoso. Esperando aprobación del administrador.',
      status: newUser.status
    });

  } catch (error) {
    console.error('Error in register:', error);
    res.status(500).json({ message: 'Error al registrar el usuario' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username, isAdmin: user.isAdmin },
      process.env.JWT_SECRET || 'prodemundial2026secretkey123!',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        isAdmin: user.isAdmin,
        status: user.status,
        championshipId: user.championshipId
      }
    });

  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ message: 'Error de inicio de sesión' });
  }
});

module.exports = router;
