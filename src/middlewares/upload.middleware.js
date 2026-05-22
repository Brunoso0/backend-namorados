import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Aponta para a pasta uploads na raiz do projeto
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Gera um hash aleatório para o nome do arquivo
    const hash = crypto.randomBytes(10).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${hash}${ext}`);
  }
});

export const uploadMiddleware = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Limite de 5MB por foto
});