import express from 'express';
import multer from 'multer';
import {
    uploadProducts,
    getAllProducts,
    filterProducts,
} from '../controllers/product.controller.js';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('file'), uploadProducts);
router.get('/products', getAllProducts);
router.get('/products/search', filterProducts);

export default router;