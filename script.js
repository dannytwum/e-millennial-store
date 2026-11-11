/* =====================================================
   E-MILLENNIAL STORE - script.js
   Read it top to bottom: data -> helpers -> cart logic
   -> modals -> form validation -> Paystack -> start-up
   ===================================================== */

/* ---------- 1. DATA ---------- */

// Products from your Products_List file. Each "id" (p1, p2...) is a TEXT value.
// Prices are in Naira (NGN).
const products = [
  { index: 1, id: 'p1', name: 'Samsung TV',  price: 500000 },
  { index: 2, id: 'p2', name: 'Pixel 4a',    price: 250000 },
  { index: 3, id: 'p3', name: 'PS 5',        price: 300000 },
  { index: 4, id: 'p4', name: 'MacBook Air', price: 800000 },
  { index: 5, id: 'p5', name: 'Apple Watch', price: 95000 },
  { index: 6, id: 'p6', name: 'Air Pods',    price: 75000 }
];

// The cart is an array of objects: { id, name, price, quantity }
let cart = [];

// The user object stores the customer's details alongside the cart
let user = { name: "", email: "", phone: "", cart: cart };

// Put your own Paystack TEST public key here (starts with pk_test_)
const PAYSTACK_PUBLIC_KEY = "pk_test_a5895050f462c0e57010b6220a0428f8bfc95dfb";

/* ---------- 2. GRAB HTML ELEMENTS ONCE ---------- */
const productGrid  = document.getElementById("product-grid");
const cartBtn      = document.getElementById("cart-btn");
const cartCount    = document.getElementById("cart-count");
const cartModal    = document.getElementById("cart-modal");
const cartItemsBox = document.getElementById("cart-items");
const cartTotal    = document.getElementById("cart-total");
const summaryModal = document.getElementById("summary-modal");
const PAYSTACK_CURRENCY = "GHS";
const CURRENCY_SYMBOL = "GH₵";

/* ---------- 3. SMALL HELPER FUNCTIONS ---------- */

// Turns 500000 into "₦500,000"
function formatPrice(amount) {
  return CURRENCY_SYMBOL + amount.toLocaleString("en-NG");
}

// Looks for a product/cart item by id. Returns undefined if not found.
function findById(list, id) {
  return list.find(function (item) { return item.id === id; });
}

/* ---------- 4. SHOWING PRODUCTS ---------- */

// Builds one card per product and puts them in the grid
function renderProducts() {
  productGrid.innerHTML = products.map(function (p) {
    return `
      <article class="product-card">
        <!-- The price shows on top of the picture when you hover (see CSS) -->
        <div class="image-wrap">
          <img src="images/product${p.index}.png" alt="${p.name}" />
          <div class="price-overlay"><span>Price</span><strong>${formatPrice(p.price)}</strong></div>
        </div>
        <h3>${p.name}</h3>
        <!-- data-id tells us which product this button belongs to -->
        <button class="btn btn-primary product-btn" data-id="${p.id}">Add to Cart</button>
      </article>`;
  }).join("");
}

// Makes every product button say "Add to Cart" or "Remove from Cart"
// depending on whether that product is in the cart right now
function updateProductButtons() {
  document.querySelectorAll(".product-btn").forEach(function (btn) {
    const inCart = findById(cart, btn.dataset.id);
    btn.textContent = inCart ? "Remove from Cart" : "Add to Cart";
    btn.classList.toggle("in-cart", Boolean(inCart));
  });
}

/* ---------- 5. CART LOGIC ---------- */

function addToCart(id) {
  const product = findById(products, id);
  // Copy the product and give it a starting quantity of 1
  cart.push({ id: product.id, name: product.name, price: product.price, quantity: 1 });
  refreshAll();
}

function removeFromCart(id) {
  // filter keeps every item EXCEPT the one with this id
  cart = cart.filter(function (item) { return item.id !== id; });
  user.cart = cart;
  refreshAll();
}

function changeQuantity(id, change) {
  const item = findById(cart, id);
  item.quantity += change;
  // If quantity drops to 0, remove the item completely
  if (item.quantity < 1) {
    removeFromCart(id);
    return;
  }
  refreshAll();
}

// Adds up price x quantity for every item
function calculateTotal() {
  return cart.reduce(function (sum, item) {
    return sum + item.price * item.quantity;
  }, 0);
}

