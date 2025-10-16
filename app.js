import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import connectDB from './config/mongo.js';
import productRoutes from './routes/product.routes.js';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

connectDB();

const app = express();

const PORT = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Product Service API',
      version: '1.0.0',
      description: 'API to manage product data',
    },
    servers: [{ url: `http://localhost:${PORT}` }],
  },
  apis: ['./routes/*.js'],
};
const specs = swaggerJSDoc(options);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use('/api', productRoutes);

app.get('/', (req, res) => {
    res.send('Product API Service is running.');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});