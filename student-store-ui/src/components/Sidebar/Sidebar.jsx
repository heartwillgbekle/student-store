import ShoppingCart from "../ShoppingCart/ShoppingCart"
import "./Sidebar.css"

function Sidebar({
  cart,
  isOpen,
  products,
  userInfo,
  setUserInfo,
  toggleSidebar,
  handleOnCheckout,
  isCheckingOut,
  order,
  setOrder,
  error,
  getTotalItemsInCart,
}) {
  const count = getTotalItemsInCart ? getTotalItemsInCart() : 0;

  return (
    <section className={`Sidebar ${isOpen ? "open" : "closed"}`} aria-hidden={!isOpen}>
      <div className="overlay" onClick={toggleSidebar} />
      <aside className="drawer">
        <div className="drawer-head">
          <h2>Your Bag{count ? ` (${count})` : ""}</h2>
          <button className="close-btn" onClick={toggleSidebar} aria-label="Close bag">
            <i className="material-icons">close</i>
          </button>
        </div>

        <div className="drawer-body">
          <ShoppingCart
            isOpen={isOpen}
            cart={cart}
            products={products}
            toggleSidebar={toggleSidebar}
            userInfo={userInfo}
            setUserInfo={setUserInfo}
            handleOnCheckout={handleOnCheckout}
            isCheckingOut={isCheckingOut}
            error={error}
            order={order}
            setOrder={setOrder}
          />
        </div>
      </aside>
    </section>
  )
}

export default Sidebar;
