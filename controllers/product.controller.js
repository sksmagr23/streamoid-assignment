import csv from 'csv-parser';
import { Readable } from 'stream';
import Product from '../models/product.model.js';

export const uploadProducts = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file found. Please upload a CSV file.' });
    }

    const validProducts = [];
    const failedValidation = [];
    let rowCount = 0;

    const stream = Readable.from(req.file.buffer.toString());

    stream
        .pipe(csv())
        .on('data', (row) => {
            rowCount++;
            const { sku, name, brand, mrp, price, quantity } = row;

            if (!sku || !name || !brand || !mrp || !price) {
                failedValidation.push({ row: rowCount, data: row, reason: 'Missing required fields.' });
                return;
            }

            const parsedMrp = parseFloat(mrp);
            const parsedPrice = parseFloat(price);
            const parsedQuantity = parseInt(quantity || 0, 10);

            if (isNaN(parsedMrp) || isNaN(parsedPrice) || isNaN(parsedQuantity)) {
                failedValidation.push({ row: rowCount, data: row, reason: 'Invalid number format for MRP, Price, or Quantity.' });
                return;
            }

            if (parsedPrice > parsedMrp) {
                failedValidation.push({ row: rowCount, data: row, reason: 'Price cannot be greater than MRP.' });
                return;
            }

            if (parsedQuantity < 0) {
                failedValidation.push({ row: rowCount, data: row, reason: 'Quantity can\'t be negative.' });
                return;
            }

            validProducts.push({
                ...row,
                mrp: parsedMrp,
                price: parsedPrice,
                quantity: parsedQuantity,
            });
        })
        .on('end', async () => {
            try {
                if (validProducts.length > 0) {
                    const operations = validProducts.map(product => ({
                        updateOne: {
                            filter: { sku: product.sku },
                            update: { $set: product },
                            upsert: true,
                        }
                    }));
                    await Product.bulkWrite(operations);
                }
                res.status(201).json({
                    message: 'CSV data processed successfully.',
                    stored: validProducts.length,
                    failed: failedValidation.length,
                    failedDetails: failedValidation,
                });
            } catch (error) {
                res.status(500).json({ message: 'Error storing Product Details in the database.', error: error.message });
            }
        })
        .on('error', (error) => {
            res.status(500).json({ message: 'Error in parsing CSV file.', error: error.message });
        });
};


export const getAllProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const products = await Product.find({}).skip(skip).limit(limit);
        const totalProducts = await Product.countDocuments();

        res.status(200).json({
            totalProducts,
            totalPages: Math.ceil(totalProducts / limit),
            currentPage: page,
            products,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products.', error: error.message });
    }
};

export const filterProducts = async (req, res) => {
    try {
        const { name, brand, color, minPrice, maxPrice } = req.query;
        const filter = {};

        if (name) {
            filter.name = { $regex: name, $options: 'i' };
        }

        if (brand) {
            filter.brand = { $regex: brand, $options: 'i' };
        }

        if (color) {
            filter.color = { $regex: color, $options: 'i' };
        }

        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) {
                filter.price.$gte = parseFloat(minPrice);
            }
            if (maxPrice) {
                filter.price.$lte = parseFloat(maxPrice);
            }
        }

        const products = await Product.find(filter);

        if (products.length === 0) {
            return res.status(404).json({ message: 'No products found matching required criteria.' });
        }

        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products.', error: error.message });
    }
};