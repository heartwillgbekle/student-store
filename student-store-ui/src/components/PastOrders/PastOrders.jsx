import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import axios from "axios"
import { formatPrice, formatDate } from "../../utils/format"
import "./PastOrders.css"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export default function PastOrders() {
  const [orders, setOrders] = useState([])
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const run = async () => {
      setIsFetching(true)
      try {
        const res = await axios.get(`${API_BASE_URL}/orders`)
        setOrders(res.data.orders)
        setError(null)
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load past orders")
      } finally {
        setIsFetching(false)
      }
    }
    run()
  }, [])

  return (
    <div className="PastOrders">
      <div className="content">
        <div className="header">
          <h2>Past Orders</h2>
          <span className="count">{orders.length} order{orders.length === 1 ? "" : "s"}</span>
        </div>

        {error && <p className="error">{error}</p>}

        {isFetching ? (
          <p className="muted">Loading orders…</p>
        ) : orders.length === 0 ? (
          <p className="muted">No orders yet. Place one from the cart to see it here.</p>
        ) : (
          <ul className="order-list">
            <li className="order-row order-head">
              <span>Order</span>
              <span>Date</span>
              <span>Customer</span>
              <span className="status-col">Status</span>
              <span className="total-col">Total</span>
            </li>
            {orders.map((order) => (
              <li key={order.id} className="order-row">
                <Link to={`/orders/${order.id}`} className="order-id">#{order.id}</Link>
                <span>{formatDate(order.createdAt)}</span>
                <span>{order.customer}</span>
                <span className={`status status-${order.status}`}>{order.status}</span>
                <span className="total-col">{formatPrice(order.totalPrice)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
