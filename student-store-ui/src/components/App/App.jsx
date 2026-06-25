import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import axios from "axios";
import SubNavbar from "../SubNavbar/SubNavbar";
import Sidebar from "../Sidebar/Sidebar";
import Home from "../Home/Home";
import ProductDetail from "../ProductDetail/ProductDetail";
import NotFound from "../NotFound/NotFound";
import { removeFromCart, addToCart, getQuantityOfItemInCart, getTotalItemsInCart } from "../../utils/cart";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Header({ toggleSidebar, cartCount }) {
  return (
    <header className="header">
      <div className="container">
        <Link to="/" className="brand">Student Store</Link>
        <div className="spacer" />
        <button className="icon-btn" onClick={toggleSidebar} aria-label="Open bag">
          <i className="material-icons">shopping_bag</i>
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>
      </div>
    </header>
  );
}

function HomeChrome({ children }) {
  const location = useLocation();
  const onHome = location.pathname === "/";
  if (!onHome) return children;
  return (
    <>
      <section className="hero">
        <img
          className="hero-img"
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&h=900&fit=crop&auto=format"
          alt="Student store hero"
        />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-eyebrow">Campus Essentials</p>
          <h1 className="hero-title">The Student<br />Store</h1>
          <p className="hero-sub">
            Apparel, books, snacks, and supplies — everything you need to get through the semester, delivered to your dorm.
          </p>
          <div className="hero-actions">
            <a href="#Buy" className="btn btn-light">Shop Now</a>
            <a href="#about" className="btn btn-outline-light">Our Story</a>
          </div>
        </div>
      </section>
      {children}
      <section className="editorial" id="about">
        <div className="editorial-inner">
          <div>
            <p className="editorial-eyebrow">The Story</p>
            <h2 className="editorial-title">Made for<br />campus life</h2>
            <p className="editorial-body">
              We stock the things students actually reach for — comfortable basics, exam-week snacks, and the textbooks you'd otherwise forget. Curated, fairly priced, and ready when you are.
            </p>
            <a href="#Buy" className="editorial-link">Shop the catalog →</a>
          </div>
          <div className="editorial-image">
            <img
              src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&h=600&fit=crop&auto=format"
              alt="Editorial still life"
            />
          </div>
        </div>
      </section>
    </>
  );
}

function Footer() {
  const cols = [
    { title: "Shop", links: ["Apparel", "Books", "Snacks", "Supplies", "Accessories"] },
    { title: "Help", links: ["Shipping & Returns", "Contact Us", "FAQ"] },
    { title: "Company", links: ["Our Story", "Sustainability", "Careers"] },
  ];
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <span className="footer-brand">Student Store</span>
          <p className="footer-tag">Considered goods for considered students.</p>
        </div>
        {cols.map(({ title, links }) => (
          <div key={title} className="footer-col">
            <h4>{title}</h4>
            <ul>
              {links.map((l) => (
                <li key={l}><a href="#">{l}</a></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="footer-legal">
        <p>© 2026 Student Store. All rights reserved.</p>
        <p>Crafted with intention.</p>
      </div>
    </footer>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All Categories");
  const [searchInputValue, setSearchInputValue] = useState("");
  const [userInfo, setUserInfo] = useState({ name: "" });
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [isFetching, setIsFetching] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);

  const toggleSidebar = () => setSidebarOpen((isOpen) => !isOpen);
  const handleOnRemoveFromCart = (item) => setCart(removeFromCart(cart, item));
  const handleOnAddToCart = (item) => setCart(addToCart(cart, item));
  const handleGetItemQuantity = (item) => getQuantityOfItemInCart(cart, item);
  const handleGetTotalCartItems = () => getTotalItemsInCart(cart);
  const handleOnSearchInputChange = (event) => setSearchInputValue(event.target.value);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsFetching(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/products`);
        setProducts(res.data.products);
        setError(null);
      } catch (err) {
        setError("Failed to load products");
      } finally {
        setIsFetching(false);
      }
    };
    fetchProducts();
  }, []);

  const handleOnCheckout = async () => {
    const customer = userInfo.name.trim();
    if (!customer) {
      setError("Please enter your name before checking out");
      return;
    }
    const items = Object.entries(cart)
      .filter(([, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({
        productId: Number(productId),
        quantity,
      }));
    if (items.length === 0) {
      setError("Your cart is empty");
      return;
    }

    setIsCheckingOut(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/orders`, { customer, items });
      setOrder(res.data.order);
      setCart({});
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || "Checkout failed");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const cartCount = handleGetTotalCartItems();

  return (
    <div className="App">
      <BrowserRouter>
        <div className="announcement-bar">
          Complimentary dorm delivery on orders over $50 &nbsp;·&nbsp; Use code STUDENT15 for 15% off
        </div>
        <Header toggleSidebar={toggleSidebar} cartCount={cartCount} />
        <Sidebar
          cart={cart}
          error={error}
          userInfo={userInfo}
          setUserInfo={setUserInfo}
          isOpen={sidebarOpen}
          products={products}
          toggleSidebar={toggleSidebar}
          isCheckingOut={isCheckingOut}
          addToCart={handleOnAddToCart}
          removeFromCart={handleOnRemoveFromCart}
          getQuantityOfItemInCart={handleGetItemQuantity}
          getTotalItemsInCart={handleGetTotalCartItems}
          handleOnCheckout={handleOnCheckout}
          order={order}
          setOrder={setOrder}
        />
        <main>
          <HomeChrome>
            <SubNavbar
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              searchInputValue={searchInputValue}
              handleOnSearchInputChange={handleOnSearchInputChange}
            />
            <Routes>
              <Route
                path="/"
                element={
                  <Home
                    error={error}
                    products={products}
                    isFetching={isFetching}
                    activeCategory={activeCategory}
                    setActiveCategory={setActiveCategory}
                    addToCart={handleOnAddToCart}
                    searchInputValue={searchInputValue}
                    removeFromCart={handleOnRemoveFromCart}
                    getQuantityOfItemInCart={handleGetItemQuantity}
                  />
                }
              />
              <Route
                path="/:productId"
                element={
                  <ProductDetail
                    cart={cart}
                    error={error}
                    products={products}
                    addToCart={handleOnAddToCart}
                    removeFromCart={handleOnRemoveFromCart}
                    getQuantityOfItemInCart={handleGetItemQuantity}
                  />
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HomeChrome>
        </main>
        <Footer />
      </BrowserRouter>
    </div>
  );
}

export default App;
