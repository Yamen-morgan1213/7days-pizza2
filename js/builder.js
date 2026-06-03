/* Interactive Custom Pizza Builder Logic */

const TOPPING_TEMPLATES = {
  pepperoni: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <circle cx="50" cy="50" r="45" fill="#a71d1d" stroke="#6d0f0f" stroke-width="3" />
    <circle cx="35" cy="35" r="5" fill="#7d1212" />
    <circle cx="65" cy="30" r="7" fill="#7d1212" />
    <circle cx="45" cy="65" r="6" fill="#7d1212" />
    <circle cx="58" cy="55" r="5" fill="#7d1212" />
    <path d="M 20 50 Q 50 20 80 50" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="3" stroke-linecap="round" />
  </svg>`,
  mushrooms: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <!-- Cap -->
    <path d="M 15 50 C 15 15, 85 15, 85 50 C 70 50, 60 45, 50 45 C 40 45, 30 50, 15 50 Z" fill="#d9d2c9" stroke="#9e9382" stroke-width="3" />
    <!-- Stem -->
    <path d="M 40 45 L 40 85 C 40 90, 60 90, 60 85 L 60 45" fill="#bcaf9c" stroke="#9e9382" stroke-width="3" />
    <!-- Gills -->
    <path d="M 25 50 L 30 46 M 38 48 L 40 44 M 62 44 L 60 48 M 75 50 L 70 46" stroke="#756958" stroke-width="2" />
  </svg>`,
  olives: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <circle cx="50" cy="50" r="40" fill="#1c1c1c" stroke="#000" stroke-width="4" />
    <circle cx="50" cy="50" r="18" fill="none" stroke="#2a1a08" stroke-width="8" />
    <circle cx="42" cy="42" r="6" fill="#444" opacity="0.3" />
  </svg>`,
  basil: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <path d="M 50 90 C 20 70, 10 40, 50 10 C 90 40, 80 70, 50 90 Z" fill="#2d6a4f" stroke="#1b4332" stroke-width="3" />
    <!-- Veins -->
    <path d="M 50 90 L 50 18 M 50 70 Q 35 60 25 55 M 50 60 Q 65 50 75 45 M 50 45 Q 38 35 30 30 M 50 35 Q 62 25 70 20" fill="none" stroke="#1b4332" stroke-width="2" />
  </svg>`,
  tomatoes: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <circle cx="50" cy="50" r="45" fill="#d62222" stroke="#9e0c0c" stroke-width="3" />
    <!-- Inner segments -->
    <path d="M 50 15 C 50 15, 65 30, 50 50 C 35 30, 50 15, 50 15 Z" fill="#9e0c0c" />
    <path d="M 50 85 C 50 85, 65 70, 50 50 C 35 70, 50 85, 50 85 Z" fill="#9e0c0c" />
    <path d="M 15 50 C 15 50, 30 65, 50 50 C 30 35, 15 50, 15 50 Z" fill="#9e0c0c" />
    <path d="M 85 50 C 85 50, 70 65, 50 50 C 70 35, 85 50, 85 50 Z" fill="#9e0c0c" />
    <!-- Seeds -->
    <circle cx="47" cy="30" r="3" fill="#ffd166" />
    <circle cx="53" cy="70" r="3" fill="#ffd166" />
    <circle cx="30" cy="53" r="3" fill="#ffd166" />
    <circle cx="70" cy="47" r="3" fill="#ffd166" />
  </svg>`,
  jalapenos: `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <circle cx="50" cy="50" r="45" fill="#2d6a4f" stroke="#1b4332" stroke-width="3" />
    <circle cx="50" cy="50" r="32" fill="#52b788" stroke="#2d6a4f" stroke-width="2" />
    <!-- Hollow / Seeds -->
    <circle cx="50" cy="50" r="14" fill="#52b788" />
    <circle cx="42" cy="42" r="3" fill="#ffd166" />
    <circle cx="58" cy="42" r="3" fill="#ffd166" />
    <circle cx="50" cy="58" r="3" fill="#ffd166" />
  </svg>`
};

class PizzaBuilder {
  constructor() {
    this.size = 'medium'; // small, medium, large
    this.crust = 'original'; // original, thin, glutenfree
    this.toppings = {
      sauce: true,
      cheese: true,
      pepperoni: false,
      mushrooms: false,
      olives: false,
      basil: false,
      tomatoes: false,
      jalapenos: false
    };
    
    this.pricing = {
      base: 12.00,
      sizes: { small: -2.00, medium: 0.00, large: 3.50 },
      crusts: { original: 0.00, thin: 0.00, glutenfree: 2.50 },
      toppingPrice: 1.50
    };

    this.initElements();
    this.initEvents();
    this.updateUI();
  }

  initElements() {
    this.visualizer = document.querySelector('.pizza-pizza');
    this.toppingsLayer = document.querySelector('.pizza-toppings-layer');
    this.sauceLayer = document.querySelector('.pizza-sauce');
    this.cheeseLayer = document.querySelector('.pizza-cheese');
    this.board = document.querySelector('.pizza-board');

    // Controls
    this.sizeSelect = document.getElementById('builder-size');
    this.crustSelect = document.getElementById('builder-crust');
    this.tabButtons = document.querySelectorAll('.builder-tab');
    this.panels = document.querySelectorAll('.builder-panel');
    this.toppingCards = document.querySelectorAll('.topping-card');
    
    // Summary
    this.basePriceEl = document.getElementById('summary-base-price');
    this.toppingsPriceEl = document.getElementById('summary-toppings-price');
    this.totalPriceEl = document.getElementById('summary-total-price');
    this.addToCartBtn = document.getElementById('builder-add-to-cart');
  }

  initEvents() {
    // Size and Crust changes
    if (this.sizeSelect) {
      this.sizeSelect.addEventListener('change', (e) => {
        this.size = e.target.value;
        this.updateUI();
        this.spinBoard();
      });
    }

    if (this.crustSelect) {
      this.crustSelect.addEventListener('change', (e) => {
        this.crust = e.target.value;
        this.updateUI();
        this.spinBoard();
      });
    }

    // Tabs for topping categories
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        this.tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        this.panels.forEach(panel => {
          if (panel.id === `panel-${target}`) {
            panel.classList.add('active');
          } else {
            panel.classList.remove('active');
          }
        });
      });
    });

    // Topping Toggles
    this.toppingCards.forEach(card => {
      card.addEventListener('click', () => {
        const topping = card.dataset.topping;
        if (topping === 'sauce' || topping === 'cheese') {
          this.toppings[topping] = !this.toppings[topping];
          card.classList.toggle('selected', this.toppings[topping]);
          this.toggleBaseLayer(topping);
        } else {
          this.toppings[topping] = !this.toppings[topping];
          card.classList.toggle('selected', this.toppings[topping]);
          if (this.toppings[topping]) {
            this.addToppingVisuals(topping);
          } else {
            this.removeToppingVisuals(topping);
          }
        }
        this.updateUI();
      });
    });

    // Add to Cart Action
    if (this.addToCartBtn) {
      this.addToCartBtn.addEventListener('click', () => {
        this.addPizzaToCart();
      });
    }
  }

  spinBoard() {
    if (this.board) {
      this.board.style.transform = 'rotateX(20deg) rotate(180deg)';
      setTimeout(() => {
        this.board.style.transform = 'rotateX(20deg) rotate(0deg)';
      }, 500);
    }
  }

  toggleBaseLayer(topping) {
    if (topping === 'sauce' && this.sauceLayer) {
      this.sauceLayer.classList.toggle('active', this.toppings.sauce);
    }
    if (topping === 'cheese' && this.cheeseLayer) {
      this.cheeseLayer.classList.toggle('active', this.toppings.cheese);
    }
  }

  addToppingVisuals(topping) {
    // Generate 10 scattered toppings on the pizza
    const count = 10;
    const template = TOPPING_TEMPLATES[topping];
    if (!template || !this.toppingsLayer) return;

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = `topping-placed topping-${topping}`;
      el.innerHTML = template;

      // Random position inside circular pizza (r = 40% safety margin)
      const angle = Math.random() * Math.PI * 2;
      const distance = 10 + Math.random() * 32; // stay away from center slightly and stay within crust
      
      const x = 50 + distance * Math.cos(angle);
      const y = 50 + distance * Math.sin(angle);
      
      el.style.left = `${x}%`;
      el.style.top = `${y}%`;
      
      // Random rotation
      const rot = Math.floor(Math.random() * 360);
      el.style.setProperty('--rot', `${rot}deg`);
      
      // Random stagger animation delay
      el.style.animationDelay = `${i * 0.04}s`;

      this.toppingsLayer.appendChild(el);
    }
  }

  removeToppingVisuals(topping) {
    if (!this.toppingsLayer) return;
    const elements = this.toppingsLayer.querySelectorAll(`.topping-${topping}`);
    elements.forEach(el => {
      // Add animate out
      el.style.transform = 'translate(-50%, -50%) scale(0)';
      el.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    });
  }

  calculatePrice() {
    let base = this.pricing.base + this.pricing.sizes[this.size] + this.pricing.crusts[this.crust];
    
    // Count active custom toppings
    let activeToppingCount = 0;
    Object.keys(this.toppings).forEach(key => {
      if (key !== 'sauce' && key !== 'cheese' && this.toppings[key]) {
        activeToppingCount++;
      }
    });

    const toppingsPrice = activeToppingCount * this.pricing.toppingPrice;
    const total = base + toppingsPrice;

    return {
      base: base.toFixed(2),
      toppings: toppingsPrice.toFixed(2),
      total: total.toFixed(2)
    };
  }

  updateUI() {
    const prices = this.calculatePrice();
    if (this.basePriceEl) this.basePriceEl.textContent = `$${prices.base}`;
    if (this.toppingsPriceEl) this.toppingsPriceEl.textContent = `$${prices.toppings}`;
    if (this.totalPriceEl) this.totalPriceEl.textContent = `$${prices.total}`;
  }

  addPizzaToCart() {
    const prices = this.calculatePrice();
    
    // Get custom toppings names
    const selectedToppingsList = [];
    Object.keys(this.toppings).forEach(key => {
      if (this.toppings[key]) {
        // Capitalize
        selectedToppingsList.push(key.charAt(0).toUpperCase() + key.slice(1));
      }
    });

    const pizzaName = `Custom ${this.size.charAt(0).toUpperCase() + this.size.slice(1)} Pizza`;
    const pizzaDesc = `Crust: ${this.crust.charAt(0).toUpperCase() + this.crust.slice(1)}. Toppings: ${selectedToppingsList.join(', ')}`;
    
    const cartItem = {
      id: `custom-${Date.now()}`,
      name: pizzaName,
      price: parseFloat(prices.total),
      description: pizzaDesc,
      qty: 1,
      toppings: selectedToppingsList,
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=60' // default pizza icon / image
    };

    // Spin full board as confirmation
    if (this.visualizer) {
      this.visualizer.style.transform = 'scale(0.9) rotate(360deg)';
      setTimeout(() => {
        this.visualizer.style.transform = 'scale(1) rotate(0deg)';
      }, 800);
    }

    // Call window cart handler
    if (window.Cart) {
      window.Cart.addItem(cartItem);
      window.Cart.showToast('Custom Masterpiece added to Cart!', 'success');
    }
  }
}

// Instantiate customizer when page loads
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.pizza-visualizer')) {
    window.PizzaBuilderInstance = new PizzaBuilder();
  }
});
