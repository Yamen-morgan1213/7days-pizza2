/* Customer-facing application logic & Animations
   ================================================
   All PizzaDB calls are now async (Supabase-backed).
   ================================================ */

// 1. Custom Mouse Cursor Tracker
const initCustomCursor = () => {
  const cursor = document.querySelector('.custom-cursor');
  const cursorDot = document.querySelector('.custom-cursor-dot');
  
  if (!cursor || !cursorDot) return;

  document.addEventListener('mousemove', (e) => {
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
    
    cursorDot.style.left = `${e.clientX}px`;
    cursorDot.style.top = `${e.clientY}px`;
  });

  // Adding hover triggers
  const addHoverEffects = () => {
    const targets = document.querySelectorAll('a, button, .topping-card, .pizza-card');
    targets.forEach(target => {
      target.addEventListener('mouseenter', () => {
        cursor.style.width = '50px';
        cursor.style.height = '50px';
        cursor.style.backgroundColor = 'rgba(255, 107, 8, 0.1)';
        cursor.style.borderColor = 'var(--accent-gold)';
      });
      target.addEventListener('mouseleave', () => {
        cursor.style.width = '20px';
        cursor.style.height = '20px';
        cursor.style.backgroundColor = 'transparent';
        cursor.style.borderColor = 'var(--accent)';
      });
    });
  };

  addHoverEffects();
  
  // Re-run hover effects on dynamic DOM updates
  window.addEventListener('menu-rendered', addHoverEffects);
};

// 2. Ambient Woodfire Embers Background Generator
const initWoodfireEmbers = () => {
  const container = document.querySelector('.embers-container');
  if (!container) return;

  const createEmber = () => {
    const ember = document.createElement('div');
    ember.className = 'ember';
    
    const size = Math.random() * 6 + 2; // 2px to 8px
    const startX = Math.random() * window.innerWidth;
    const duration = Math.random() * 6 + 4; // 4s to 10s
    const drift = (Math.random() - 0.5) * 100; // Left-right drift
    
    ember.style.width = `${size}px`;
    ember.style.height = `${size}px`;
    ember.style.left = `${startX}px`;
    ember.style.animationDuration = `${duration}s`;
    ember.style.setProperty('--ember-drift', `${drift}px`);
    
    container.appendChild(ember);
    
    // Remove element after animation completes
    setTimeout(() => {
      ember.remove();
    }, duration * 1000);
  };

  // Generate embers periodically
  setInterval(createEmber, 300);
};

// 3. Header Scroll States & Mobile Menu Toggle
const initHeader = () => {
  const header = document.querySelector('header');
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      header.classList.toggle('open-mobile');
    });

    // Close menu when link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        header.classList.remove('open-mobile');
      });
    });
  }
};

