import ProductGrid from "../ProductGrid/ProductGrid"
import "./Home.css"

function Home({ isFetching, products, addToCart, removeFromCart, searchInputValue, getQuantityOfItemInCart, activeCategory }) {
  const productsByCategory =
    Boolean(activeCategory) && activeCategory !== "All Categories"
      ? products.filter((p) => p.category === activeCategory)
      : products

  const productsToShow = Boolean(searchInputValue)
    ? productsByCategory.filter((p) => p.name.toLowerCase().indexOf(searchInputValue.toLowerCase()) !== -1)
    : productsByCategory

  return (
    <div className="Home">
      <ProductGrid
        products={productsToShow}
        isFetching={isFetching}
        activeCategory={activeCategory}
        addToCart={addToCart}
        removeFromCart={removeFromCart}
        getQuantityOfItemInCart={getQuantityOfItemInCart}
      />
    </div>
  )
}

export default Home;
