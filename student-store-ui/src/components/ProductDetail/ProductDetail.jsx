import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import NotFound from "../NotFound/NotFound";
import { formatPrice } from "../../utils/format";
import "./ProductDetail.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function ProductDetail({ addToCart, removeFromCart, getQuantityOfItemInCart }) {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const run = async () => {
      setIsFetching(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/products/${productId}`);
        setProduct(res.data.product);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load product");
      } finally {
        setIsFetching(false);
      }
    };
    run();
  }, [productId]);

  if (error) return <NotFound />;
  if (isFetching || !product) {
    return <div className="ProductDetail"><div className="loading">Loading…</div></div>;
  }

  const quantity = getQuantityOfItemInCart(product);

  return (
    <div className="ProductDetail">
      <div className="product-card">
        <div className="media">
          <img src={product.image_url || "/placeholder.png"} alt={product.name} />
        </div>
        <div className="product-info">
          <p className="category-eyebrow">{product.category}</p>
          <h1 className="product-name">{product.name}</h1>
          <p className="product-price">{formatPrice(product.price)}</p>
          <p className="description">{product.description}</p>

          <div className="actions">
            <button className="btn-add" onClick={() => addToCart(product)}>
              Add to Bag
            </button>
            {quantity > 0 && (
              <>
                <button className="btn-remove" onClick={() => removeFromCart(product)}>
                  Remove from Bag
                </button>
                <span className="quantity">In bag: {quantity}</span>
              </>
            )}
          </div>

          <Link to="/" className="back-link">← Back to all products</Link>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
