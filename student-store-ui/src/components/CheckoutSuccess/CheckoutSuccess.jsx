import { formatPrice, formatDate } from "../../utils/format"
import "./CheckoutSuccess.css"

const CheckoutSuccess = ({ order, setOrder }) => {
  const handleOnClose = () => {
    setOrder(null)
  }

  return (
    <div className="CheckoutSuccess">
      <h3>
        Checkout Info{" "}
        <span className={`icon button`}>
          <i className="material-icons md-48">fact_check</i>
        </span>
      </h3>
      {order ? (
        <div className="card">
          <header className="card-head">
            <h4 className="card-title">Receipt</h4>
          </header>
          <section className="card-body">
            <p className="header">
              Order #{order.id} for {order.customer} — {formatDate(order.createdAt)}
            </p>
            <ul className="purchase">
              {order.orderItems.map((item) => (
                <li key={item.id}>
                  {item.quantity} × Product {item.productId} @ {formatPrice(item.price)}
                  {" = "}
                  {formatPrice(item.price * item.quantity)}
                </li>
              ))}
            </ul>
            <p className="header">Total: {formatPrice(order.totalPrice)}</p>
            <p>Status: {order.status}</p>
          </section>
          <footer className="card-foot">
            <button className="button is-success" onClick={handleOnClose}>
              Shop More
            </button>
            <button className="button" onClick={handleOnClose}>
              Exit
            </button>
          </footer>
        </div>
      ) : (
        <div className="content">
          <p>
            A confirmation email will be sent to you so that you can confirm this order. Once you have confirmed the
            order, it will be delivered to your dorm room.
          </p>
        </div>
      )}
    </div>
  )
}

export default CheckoutSuccess
