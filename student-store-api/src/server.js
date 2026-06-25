require('dotenv').config();

const express = require('express');
const productController = require('../controllers/productController');
const orderController = require('../controllers/orderController');
const orderItemController = require('../controllers/orderItemController');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Student Store API' });
});

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

// Order Items
const {listOrderItems, addItemToOrder} = orderItemController;
app.get('/order-items', listOrderItems);
app.post('/orders/:order_id/items', addItemToOrder);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
