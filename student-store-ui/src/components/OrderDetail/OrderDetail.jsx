import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import axios from "axios"
import { formatPrice, formatDate } from "../../utils/format"
import "./OrderDetail.css"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export default function OrderDetail() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [productsById, setProductsById] = useState({})
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const run = async () => {
      setIsFetching(true)
      try {
        const [orderRes, productsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/orders/${orderId}`),
          axios.get(`${API_BASE_URL}/products`),
        ])
        setOrder(orderRes.data.order)
        const map = {}
        for (const p of productsRes.data.products) map[p.id] = p
        setProductsById(map)
        setError(null)
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load order")
      } finally {
        setIsFetching(false)
      }
    }
    run()
  }, [orderId])

  if (isFetching) {
    return (
      <div className="OrderDetail">
        <div className="content">
          <p className="muted">Loading order…</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="OrderDetail">
        <div className="content">
          <p className="error">{error || "Order not found"}</p>
          <Link to="/orders" className="back-link">← Back to past orders</Link>
        </div>
      </div>
    )
  }

  const itemsSubtotal = order.orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  return (
    <div className="OrderDetail">
      <div className="content">
        <Link to="/orders" className="back-link">← Back to past orders</Link>

        <header className="head">
          <div>
            <p className="eyebrow">Order #{order.id}</p>
            <h1>{order.customer}</h1>
            <p className="meta">
              Placed {formatDate(order.createdAt)} · <span className={`status status-${order.status}`}>{order.status}</span>
            </p>
          </div>
          <div className="head-total">
            <p className="total-label">Total</p>
            <p className="total-amount">{formatPrice(order.totalPrice)}</p>
          </div>
        </header>

        <section className="items-card">
          <div className="items-head">
            <h2>Items</h2>
            <span className="items-count">
              {order.orderItems.length} line{order.orderItems.length === 1 ? "" : "s"}
            </span>
          </div>

          <ul className="items">
            <li className="items-row items-row-head">
              <span>Product</span>
              <span className="center">Qty</span>
              <span className="right">Unit</span>
              <span className="right">Line total</span>
            </li>
            {order.orderItems.map((item) => {
              const product = productsById[item.productId]
              return (
                <li key={item.id} className="items-row">
                  <span>{product ? product.name : `Product #${item.productId} (removed)`}</span>
                  <span className="center">{item.quantity}</span>
                  <span className="right">{formatPrice(item.price)}</span>
                  <span className="right strong">{formatPrice(item.price * item.quantity)}</span>
                </li>
              )
            })}
          </ul>

          <div className="totals">
            <div className="totals-row">
              <span>Items subtotal</span>
              <span>{formatPrice(itemsSubtotal)}</span>
            </div>
            <div className="totals-row totals-grand">
              <span>Order total</span>
              <span>{formatPrice(order.totalPrice)}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
