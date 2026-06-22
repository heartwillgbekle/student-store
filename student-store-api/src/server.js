const express = require('express');
const productController = require('../controllers/productController');
const orderController = require('../controllers/orderController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the Student Store API',
    });
});

app.get('/products', productController.listProducts);
app.get('/products/:id', productController.getProduct);
app.post('/products', productController.createProduct);
app.put('/products/:id', productController.updateProduct);
app.delete('/products/:id', productController.deleteProduct);

app.get('/orders', orderController.listOrders);
app.get('/orders/:id', orderController.getOrder);
app.post('/orders', orderController.createOrder);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
