import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Salva na pasta src/uploads (que é ../uploads em relação a src/middlewares)
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    // Nome do arquivo: timestamp + nome original limpo
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  }
});

// No explicit file size limit here — allow the app or storage layer to enforce limits.
export const uploadMiddleware = multer({
  storage,
  limits: { filesSize: 20 * 1024 * 1024 } 
});