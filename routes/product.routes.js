import express from 'express';
import multer from 'multer';
import {
    uploadProducts,
    getAllProducts,
    filterProducts,
} from '../controllers/product.controller.js';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });


/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a CSV file to add/update products
 *     tags: [Product API service]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The CSV file to upload.
 *     responses:
 *       '201':
 *         description: CSV processed successfully. Returns a summary of the operation.
 *       '400':
 *         description: Bad Request. Either no file was uploaded, or the file type was not .csv.
 */
router.post('/upload', upload.single('file'), uploadProducts);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Retrieve a paginated list of all products
 *     tags: [Product API service]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: The page number to retrieve.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: The number of products to return per page.
 *     responses:
 *       '200':
 *         description: A paginated list of products.
 */
router.get('/products', getAllProducts);

/**
 * @swagger
 * /api/products/search:
 *   get:
 *     summary: Search for products based on filter criteria
 *     tags: [Product API service]
 *     parameters:
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand name (case-insensitive).
 *       - in: query
 *         name: color
 *         schema:
 *           type: string
 *         description: Filter by color (case-insensitive).
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: The minimum price of products to return.
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: The maximum price of products to return.
 *     responses:
 *       '200':
 *         description: A list of products matching the filter criteria.
 *       '404':
 *         description: No products were found matching the criteria.
 */
router.get('/products/search', filterProducts);

export default router;