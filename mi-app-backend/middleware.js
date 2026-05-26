const jwt = require('jsonwebtoken');
const { User } = require('./models');

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Acceso no autorizado: Token no provisto' });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET || 'prodemundial2026secretkey123!', async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Sesión expirada o token inválido' });
    }

    try {
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
      req.user = user;
      next();
    } catch (error) {
      return res.status(500).json({ message: 'Error de servidor en autenticación' });
    }
  });
};

const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: 'Acceso denegado: Se requiere rol de Administrador' });
  }
  next();
};

const requireApproved = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Acceso no autorizado' });
  }
  if (!req.user.isAdmin && req.user.status !== 'approved') {
    return res.status(403).json({ message: 'Acceso denegado: Tu cuenta aún no ha sido aprobada' });
  }
  next();
};

module.exports = {
  authenticateJWT,
  requireAdmin,
  requireApproved
};
