# Product Record Service

This is a backend service designed to manage product data for online sellers. The service allows for the bulk upload of product data via a CSV file, validates each product against a set of rules, stores valid entries in a database, and provides REST APIs to list and filter the products.

## Folder Structure

```text
streamoid-assignment/
├── __tests__/
│   └── product.test.js
├── config/
│   └── mongo.js
├── controllers/
│   └── product.controller.js
├── models/
│   └── product.model.js
├── routes/
│   └── product.routes.js
├── app.js                  # Main application file
├── Dockerfile
├── .dockerignore
├── .gitignore
├── .env.example
├── package.json
├── README.md
```

## Tech Stack

-  **Backend**: `Node.js`, `Express.js`
-  **Database**: `MongoDB` with `Mongoose` ODM for object data modeling.
-  **File Handling**: `multer` for handling multipart/form-data (file uploads) and `csv-parser` for streaming and parsing large CSV files efficiently.
-  **Testing**: `Jest` and Supertest for API integration testing.
- **Containerization**: `Docker`
---

## Project Setup Instructions

#### Prerequisites

-   **Node.js** (version 14 or later)
-   **MongoDB** installed and running locally, or a connection string to a cloud instance

### 1. Clone the Repository

```bash
git clone https://github.com/sksmagr23/streamoid-assignment.git
cd streamoid-assignment
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory of the project and add the following environment variables:

```plaintext
PORT=5000
MONGO_URI=<your-mongodb-connection-string>
```

### 4. Start the Server

```bash
npm start
```
The server will be running on `http://localhost:5000`.

---

### Running with Docker (Alternative)
We can also run this application in a Docker container for a consistent and isolated environment.

1. Build the Docker image:
```bash
docker build -t product-service .
```
2. Run the Docker container:
```bash
docker run -d -p 5000:5000 --name product-api -e PORT=5000 -e MONGO_URI="<your-mongodb-connection-string>" product-service
```
The service will be accessible at `http://localhost:5000`.

---

### Testing with Jest
- The test suite is configured to run against a separate test database to ensure development data is not affected. It automatically appends -test to our MONGO_URI connection string.
- To execute the entire test suite, run the following command from the root directory:
```bash
npm test
```
> Jest will automatically find and run the test files located in the `__tests__` directory. The output will show a summary of all passing and failing unit tests.

---

## API Documentation

1. #### **Upload Products via CSV**
   
   - Uploads a CSV file, validates each row, and stores valid products in the database. This endpoint also performs an upsert operation: if a product with the same sku(unique product code) already exists, it will be updated; otherwise, a new product will be created.
   - **Endpoint**: *`POST /api/upload`*
   - **Content-Type**: multipart/form-data
   - **Request Body**: 
     - `file`: The CSV file to be uploaded.
   - **Response**:
     - `200 OK`: It provides a summary of the operation, including the number of products successfully stored and a detailed list of any rows that failed validation.
     - `400 Bad Request`: If the file is missing or invalid.
     - `500 Internal Server Error`: If there is a server error during processing.
  
   - Example using `curl`:
     ```bash
     curl -X POST -F "file=@sample.csv" http://localhost:5000/api/upload
     ```
     Success Response(201):
     ```json
     {
        "message": "CSV data processed successfully.",
        "stored": 48,
        "failed": 2,
        "failedDetails": [
            {
                "row": 20,
                "data": {
                    "sku": "HOODIE-CRM-M-020",
                    "name": "Cozy Hoodie",
                    "brand": "SnugWear",
                    "color": "Cream",
                    "size": "M",
                    "mrp": "",
                    "price": "1699",
                    "quantity": "9"
                },
                "reason": "Missing required fields."
            },
            {
                "row": 25,
                "data": {
                    "sku": "BAG-BCKPK-BLK-025",
                    "name": "Travel Backpack",
                    "brand": "CarryCo",
                    "color": "Black",
                    "size": "OneSize",
                    "mrp": "2599",
                    "price": "2099",
                    "quantity": "-5"
                },
                "reason": "Quantity can't be negative."
            }
        ]
     } 
     ```

2. #### **List all Products**
   
   - Retrieves a paginated list of all products currently stored in the database.
   - **Endpoint**: *`GET /api/products`*
   - **Query Parameters**:
     - `page` (optional, number): The page number to retrieve (default is 1).
     - `limit` (optional, number): The number of products to return per page (default is 10).
   - **Response**:
     - `200 OK`: Returns a paginated list of products along with pagination metadata.
     - `500 Internal Server Error`: If there is a server error during processing.

   - Example using `curl`:
     ```bash
     curl "http://localhost:5000/api/products?page=1&limit=5"
     ```    
    Success Response(200):
    ```json
    {
        "totalProducts": 48,
        "totalPages": 10,
        "currentPage": 1,
        "products": [
            {
                "_id": "657c9a4d8f1e8d1a1c9b2d3a",
                "sku": "TSHIRT-RED-M-001",
                "name": "Classic Cotton T-Shirt",
                "brand": "StreamThreads",
                "color": "Red",
                "size": "M",
                "mrp": 799,
                "price": 499,
                "quantity": 50,
                "createdAt": "2023-12-15T16:59:57.940Z",
                "updatedAt": "2023-12-15T16:59:57.940Z"
            }
            // More products...
        ]
    }
    ``` 

3. #### **Search and Filter Products**

    - Searches for products based on various filter criteria. All filters are optional and can be combined.
    - **Endpoint**: *`GET /api/products/search`*
    - **Query Parameters**:
      - `brand` (optional, string): Filter by brand name (case-insensitive, supports partial matches via regex).
      - `name` (optional, string): Filter by product name (case-insensitive, supports partial matches via regex).
      - `color` (optional, string): Filter by color (case-insensitive, supports partial matches via regex).
      - `minPrice` (optional, number): Returns products with a price greater than or equal to this value.
      - `maxPrice` (optional, number): Returns products with a price less than or equal to this value.
    - **Response**:
      - `200 OK`: Returns a list of products matching the filter criteria.
      - `404 Not Found`: If no products match the filter criteria.
      - `500 Internal Server Error`: If there is a server error during processing.
    
    - Example using `curl`:
      ```bash
      curl "http://localhost:5000/api/products/search?brand=DenimWorks&maxPrice=1500"
      ```
     Success Response(200):
     ```json
     [
        {
            "_id": "657c9a4d8f1e8d1a1c9b2d3c",
            "sku": "JEANS-BLK-30-005",
            "name": "Slim Fit Jeans",
            "brand": "DenimWorks",
            "color": "Black",
            "size": "30",
            "mrp": 1999,
            "price": 1499,
            "quantity": 28,
            "createdAt": "2023-12-15T16:59:57.940Z",
            "updatedAt": "2023-12-15T16:59:57.940Z"
        }
        // More matching products...
     ]
     ```
     Not Found Response(404):
     ```json
     {
        "message": "No products found matching required criteria."
     }
     ```

---     