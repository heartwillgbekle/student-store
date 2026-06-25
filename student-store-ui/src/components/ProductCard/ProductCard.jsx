import { Link } from "react-router-dom"
import codepath from "../../assets/codepath.svg"
import { formatPrice } from "../../utils/format"
import "./ProductCard.css"

function ProductCard({ product, quantity, addToCart, removeFromCart }) {
  return (
    <div className="ProductCard">
      <div className="media">
        <Link to={`/${product.id}`}>
          {product.image_url
            ? <img src={product.image_url} alt={product.name} />
            : <img src={codepath} alt="product cover" />}
        </Link>
        {quantity > 0 && <span className="quantity-pill">{quantity}</span>}
        <button className="add-overlay" onClick={addToCart}>Add to Bag</button>
      </div>

      {product.category && <p className="category-eyebrow">{product.category}</p>}
      <p className="product-name">{product.name}</p>
      <p className="product-price">{formatPrice(product.price)}</p>

      <div className="row">
        <button className="btn-step" onClick={addToCart} aria-label="Add one">
          <i className="material-icons">add</i>
        </button>
        <button className="btn-step" onClick={removeFromCart} aria-label="Remove one" disabled={!quantity}>
          <i className="material-icons">remove</i>
        </button>
        {quantity > 0 && <span className="qty-label">In bag: {quantity}</span>}
      </div>
    </div>
  )
}

export default ProductCard;
