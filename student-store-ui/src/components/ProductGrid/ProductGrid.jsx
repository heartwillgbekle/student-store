import ProductCard from "../ProductCard/ProductCard"
import "./ProductGrid.css"

function ProductGrid({ addToCart, removeFromCart, getQuantityOfItemInCart, products = [], activeCategory }) {
  const title = !activeCategory || activeCategory === "All Categories" ? "All Products" : activeCategory

  return (
    <div id="Buy" className="ProductGrid">
      <div className="content">
        <div className="grid-header">
          <h2 className="grid-title">{title}</h2>
          <span className="grid-count">{products.length} item{products.length === 1 ? "" : "s"}</span>
        </div>

        <div className="grid">
          {!products?.length ? (
            <div className="empty">
              <p>No products available</p>
            </div>
          ) : products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantity={getQuantityOfItemInCart(product)}
              addToCart={() => addToCart(product)}
              removeFromCart={() => removeFromCart(product)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default ProductGrid;
