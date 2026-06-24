const express = require('express');
const productController = require('../controllers/productController');
const orderController = require('../controllers/orderController');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Products
const {listProducts, getProduct, createProduct, updateProduct, deleteProduct} = productController;
app.get('/products', listProducts);
app.get('/products/:id', getProduct);
app.post('/products', createProduct);
app.put('/products/:id', updateProduct);
app.delete('/products/:id', deleteProduct);

// Orders
const {listOrders, getOrder, createOrder, updateOrder, deleteOrder} = orderController;
app.get('/orders', listOrders);
app.get('/orders/:id', getOrder);
app.post('/orders', createOrder);
app.put('/orders/:id', updateOrder);
app.delete('/orders/:id', deleteOrder);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
