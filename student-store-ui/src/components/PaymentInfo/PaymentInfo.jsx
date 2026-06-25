import "./PaymentInfo.css"

export default function PaymentInfo({ userInfo, setUserInfo, handleOnCheckout, isCheckingOut, error }) {
  return (
    <div className="PaymentInfo">
      <h3>
        Payment Info
        <i className="material-icons">monetization_on</i>
      </h3>

      <div className="input-field">
        <label className="label">Name</label>
        <div className="control">
          <input
            type="text"
            placeholder="Your full name"
            value={userInfo.name}
            onChange={(e) => setUserInfo((u) => ({ ...u, name: e.target.value }))}
          />
        </div>
      </div>

      <p className="is-danger">{error}</p>

      <button disabled={isCheckingOut} onClick={handleOnCheckout}>
        {isCheckingOut ? "Processing…" : "Proceed to Checkout"}
      </button>
    </div>
  )
}
