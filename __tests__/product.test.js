import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import productRoutes from '../routes/product.routes.js';
import Product from '../models/product.model.js';

const app = express();
app.use(express.json());
app.use('/api', productRoutes);


beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI + '-test';
    await mongoose.connect(mongoUri);
});

beforeEach(async () => {
    await Product.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe('Product API', () => {

    /* Test Suite for CSV Upload & Validation (POST /api/upload) */
    describe('POST /api/upload', () => {

        it('should return 400 if no file is uploaded', async () => {
            const res = await request(app).post('/api/upload');
            expect(res.statusCode).toEqual(400);
            expect(res.body.message).toContain('No file found');
        });

        it('should correctly parse a valid CSV and store product data', async () => {
            const validCsv = `sku,name,brand,color,size,mrp,price,quantity
            TSHIRT-RED-M-001,T-Shirt,CoolBrand,Red,M,800,500,10
            JEANS-BLU-32-002,Jeans,DenimCo,Blue,32,2000,1500,5`;

            const res = await request(app)
                .post('/api/upload')
                .attach('file', Buffer.from(validCsv), 'sample.csv');

            expect(res.statusCode).toEqual(201);
            expect(res.body.stored).toEqual(2);
            expect(res.body.failed).toEqual(0);

            const productCount = await Product.countDocuments();
            expect(productCount).toBe(2);
        });

        it('should identify and reject rows with failed validation', async () => {
            const invalidCsv = `sku,name,brand,color,size,mrp,price,quantity
            VALID-001,Valid Product,BrandA,Red,S,1000,800,10
            INVALID-PRICE-002,Invalid Price,BrandB,Blue,M,1000,1200,5
            INVALID-QTY-003,Invalid Qty,BrandC,Green,L,1500,1200,-1
            MISSING-SKU,,Missing SKU,BrandD,XL,2000,1500,8
            MISSING-MRP,Missing MRP,BrandE,Black,S,,1000,3
            INVALID-NUM,Invalid Number,BrandF,Yellow,M,1000,not-a-price,5`;

            const res = await request(app)
                .post('/api/upload')
                .attach('file', Buffer.from(invalidCsv), 'sample.csv');

            expect(res.statusCode).toEqual(201);
            expect(res.body.stored).toEqual(1);
            expect(res.body.failed).toEqual(5);

            const failedDetails = res.body.failedDetails;
            expect(failedDetails.some(d => d.reason === 'Price cannot be greater than MRP.')).toBe(true);
            expect(failedDetails.some(d => d.reason === "Quantity can't be negative.")).toBe(true);
            expect(failedDetails.some(d => d.reason === 'Invalid number format for MRP, Price, or Quantity.')).toBe(true);
            expect(failedDetails.filter(d => d.reason === 'Missing required fields.').length).toBe(2);

            const product = await Product.findOne({ sku: 'VALID-001' });
            expect(product).not.toBeNull();
            const invalidProduct = await Product.findOne({ sku: 'INVALID-PRICE-002' });
            expect(invalidProduct).toBeNull();
        });
    });


    /* Test Suite for Listing Products (GET /api/products) */
    describe('GET /api/products', () => {
        beforeEach(async () => {
            const products = [];
            for (let i = 1; i <= 15; i++) {
                products.push({
                    sku: `SKU-${i}`,
                    name: `Product ${i}`,
                    brand: 'TestBrand',
                    mrp: 100,
                    price: 80,
                    quantity: 10
                });
            }
            await Product.insertMany(products);
        });

        it('should return the first page with default limit (10)', async () => {
            const res = await request(app).get('/api/products');
            expect(res.statusCode).toEqual(200);
            expect(res.body.totalProducts).toBe(15);
            expect(res.body.totalPages).toBe(2);
            expect(res.body.currentPage).toBe(1);
            expect(res.body.products.length).toBe(10);
        });

        it('should return the second page with a custom limit', async () => {
            const res = await request(app).get('/api/products?page=2&limit=5');
            expect(res.statusCode).toEqual(200);
            expect(res.body.totalProducts).toBe(15);
            expect(res.body.totalPages).toBe(3);
            expect(res.body.currentPage).toBe(2);
            expect(res.body.products.length).toBe(5);
            expect(res.body.products[0].sku).toBe('SKU-6');
        });

        it('should return an empty array if the database is empty', async () => {
            await Product.deleteMany({});
            const res = await request(app).get('/api/products');
            expect(res.statusCode).toEqual(200);
            expect(res.body.totalProducts).toBe(0);
            expect(res.body.products.length).toBe(0);
        });
    });


    /* Test Suite for Search and Filter (GET /api/products/search) */
    describe('GET /api/products/search', () => {
        beforeEach(async () => {
            const products = [
                { sku: 'A-001', name: 'Red T-Shirt', brand: 'StreamThreads', color: 'Red', price: 500, mrp: 800, quantity: 10 },
                { sku: 'B-002', name: 'Blue Jeans', brand: 'DenimWorks', color: 'Blue', price: 1500, mrp: 2000, quantity: 5 },
                { sku: 'C-003', name: 'Green Polo', brand: 'StreamThreads', color: 'Green', price: 1200, mrp: 1500, quantity: 8 },
                { sku: 'D-004', name: 'Black Jacket', brand: 'UrbanEdge', color: 'Black', price: 3000, mrp: 4000, quantity: 3 },
                { sku: 'E-005', name: 'Red Sneakers', brand: 'UrbanEdge', color: 'Red', price: 2500, mrp: 3000, quantity: 7 },
            ];
            await Product.insertMany(products);
        });

        it('should filter products by brand (case-insensitive)', async () => {
            const res = await request(app).get('/api/products/search?brand=streamthreads');
            expect(res.statusCode).toEqual(200);
            expect(res.body.length).toBe(2);
            expect(res.body[0].brand).toBe('StreamThreads');
        });

        it('should filter products by name (case-insensitive)', async () => {
            const res = await request(app).get('/api/products/search?name=jeans');
            expect(res.statusCode).toEqual(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0].name).toBe('Blue Jeans');
        });

        it('should filter products by color', async () => {
            const res = await request(app).get('/api/products/search?color=Red');
            expect(res.statusCode).toEqual(200);
            expect(res.body.length).toBe(2);
            expect(res.body[0].sku).toBe('A-001');
            expect(res.body[1].sku).toBe('E-005');
        });

        it('should filter products by minimum price', async () => {
            const res = await request(app).get('/api/products/search?minPrice=2000');
            expect(res.statusCode).toEqual(200);
            expect(res.body.length).toBe(2);
            expect(res.body.every(p => p.price >= 2000)).toBe(true);
        });

        it('should filter by name, brand, color, and price combined', async () => {
            const res = await request(app).get('/api/products/search?name=red sneakers&brand=UrbanEdge&color=Red&minPrice=2000');
            expect(res.statusCode).toEqual(200);
            expect(res.body.length).toBe(1);
            expect(res.body[0].sku).toBe('E-005');
        });

        it('should return a 404 if no products match the criteria', async () => {
            const res = await request(app).get('/api/products/search?brand=NonExistentBrand');
            expect(res.statusCode).toEqual(404);
            expect(res.body.message).toContain('No products found');
        });
    });
});