/* Admin Dashboard Engine & Supabase Synchronization
   ===================================================
   All PizzaDB calls are now async (Supabase-backed).
   Real-time updates arrive via Supabase Realtime channels.
   =================================================== */

class AdminPortal {
  constructor() {
    this.initElements();
    this.initEvents();
    
    if (sessionStorage.getItem('admin_authenticated') === 'true') {
      this.render();
    } else {
      document.body.classList.add('locked');
    }
  }

  initElements() {
    this.orderList = document.querySelector('.order-list');
    this.menuTableBody = document.querySelector('.menu-table tbody');
    this.menuForm = document.getElementById('admin-menu-form');
    this.imageInput = document.getElementById('menu-image');
    this.imagePreview = document.getElementById('image-preview');
    this.fileLabel = document.querySelector('.file-upload-label');
    this.currentUploadedImage = '';
    this.inventoryList = document.getElementById('admin-inventory-list');
    
    // Stats Cards
    this.statSales = document.getElementById('stat-total-sales');
    this.statOrders = document.getElementById('stat-total-orders');
    this.statValue = document.getElementById('stat-avg-value');
    
    // Chart Bars
    this.chartBars = document.querySelectorAll('.chart-bar');
  }

  initEvents() {
    // Menu Form Submission
    if (this.menuForm) {
      this.menuForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.addMenuItem();
      });
    }

    // Handle Image Upload File Selection & Compression
    if (this.imageInput) {
      this.imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          // Update label text
          if (this.fileLabel) {
            this.fileLabel.textContent = file.name;
          }

          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const max_size = 400; // max width/height for standard local storage menu image
              let width = img.width;
              let height = img.height;
              
              if (width > height) {
                if (width > max_size) {
                  height *= max_size / width;
                  width = max_size;
                }
              } else {
                if (height > max_size) {
                  width *= max_size / height;
                  height = max_size;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              
              // Compress to highly optimized base64 jpeg
              this.currentUploadedImage = canvas.toDataURL('image/jpeg', 0.7);
              
              if (this.imagePreview) {
                this.imagePreview.src = this.currentUploadedImage;
                this.imagePreview.style.display = 'block';
              }
            };
            img.src = event.target.result;
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Supabase real-time sync listener (replaces localStorage 'storage' event)
    window.addEventListener('pizza-db-sync', () => {
      this.render();
    });
  }

  async calculateStats() {
    const orders = await window.PizzaDB.getOrders();

    const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = orders.length;
    const avgValue = totalOrders > 0 ? (totalSales / totalOrders) : 0;

    this.animateCounter(this.statSales, totalSales, '$', true);
    this.animateCounter(this.statOrders, totalOrders, '', false);
    this.animateCounter(this.statValue, avgValue, '$', true);
  }

  animateCounter(el, target, prefix = '', decimal = false) {
    if (!el) return;
    const duration = 1200;
    const startTime = performance.now();
    const startVal = parseFloat(el.textContent.replace(/[^0-9.]/g, '')) || 0;

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (target - startVal) * ease;
      el.textContent = `${prefix}${decimal ? current.toFixed(2) : Math.round(current)}`;
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }

  async animateCharts() {
    const orders = await window.PizzaDB.getOrders();
    
    // Map order totals to days of the week (Simulate)
    // We will base it on simple values or actual timestamps
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const salesByDay = { Sun: 120, Mon: 80, Tue: 95, Wed: 110, Thu: 150, Fri: 240, Sat: 310 };

    // Add current orders into the charts
    orders.forEach(order => {
      const date = new Date(order.timestamp);
      const dayName = days[date.getDay()];
      if (salesByDay[dayName] !== undefined) {
        salesByDay[dayName] += order.total;
      }
    });

    // Find max value for scaling
    const maxVal = Math.max(...Object.values(salesByDay));

    this.chartBars.forEach(bar => {
      const day = bar.dataset.day;
      const sales = salesByDay[day] || 0;
      const percent = maxVal > 0 ? (sales / maxVal) * 100 : 0;
      
      // Delay slightly for initial landing animation look
      setTimeout(() => {
        bar.style.height = `${percent}%`;
        bar.title = `$${sales.toFixed(2)}`;
      }, 200);
    });
  }

  async renderOrders() {
    if (!this.orderList) return;

    const orders = await window.PizzaDB.getOrders();
    this.orderList.innerHTML = '';

    if (orders.length === 0) {
      this.orderList.innerHTML = `<p style="text-align:center; padding:20px; color:var(--text-muted);">No orders placed yet.</p>`;
      return;
    }

    orders.forEach(order => {
      const itemsText = order.items.map(i => {
        let details = `<strong>${i.name}</strong> x${i.qty}`;
        const isCustom = (i.id && String(i.id).includes('custom')) || (i.name && i.name.toLowerCase().includes('custom'));
        if (isCustom) {
          if (i.toppings && Array.isArray(i.toppings) && i.toppings.length > 0) {
            const bulletList = i.toppings.map(t => `• ${t}`).join(', ');
            details += `<br><span style="color: var(--accent-gold); font-size: 0.85rem; display: block; margin-top: 4px; line-height: 1.35;">${bulletList}</span>`;
          } else if (i.description) {
            // fallback: try to parse toppings from description string
            let descToppings = [];
            const desc = i.description;
            if (desc.includes('Toppings:')) {
              const toppingsStr = desc.split('Toppings:')[1];
              descToppings = toppingsStr.split(',').map(s => s.trim());
            }
            if (descToppings.length > 0) {
              const bulletList = descToppings.map(t => `• ${t}`).join(', ');
              details += `<br><span style="color: var(--accent-gold); font-size: 0.85rem; display: block; margin-top: 4px; line-height: 1.35;">${bulletList}</span>`;
            } else {
              details += `<br><span style="color: var(--accent-gold); font-size: 0.85rem; display: block; margin-top: 4px; line-height: 1.35;">${i.description}</span>`;
            }
          }
        }
        return details;
      }).join('<br>');

      const isDelivered = order.status === 'Delivered';
      const isCancelled = order.status === 'Cancelled';
      
      const row = document.createElement('div');
      row.className = 'order-row';
      row.innerHTML = `
        <div class="order-id">${order.id}</div>
        <div class="order-customer">
          <strong>${order.customer.name}</strong>
          <span>${order.customer.phone}</span>
          <span>${order.customer.address}</span>
        </div>
        <div class="order-items-summary">${itemsText}</div>
        <div class="order-total">$${order.total.toFixed(2)}</div>
        <div class="order-actions" style="display: flex; align-items: center; gap: 8px;">
          ${isCancelled ? `
            <span style="color: var(--danger); font-weight: 600; font-size: 0.95rem; margin-right: 8px;">Cancelled</span>
            <button class="order-delete-btn" title="Remove & Archive Order">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          ` : `
            <select class="order-status-select" data-id="${order.id}">
              <option value="Received" ${order.status === 'Received' ? 'selected' : ''}>Received</option>
              <option value="Preparing" ${order.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
              <option value="Baking" ${order.status === 'Baking' ? 'selected' : ''}>Baking</option>
              <option value="Out for Delivery" ${order.status === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
              <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
              <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
            ${isDelivered ? `
              <button class="order-delete-btn" title="Complete & Archive Order">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            ` : `
              <button class="order-cancel-btn btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; background: rgba(230, 57, 70, 0.1); border-color: rgba(230, 57, 70, 0.2); color: var(--danger);" title="Cancel Order">
                Cancel
              </button>
            `}
          `}
        </div>
      `;

      // Status change handler
      const statusSelect = row.querySelector('.order-status-select');
      if (statusSelect) {
        statusSelect.addEventListener('change', async (e) => {
          try {
            await window.PizzaDB.updateOrderStatus(order.id, e.target.value);
            this.showAdminNotification(`Order ${order.id} updated to ${e.target.value}!`);
          } catch (err) {
            console.error(err);
            this.showAdminNotification('Failed to update status: ' + err.message, 'warning');
          }
        });
      }

      // Delete button handler (only on Delivered or Cancelled orders)
      const deleteBtn = row.querySelector('.order-delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          this.removeOrder(order.id, row);
        });
      }

      // Cancel button handler
      const cancelBtn = row.querySelector('.order-cancel-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', async () => {
          if (confirm(`Are you sure you want to cancel order ${order.id}?`)) {
            try {
              await window.PizzaDB.cancelOrder(order.id);
              this.showAdminNotification(`Order ${order.id} has been cancelled!`, 'warning');
            } catch (err) {
              console.error(err);
              this.showAdminNotification('Failed to cancel order: ' + err.message, 'warning');
            }
          }
        });
      }

      this.orderList.appendChild(row);
    });
  }

  async removeOrder(orderId, rowElement) {
    if (rowElement.classList.contains('dismissing')) return;
    rowElement.classList.add('dismissing');
    
    setTimeout(async () => {
      await window.PizzaDB.deleteOrder(orderId);
      this.showAdminNotification(`Order ${orderId} removed — order complete!`);
    }, 400);
  }

  async renderMenu() {
    if (!this.menuTableBody) return;

    const menu = await window.PizzaDB.getMenu();
    this.menuTableBody.innerHTML = '';

    menu.forEach(item => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><img src="${item.image}" class="menu-table-img" alt="${item.name}"></td>
        <td><strong>${item.name}</strong></td>
        <td><span style="text-transform: capitalize;">${item.category}</span></td>
        <td><span style="color:var(--accent-gold); font-weight:600;">$${item.price.toFixed(2)}</span></td>
        <td>
          <button class="btn btn-secondary delete-menu-btn" style="padding: 6px 12px; font-size:0.8rem; background:rgba(230, 57, 70, 0.1); border-color: rgba(230, 57, 70, 0.2); color: var(--danger);">
            Delete
          </button>
        </td>
      `;

      // Attach delete handler
      row.querySelector('.delete-menu-btn').addEventListener('click', () => {
        this.deleteMenuItem(item.id);
      });

      this.menuTableBody.appendChild(row);
    });
  }

  async addMenuItem() {
    const name = document.getElementById('menu-name').value;
    const price = parseFloat(document.getElementById('menu-price').value);
    const category = document.getElementById('menu-category').value;
    const description = document.getElementById('menu-desc').value;
    const image = this.currentUploadedImage || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=60';

    const newItem = {
      name,
      price,
      category,
      description,
      image,
      tags: []
    };

    await window.PizzaDB.addMenuItem(newItem);

    this.menuForm.reset();

    // Reset file preview & label
    if (this.imagePreview) {
      this.imagePreview.style.display = 'none';
      this.imagePreview.src = '';
    }
    if (this.fileLabel) {
      this.fileLabel.textContent = 'Choose Image File...';
    }
    this.currentUploadedImage = '';

    this.showAdminNotification(`Successfully added ${name} to the menu!`);
    this.render();
  }

  async deleteMenuItem(id) {
    const menu = await window.PizzaDB.getMenu();
    const item = menu.find(i => i.id === id);
    if (!item) return;

    if (confirm(`Are you sure you want to remove ${item.name}?`)) {
      await window.PizzaDB.deleteMenuItem(id);
      this.showAdminNotification(`Removed ${item.name} from the menu.`, 'warning');
      this.render();
    }
  }

  showAdminNotification(message, type = 'success') {
    // Generate simple alert for admin screen
    const container = document.querySelector('.toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>✔</span> <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  async renderInventory() {
    if (!this.inventoryList) return;

    try {
      const inventory = await window.PizzaDB.getInventory();
      
      // If we already have the cards, dynamically update values to avoid stealing text cursor focus
      const existingCards = this.inventoryList.querySelectorAll('.inventory-card');
      if (existingCards.length === inventory.length) {
        inventory.forEach(item => {
          const card = this.inventoryList.querySelector(`.inventory-card[data-name="${item.item_name}"]`);
          if (card) {
            const stockValSpan = card.querySelector('.stock-value');
            const input = card.querySelector('.inv-stock-input');
            
            // Only update UI values if the user isn't actively editing this input
            if (input && document.activeElement !== input) {
              if (stockValSpan) {
                stockValSpan.textContent = item.stock;
              }
              input.value = item.stock;
              
              const badge = card.querySelector('.inventory-badge');
              if (badge) {
                let badgeClass = 'optimal';
                let badgeText = 'Optimal Stock';
                if (item.stock < 10) {
                  badgeClass = 'critical';
                  badgeText = 'Restock Urgently';
                } else if (item.stock < 30) {
                  badgeClass = 'warning';
                  badgeText = 'Low Stock';
                }
                badge.className = `inventory-badge ${badgeClass}`;
                badge.textContent = badgeText;
              }
            }
          }
        });
        return;
      }

      // Full Render
      this.inventoryList.innerHTML = '';
      if (inventory.length === 0) {
        this.inventoryList.innerHTML = `<p style="text-align:center; grid-column: 1/-1; padding:20px; color:var(--text-muted);">No inventory items loaded.</p>`;
        return;
      }

      inventory.forEach(item => {
        let badgeClass = 'optimal';
        let badgeText = 'Optimal Stock';
        if (item.stock < 10) {
          badgeClass = 'critical';
          badgeText = 'Restock Urgently';
        } else if (item.stock < 30) {
          badgeClass = 'warning';
          badgeText = 'Low Stock';
        }

        const card = document.createElement('div');
        card.className = 'inventory-card';
        card.setAttribute('data-name', item.item_name);
        card.innerHTML = `
          <div class="inventory-card-info">
            <h3>${item.item_name}</h3>
            <span class="inventory-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="inventory-stock-display" style="display: flex; align-items: center; justify-content: space-between; margin: 8px 0;">
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary);">
              <span class="stock-value">${item.stock}</span>
              <span style="font-size: 0.8rem; font-weight: 500; color: var(--text-secondary); margin-left: 4px;">units</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="number" class="inv-stock-input" value="${item.stock}" min="0" style="width: 70px; height: 32px; font-size: 0.9rem; text-align: center; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary);">
              <button class="inv-save-btn" style="background: rgba(46, 196, 182, 0.15); border: 1px solid rgba(46, 196, 182, 0.3); color: var(--success); border-radius: 4px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; font-size: 1rem; font-weight: bold;" title="Save Custom Stock">✓</button>
            </div>
          </div>
          <div class="inventory-actions" style="display: flex; gap: 6px; width: 100%; justify-content: space-between;">
            <button class="inv-action-btn btn-plus10" data-action="add" data-val="10" style="flex: 1; padding: 8px 4px; font-size: 0.75rem; border-radius: 4px; background: rgba(46,196,182,0.1); border: 1px solid rgba(46,196,182,0.2); color: var(--success); cursor: pointer; transition: all 0.2s;">+10</button>
            <button class="inv-action-btn btn-plus50" data-action="add" data-val="50" style="flex: 1; padding: 8px 4px; font-size: 0.75rem; border-radius: 4px; background: rgba(46,196,182,0.15); border: 1px solid rgba(46,196,182,0.3); color: var(--success); cursor: pointer; transition: all 0.2s;">+50</button>
            <button class="inv-action-btn btn-reset100" data-action="set" data-val="100" style="flex: 1.5; padding: 8px 4px; font-size: 0.75rem; border-radius: 4px; background: rgba(255, 107, 8, 0.1); border: 1px solid rgba(255, 107, 8, 0.2); color: var(--accent); cursor: pointer; transition: all 0.2s;">Reset to 100</button>
          </div>
        `;

        const input = card.querySelector('.inv-stock-input');
        const saveBtn = card.querySelector('.inv-save-btn');

        // Centralized stock saving logic
        const saveStock = async (newVal) => {
          const newStock = Math.max(0, parseInt(newVal) || 0);
          input.value = newStock;
          const stockValSpan = card.querySelector('.stock-value');
          if (stockValSpan) stockValSpan.textContent = newStock;

          // Responsive badge update
          const badge = card.querySelector('.inventory-badge');
          if (badge) {
            let bClass = 'optimal';
            let bText = 'Optimal Stock';
            if (newStock < 10) {
              bClass = 'critical';
              bText = 'Restock Urgently';
            } else if (newStock < 30) {
              bClass = 'warning';
              bText = 'Low Stock';
            }
            badge.className = `inventory-badge ${bClass}`;
            badge.textContent = bText;
          }

          try {
            await window.PizzaDB.updateInventoryStock(item.item_name, newStock);
            this.showAdminNotification(`Successfully updated ${item.item_name} stock to ${newStock}!`);
          } catch (err) {
            console.error('Failed to update inventory:', err);
            this.showAdminNotification('Failed to update inventory', 'warning');
          }
        };

        // Event listener for action buttons (+10, +50, reset)
        card.querySelectorAll('.inv-action-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const action = btn.dataset.action;
            const val = parseInt(btn.dataset.val);
            let currentStock = parseInt(input.value) || 0;
            let newStock = currentStock;

            if (action === 'add') {
              newStock = currentStock + val;
            } else if (action === 'set') {
              newStock = val;
            }

            await saveStock(newStock);
          });
        });

        // Save on checkmark button click
        if (saveBtn) {
          saveBtn.addEventListener('click', () => saveStock(input.value));
        }

        // Save on enter key press
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            saveStock(input.value);
            input.blur();
          }
        });

        // Save on blur/change
        input.addEventListener('change', () => {
          saveStock(input.value);
        });

        this.inventoryList.appendChild(card);
      });
    } catch (err) {
      console.error('Failed to render inventory:', err);
    }
  }

  async render() {
    try {
      await this.calculateStats();
    } catch (err) {
      console.error('Error in calculateStats:', err);
    }

    try {
      await this.animateCharts();
    } catch (err) {
      console.error('Error in animateCharts:', err);
    }

    try {
      await this.renderOrders();
    } catch (err) {
      console.error('Error in renderOrders:', err);
    }

    try {
      await this.renderMenu();
    } catch (err) {
      console.error('Error in renderMenu:', err);
    }

    try {
      await this.renderInventory();
    } catch (err) {
      console.error('Error in renderInventory:', err);
    }
  }
}

// Mobile sidebar helper
window.toggleAdminSidebar = () => {
  document.querySelector('.admin-sidebar').classList.toggle('open');
};

// ── Admin Lock Screen Security Logic ──
let currentPin = "";

window.pressPin = (num) => {
  const inputEl = document.getElementById('passcode-input');
  if (inputEl && currentPin.length < 8) {
    currentPin += num;
    inputEl.value = currentPin;
    const errEl = document.getElementById('login-error-msg');
    if (errEl) errEl.classList.remove('show');
  }
};

window.clearPin = () => {
  currentPin = "";
  const inputEl = document.getElementById('passcode-input');
  if (inputEl) inputEl.value = "";
  const errEl = document.getElementById('login-error-msg');
  if (errEl) errEl.classList.remove('show');
};

window.submitPin = () => {
  const validPasscodes = ['7777', '1124'];
  if (validPasscodes.includes(currentPin)) {
    sessionStorage.setItem('admin_authenticated', 'true');
    document.body.classList.remove('locked');
    const overlay = document.getElementById('admin-lock-screen');
    if (overlay) {
      overlay.classList.add('hidden');
      setTimeout(() => overlay.remove(), 500);
    }
    
    // Render the admin portal once successfully authenticated
    if (window.adminPortal) {
      window.adminPortal.render();
    }
  } else {
    const errEl = document.getElementById('login-error-msg');
    if (errEl) errEl.classList.add('show');
    currentPin = "";
    const inputEl = document.getElementById('passcode-input');
    if (inputEl) inputEl.value = "";
  }
};

window.logoutAdmin = (e) => {
  if (e) e.preventDefault();
  sessionStorage.removeItem('admin_authenticated');
  window.location.reload();
};

// Listen for keyboard inputs on lock screen
window.addEventListener('keydown', (e) => {
  const overlay = document.getElementById('admin-lock-screen');
  if (!overlay || overlay.classList.contains('hidden')) return;

  if (e.key >= '0' && e.key <= '9') {
    pressPin(e.key);
  } else if (e.key === 'Backspace') {
    currentPin = currentPin.slice(0, -1);
    const inputEl = document.getElementById('passcode-input');
    if (inputEl) inputEl.value = currentPin;
  } else if (e.key === 'Enter') {
    submitPin();
  } else if (e.key === 'Escape') {
    clearPin();
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  // Wait for Supabase connection before building admin UI
  await window.PizzaDB.init();
  window.adminPortal = new AdminPortal();
});
