import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import connectDB from './config/mongo.js';
import productRoutes from './routes/product.routes.js';

connectDB();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', productRoutes);

app.get('/', (req, res) => {
    res.send('Product Record Service is running.');
});

const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});