// Shows the cart as a table inside the cart modal
function renderCart() {
  if (cart.length === 0) {
    cartItemsBox.innerHTML = '<p class="empty-msg">Your cart is empty.</p>';
  } else {
    // One table row per cart item. "index + 1" gives the S/N (serial number).
    const rows = cart.map(function (item, index) {
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${item.name}</td>
          <td>${formatPrice(item.price * item.quantity)}</td>
          <td>
            <button class="qty-btn" data-action="decrease" data-id="${item.id}">-</button>
            <span class="qty">${item.quantity}</span>
            <button class="qty-btn" data-action="increase" data-id="${item.id}">+</button>
          </td>
          <td><button class="remove-btn" data-action="remove" data-id="${item.id}">Remove</button></td>
        </tr>`;
    }).join("");

    cartItemsBox.innerHTML = `
      <table>
        <thead><tr><th>S/N</th><th>Item</th><th>Price</th><th>Quantity</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }
  cartTotal.textContent = formatPrice(calculateTotal());
}

// The number on the cart button = number of DIFFERENT items (not quantity)
function updateCartCount() {
  cartCount.textContent = cart.length;
}

// One function that updates everything on screen after any change
function refreshAll() {
  user.cart = cart;
  updateProductButtons();
  updateCartCount();
  renderCart();
}

/* ---------- 6. OPEN / CLOSE MODALS ---------- */
function openModal(modal)  { modal.classList.add("open"); }
function closeModal(modal) { modal.classList.remove("open"); }

/* ---------- 7. FORM VALIDATION ---------- */

// Each rule returns an error message, or "" if the value is fine
const validators = {
  name: function (value) {
    return value.trim() === "" ? "Please enter your name." : "";
  },
  email: function (value) {
    if (value.trim() === "") return "Please enter your email.";
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // text@text.text
    return emailPattern.test(value) ? "" : "Enter a valid email address.";
  },
  phone: function (value) {
    if (value.trim() === "") return "Please enter your phone number.";
    // Digits only, exactly 10 characters (e.g. 0241234567)
    return /^\d{10}$/.test(value.trim()) ? "" : "Phone number must be exactly 10 digits.";
  }
};

// Checks one field, shows/clears its error, and returns true if valid
function validateField(fieldName) {
  const input = document.getElementById(fieldName);
  const errorBox = document.getElementById(fieldName + "-error");
  const message = validators[fieldName](input.value);

  errorBox.textContent = message;
  input.classList.toggle("invalid", message !== "");
  return message === "";
}

// Checks all three fields. We check each one (no early exit) so every error shows.
function validateForm() {
  const results = ["name", "email", "phone"].map(validateField);
  return results.every(Boolean);
}

// Saves what the user typed into the user object
function saveUserDetails() {
  user.name  = document.getElementById("name").value.trim();
  user.email = document.getElementById("email").value.trim();
  user.phone = document.getElementById("phone").value.trim();
  user.cart  = cart;
}

/* ---------- 8. CHECKOUT AND PAYSTACK ---------- */

function handleCheckout() {
  if (cart.length === 0) {
    alert("Your cart is empty. Add a product first.");
    return;
  }
  if (!validateForm()) return;   // stop if any field is wrong

  saveUserDetails();
  closeModal(cartModal);         // close cart BEFORE opening Paystack
  payWithPaystack();
}

function payWithPaystack() {
  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: user.email,
    amount: calculateTotal() * 100,   // Paystack wants the smallest unit (kobo)
    currency: PAYSTACK_CURRENCY,
    ref: "EM" + Date.now(),           // a unique reference for this payment
    callback: function (response) {   // runs when payment succeeds
      showSummary();
    },
    onClose: function () {            // runs if the user closes Paystack without paying
      alert("Payment window closed. Your cart is still saved.");
    }
  });
  handler.openIframe();
}

/* ---------- 9. SUMMARY MODAL ---------- */
function showSummary() {
  // Put the customer's name in the heading
  document.getElementById("summary-name").textContent = user.name;

  // One row per item bought: S/N, item name, quantity
  document.getElementById("summary-body").innerHTML = user.cart.map(function (item, index) {
    return "<tr><td>" + (index + 1) + "</td><td>" + item.name + "</td><td>" + item.quantity + "</td></tr>";
  }).join("");

  openModal(summaryModal);
}

/* ---------- 10. EVENT LISTENERS ---------- */

// Product buttons: we listen on the grid once ("event delegation")
// because the buttons are created dynamically.
productGrid.addEventListener("click", function (e) {
  const btn = e.target.closest(".product-btn");
  if (!btn) return;                       // click wasn't on a product button
  const id = btn.dataset.id;
  findById(cart, id) ? removeFromCart(id) : addToCart(id);
});

// Buttons inside the cart (+, -, Remove) - also dynamic, so also delegated
cartItemsBox.addEventListener("click", function (e) {
  const btn = e.target.closest("button");
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.action === "increase") changeQuantity(id, 1);
  if (btn.dataset.action === "decrease") changeQuantity(id, -1);
  if (btn.dataset.action === "remove")   removeFromCart(id);
});

// Open the cart
cartBtn.addEventListener("click", function () { openModal(cartModal); });

// Close the cart: "Continue Shopping" button...
document.getElementById("continue-btn").addEventListener("click", function () {
  closeModal(cartModal);
});
// ...or clicking the dark area outside the white box
cartModal.addEventListener("click", function (e) {
  if (e.target === cartModal) closeModal(cartModal);
});

// Checkout
document.getElementById("checkout-btn").addEventListener("click", handleCheckout);

// Validate each field when the user leaves it ("blur" event)
["name", "email", "phone"].forEach(function (fieldName) {
  document.getElementById(fieldName).addEventListener("blur", function () {
    validateField(fieldName);
  });
});

// "Ok" closes the summary and reloads the page so the cart and details are cleared
document.getElementById("ok-btn").addEventListener("click", function () {
  closeModal(summaryModal);
  location.reload();
});

/* ---------- 11. START THE PAGE ---------- */
renderProducts();
refreshAll();