// 4. Cart Core Logic
const Cart = {
  items: [],
  
  init() {
    this.drawer = document.querySelector('.cart-drawer');
    this.closeBtn = document.querySelector('.close-cart');
    this.cartTrigger = document.querySelector('.cart-icon-wrapper');
    this.backdrop = document.querySelector('.backdrop');
    this.cartItemsContainer = document.querySelector('.cart-items');
    
    // Summary elements
    this.subtotalEl = document.getElementById('cart-subtotal');
    this.deliveryEl = document.getElementById('cart-delivery');
    this.totalEl = document.getElementById('cart-total');
    this.badgeEl = document.querySelector('.cart-badge');
    
    // Load from session or local
    const saved = localStorage.getItem('pizza_cart');
    if (saved) {
      this.items = JSON.parse(saved);
    }
    
    this.initEvents();
    this.render();
  },

  initEvents() {
    if (this.cartTrigger) {
      this.cartTrigger.addEventListener('click', () => this.openDrawer());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.closeDrawer());
    }
    if (this.backdrop) {
      this.backdrop.addEventListener('click', () => {
        this.closeDrawer();
        document.getElementById('checkout-modal')?.classList.remove('open');
      });
    }

    // Dynamic cart item adjustments
    if (this.cartItemsContainer) {
      this.cartItemsContainer.addEventListener('click', (e) => {
        const itemId = e.target.dataset.id;
        if (!itemId) return;

        if (e.target.classList.contains('qty-plus')) {
          this.changeQty(itemId, 1);
        } else if (e.target.classList.contains('qty-minus')) {
          this.changeQty(itemId, -1);
        } else if (e.target.classList.contains('cart-item-remove') || e.target.closest('.cart-item-remove')) {
          const actualId = e.target.closest('.cart-item-remove').dataset.id;
          this.removeItem(actualId);
        }
      });
    }

    // Checkout Form
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitOrder(checkoutForm);
      });
    }
  },

  openDrawer() {
    this.drawer.classList.add('open');
    this.backdrop.classList.add('open');
  },

  closeDrawer() {
    this.drawer.classList.remove('open');
    this.backdrop.classList.remove('open');
  },

  addItem(item) {
    // Check if duplicate exists
    const duplicate = this.items.find(i => i.id === item.id);
    if (duplicate) {
      duplicate.qty += 1;
    } else {
      this.items.push(item);
    }
    this.save();
    this.render();
    this.openDrawer();
  },

  removeItem(id) {
    this.items = this.items.filter(i => i.id != id);
    this.save();
    this.render();
    this.showToast('Item removed from cart', 'warning');
  },

  changeQty(id, delta) {
    const item = this.items.find(i => i.id == id);
    if (item) {
      item.qty += delta;
      if (item.qty <= 0) {
        this.removeItem(id);
      } else {
        this.save();
        this.render();
      }
    }
  },

  save() {
    localStorage.setItem('pizza_cart', JSON.stringify(this.items));
  },

  showToast(message, type = 'success') {
    const container = document.querySelector('.toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '✔';
    if (type === 'warning') icon = '⚠';
    if (type === 'info') icon = 'ℹ';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    
    // Slide in
    setTimeout(() => toast.classList.add('show'), 50);
    
    // Remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  },

  render() {
    if (!this.cartItemsContainer) return;
    
    if (this.items.length === 0) {
      this.cartItemsContainer.innerHTML = `
        <div class="flex-center" style="flex-direction:column; height:80%; text-align:center;">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <p style="margin-top:20px;">Your cart is empty.</p>
          <button class="btn btn-secondary" style="margin-top:15px;" onclick="Cart.closeDrawer()">Explore Menu</button>
        </div>
      `;
      this.badgeEl.style.display = 'none';
      this.subtotalEl.textContent = '$0.00';
      this.deliveryEl.textContent = '$0.00';
      this.totalEl.textContent = '$0.00';
      return;
    }

    this.cartItemsContainer.innerHTML = '';
    let subtotal = 0;

    this.items.forEach(item => {
      const itemSub = item.price * item.qty;
      subtotal += itemSub;

      this.cartItemsContainer.innerHTML += `
        <div class="cart-item">
          <button class="cart-item-remove" data-id="${item.id}">✕</button>
          <img src="${item.image}" alt="${item.name}">
          <div class="cart-item-details">
            <h4>${item.name}</h4>
            <span class="price">$${item.price.toFixed(2)}</span>
          </div>
          <div class="cart-item-qty">
            <button class="qty-minus" data-id="${item.id}">−</button>
            <span>${item.qty}</span>
            <button class="qty-plus" data-id="${item.id}">+</button>
          </div>
        </div>
      `;
    });

    const delivery = 3.99;
    const total = subtotal + delivery;

    this.subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    this.deliveryEl.textContent = `$${delivery.toFixed(2)}`;
    this.totalEl.textContent = `$${total.toFixed(2)}`;

    // Update Badge
    const totalQty = this.items.reduce((sum, item) => sum + item.qty, 0);
    this.badgeEl.textContent = totalQty;
    this.badgeEl.style.display = 'block';
  },

  async submitOrder(form) {
    const name = form.querySelector('#checkout-name').value;
    const phone = form.querySelector('#checkout-phone').value;
    const address = form.querySelector('#checkout-address').value;
    const subtotal = parseFloat(this.subtotalEl.textContent.replace('$', ''));
    const total = parseFloat(this.totalEl.textContent.replace('$', ''));

    const newOrder = {
      customer: { name, phone, address },
      items: this.items.map(i => ({ 
        id: i.id, 
        name: i.name, 
        qty: i.qty, 
        price: i.price, 
        description: i.description || '', 
        toppings: i.toppings || [] 
      })),
      total: total,
      status: 'Received'
    };

    try {
      // Add to Supabase database
      const savedOrder = await window.PizzaDB.addOrder(newOrder);

      // Save tracking ID locally
      localStorage.setItem('pizza_tracking_id', savedOrder.id);

      // Clear cart
      this.items = [];
      this.save();
      this.render();

      // Close checkout modals/drawers
      document.getElementById('checkout-modal').classList.remove('open');
      this.closeDrawer();

      this.showToast('Order Placed Successfully!', 'success');

      // Trigger update tracker in UI
      if (window.Tracker) {
        window.Tracker.loadActiveOrder();
      }

      // Scroll to tracker
      document.getElementById('order-tracking-section')?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      console.error('Checkout failed:', err);
      this.showToast(err.message || 'Checkout failed. Please try again.', 'warning');
    }
  }
};

// 5. Menu Display Engine
const MenuEngine = {
  activeCategory: 'all',
  
  init() {
    this.menuGrid = document.querySelector('.menu-grid');
    this.tabButtons = document.querySelectorAll('.tab-btn');
    
    if (!this.menuGrid) return;
    
    this.initEvents();
    this.render();
  },

  initEvents() {
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeCategory = btn.dataset.category;
        this.render();
      });
    });
  },

  async render() {
    const menu = await window.PizzaDB.getMenu();
    this.menuGrid.innerHTML = '';

    const filtered = this.activeCategory === 'all' 
      ? menu 
      : menu.filter(item => item.category === this.activeCategory);

    if (filtered.length === 0) {
      this.menuGrid.innerHTML = `<p style="grid-column: span 3; text-align:center;">No items found in this category.</p>`;
      return;
    }

    filtered.forEach(item => {
      let tagsHTML = '';
      if (item.tags) {
        item.tags.forEach(tag => {
          tagsHTML += `<span class="tag tag-${tag}">${tag}</span>`;
        });
      }

      this.menuGrid.innerHTML += `
        <div class="pizza-card fade-in" onclick="MenuEngine.quickAdd(${item.id})">
          <div class="pizza-tags">${tagsHTML}</div>
          <div class="pizza-img-wrapper">
            <img src="${item.image}" alt="${item.name}">
          </div>
          <div class="pizza-info">
            <h3>${item.name}</h3>
            <p>${item.description}</p>
          </div>
          <div class="pizza-footer">
            <div class="price">$${item.price.toFixed(2)}</div>
            <button aria-label="Add to Cart" onclick="event.stopPropagation(); MenuEngine.quickAdd(${item.id})">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    });

    window.dispatchEvent(new CustomEvent('menu-rendered'));
  },

  async quickAdd(id) {
    const menu = await window.PizzaDB.getMenu();
    const item = menu.find(i => i.id == id);
    if (!item) return;

    const cartItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      description: item.description,
      qty: 1,
      image: item.image
    };

    Cart.addItem(cartItem);
    Cart.showToast(`${item.name} added to Cart!`, 'success');
  }
};

// 6. Real-time Order Tracking Engine
const Tracker = {
  stages: ['Received', 'Preparing', 'Baking', 'Out for Delivery', 'Delivered'],
  
  init() {
    this.trackerCard = document.querySelector('.tracking-card');
    this.noActiveOrderEl = document.querySelector('.no-active-order');
    this.trackingTimeline = document.querySelector('.timeline');
    this.trackingIdEl = document.getElementById('tracking-id');
    this.trackingItemsEl = document.getElementById('tracking-items-summary');
    this.trackingTotalEl = document.getElementById('tracking-total');
    this.lastKnownStatus = null;
    
    this.loadActiveOrder();

    // Supabase realtime sync (same-tab event dispatch)
    window.addEventListener('pizza-db-sync', (e) => {
      if (e.detail.type === 'orders') {
        this.loadActiveOrder();
      }
    });

    // Fallback polling every 5s to catch cross-tab status changes
    setInterval(() => {
      const activeId = localStorage.getItem('pizza_tracking_id');
      if (activeId) {
        this.loadActiveOrder();
      }
    }, 5000);
  },

  async loadActiveOrder() {
    const activeTrackingId = localStorage.getItem('pizza_tracking_id');
    if (!activeTrackingId) {
      if (this.trackerCard) this.trackerCard.style.display = 'none';
      if (this.noActiveOrderEl) this.noActiveOrderEl.style.display = 'flex';
      return;
    }

    const orders = await window.PizzaDB.getOrders();
    const activeOrder = orders.find(o => o.id === activeTrackingId);

    if (!activeOrder) {
      if (this.trackerCard) this.trackerCard.style.display = 'none';
      if (this.noActiveOrderEl) this.noActiveOrderEl.style.display = 'flex';
      return;
    }

    // Notify customer on status transitions in real-time
    if (this.lastKnownStatus && this.lastKnownStatus !== activeOrder.status) {
      if (activeOrder.status === 'Cancelled') {
        if (window.Cart) {
          window.Cart.showToast('Your order has been cancelled!', 'warning');
        }
      } else {
        if (window.Cart) {
          window.Cart.showToast(`Order status updated to: ${activeOrder.status}`, 'success');
        }
      }
    }
    this.lastKnownStatus = activeOrder.status;

    // Toggle layouts
    if (this.trackerCard) this.trackerCard.style.display = 'block';
    if (this.noActiveOrderEl) this.noActiveOrderEl.style.display = 'none';

    // Populate Details
    if (this.trackingIdEl) this.trackingIdEl.textContent = activeOrder.id;
    if (this.trackingTotalEl) this.trackingTotalEl.textContent = `$${activeOrder.total.toFixed(2)}`;
    
    if (this.trackingItemsEl) {
      this.trackingItemsEl.textContent = activeOrder.items
        .map(item => `${item.name} x${item.qty}`)
        .join(', ');
    }

    // Cancel Order button logic - restricted to before Baking stage
    const cancelBtn = document.getElementById('cancel-order-btn');
    if (cancelBtn) {
      if (activeOrder.status === 'Received' || activeOrder.status === 'Preparing') {
        cancelBtn.style.display = 'block';
        cancelBtn.disabled = false;
        cancelBtn.textContent = 'Cancel Order';
        cancelBtn.onclick = async () => {
          if (confirm('Are you sure you want to cancel this order?')) {
            try {
              cancelBtn.disabled = true;
              cancelBtn.textContent = 'Cancelling...';
              await window.PizzaDB.cancelOrder(activeOrder.id, true);
              if (window.Cart) {
                window.Cart.showToast('Order Cancelled successfully!', 'warning');
              }
            } catch (err) {
              console.error('Failed to cancel order:', err);
              if (window.Cart) {
                window.Cart.showToast(err.message || 'Failed to cancel order.', 'warning');
              }
              cancelBtn.disabled = false;
              cancelBtn.textContent = 'Cancel Order';
            }
          }
        };
      } else {
        cancelBtn.style.display = 'none';
      }
    }

    this.renderTimeline(activeOrder.status);
  },

  renderTimeline(status) {
    if (!this.trackingTimeline) return;
    
    this.trackingTimeline.innerHTML = '';

    if (status === 'Cancelled') {
      this.trackingTimeline.innerHTML = `
        <div class="timeline-step active" style="border-left: none;">
          <div class="step-icon" style="background: var(--danger); border-color: var(--danger); color: white; box-shadow: 0 0 15px rgba(230, 57, 70, 0.4);">
            ✕
          </div>
          <div class="step-content">
            <h4 style="color: var(--danger);">Order Cancelled</h4>
            <p>This order has been cancelled and ingredients returned to inventory.</p>
          </div>
        </div>
      `;
      return;
    }

    const activeIndex = this.stages.indexOf(status);
    
    this.stages.forEach((stage, idx) => {
      const isCompleted = idx < activeIndex;
      const isActive = idx === activeIndex;
      const isPending = idx > activeIndex;

      let stateClass = 'pending';
      if (isCompleted) stateClass = 'completed';
      if (isActive) stateClass = 'active';

      this.trackingTimeline.innerHTML += `
        <div class="timeline-step ${stateClass}">
          <div class="step-icon">
            ${isCompleted ? '✓' : idx + 1}
          </div>
          <div class="step-content">
            <h4>${stage}</h4>
            <p>${this.getStageDescription(stage)}</p>
          </div>
        </div>
      `;
    });
  },

  getStageDescription(stage) {
    switch (stage) {
      case 'Received': return 'Order accepted by chef.';
      case 'Preparing': return 'Kneading dough, applying sauce.';
      case 'Baking': return 'Roasting in wood-fired oven.';
      case 'Out for Delivery': return 'En route to your address.';
      case 'Delivered': return 'Arrived! Enjoy your slice.';
      default: return '';
    }
  }
};

// 7. Reviews Engine
const ReviewsEngine = {
  init() {
    this.reviewsGrid = document.querySelector('.reviews-grid');
    this.form = document.getElementById('review-form');
    
    if (this.reviewsGrid) {
      this.render();
    }
    
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submit();
      });
    }

    // Listen for real-time review updates
    window.addEventListener('pizza-db-sync', (e) => {
      if (e.detail.type === 'reviews' && this.reviewsGrid) {
        this.render();
      }
    });
  },

  async render() {
    const reviews = await window.PizzaDB.getReviews();
    this.reviewsGrid.innerHTML = '';

    reviews.forEach(review => {
      let starsHTML = '';
      const fullStars = Math.floor(review.rating);
      for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
          starsHTML += '<span style="color:var(--accent-gold);">★</span>';
        } else {
          starsHTML += '<span style="color:var(--text-muted);">★</span>';
        }
      }

      this.reviewsGrid.innerHTML += `
        <div class="review-card fade-in">
          <div class="review-header">
            <h4>${review.name}</h4>
            <span>${review.date}</span>
          </div>
          <div class="review-stars">${starsHTML}</div>
          <p>"${review.text}"</p>
        </div>
      `;
    });
  },

  async submit() {
    const name = document.getElementById('review-name').value;
    const text = document.getElementById('review-text').value;
    const rating = parseFloat(document.getElementById('review-rating').value);

    const newReview = { name, text, rating };
    await window.PizzaDB.addReview(newReview);
    
    await this.render();
    
    this.form.reset();
    Cart.showToast('Thank you for your masterclass review!', 'success');
  }
};

// Checkout modal trigger utilities
window.openCheckout = () => {
  if (Cart.items.length === 0) {
    Cart.showToast('Please add items to your cart first!', 'warning');
    return;
  }
  document.getElementById('checkout-modal').classList.add('open');
  Cart.backdrop.classList.add('open');
};

window.closeCheckout = () => {
  document.getElementById('checkout-modal').classList.remove('open');
  Cart.backdrop.classList.remove('open');
};

// Initialize everything on DOM Content Loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for Supabase DB init before rendering data-dependent modules
  await window.PizzaDB.init();

  initCustomCursor();
  initWoodfireEmbers();
  initHeader();
  
  Cart.init();
  window.Cart = Cart;
  
  MenuEngine.init();
  window.MenuEngine = MenuEngine;
  
  Tracker.init();
  window.Tracker = Tracker;
  
  ReviewsEngine.init();
});
