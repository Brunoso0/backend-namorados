import { Router } from 'express';
import { uploadMiddleware } from '../middlewares/upload.middleware.js';

const router = Router();

// Helper to run multer middleware and convert errors to JSON responses
const runUploadMiddleware = (mw) => (req, res, next) => {
  mw(req, res, (err) => {
    if (err) {
      console.error('Upload middleware error:', err);
      const status = err.name === 'MulterError' ? 400 : 500;
      return res.status(status).json({ sucesso: false, erro: err.message || 'ERRO_UPLOAD' });
    }
    next();
  });
};

// Rota genérica de upload (retorna JSON também em caso de erro do multer)
router.post('/upload', runUploadMiddleware(uploadMiddleware.any()), (req, res) => {
  try {
    const file = (req.files && req.files[0]) || req.file;
    if (!file) {
      return res.status(400).json({ sucesso: false, erro: 'ARQUIVO_NAO_ENVIADO' });
    }
    const url = `/uploads/${file.filename}`;
    return res.status(200).json({ sucesso: true, url });
  } catch (error) {
    console.error('Erro na rota de upload:', error);
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
});

export default router;
