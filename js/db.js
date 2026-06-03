/* ============================================================
   PizzaDB — Real-time Supabase Database Sync System
   ============================================================
   Provides persistent storage with real-time database synchronization
   via Supabase Postgres changes subscription.
   ============================================================ */

// ── Ultra High-Resolution Crisp Seed Data ──

const SEED_MENU = [
  {
    id: 1,
    name: 'Artisanal Margherita',
    price: 14.99,
    category: 'classics',
    description: 'San Marzano tomatoes, fresh buffalo mozzarella, aromatic organic basil, extra virgin olive oil.',
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1000&auto=format&fit=crop&q=90',
    tags: ['veggie', 'popular']
  },
  {
    id: 2,
    name: "Devil's Pepperoni",
    price: 16.99,
    category: 'signatures',
    description: 'Double spicy Calabrian salami, house-made chili honey, mozzarella, marinara base.',
    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=1000&auto=format&fit=crop&q=90',
    tags: ['spicy', 'popular']
  },
  {
    id: 3,
    name: 'Truffle Mushroom & Herb',
    price: 18.99,
    category: 'signatures',
    description: 'Wild forest mushrooms, white truffle oil, taleggio cheese, fresh thyme, caramelized onions.',
    image: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?w=1000&auto=format&fit=crop&q=90',
    tags: ['veggie']
  },
  {
    id: 4,
    name: 'Garden Harvest Supreme',
    price: 15.99,
    category: 'vegan',
    description: 'Roasted bell peppers, zucchini, red onion, cherry tomatoes, vegan almond ricotta.',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1000&auto=format&fit=crop&q=90',
    tags: ['veggie', 'vegan']
  },
  {
    id: 5,
    name: 'Sicilian Seafood Feast',
    price: 21.99,
    category: 'signatures',
    description: 'Garlic butter tiger prawns, squid, capers, fresh dill, lemon zest, light crust.',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1000&auto=format&fit=crop&q=90',
    tags: ['popular']
  },
  {
    id: 6,
    name: 'Rustic Calzone',
    price: 17.49,
    category: 'classics',
    description: 'Folded pizza stuffed with ricotta, smoked ham, wild mushrooms, served with warm marinara sauce.',
    image: 'https://images.unsplash.com/photo-1555072956-7758afb20e8f?w=1000&auto=format&fit=crop&q=90',
    tags: []
  }
];

const SEED_REVIEWS = [
  { id: 1, name: 'Marco V.', rating: 5, text: "The Devil's Pepperoni is a masterpiece. The hot honey drizzled over spicy salami is pure genius.", date: '2 hours ago' },
  { id: 2, name: 'Sophia L.', rating: 5, text: 'Custom pizza builder is so fun! The animated toppings fly onto the base beautifully. Tasted amazing too.', date: '1 day ago' },
  { id: 3, name: 'David K.', rating: 4.8, text: 'Real woodfired crust. Perfect leopard spotting on the edges. Delivery was fast and tracked perfectly.', date: '3 days ago' }
];

// ── PizzaDB — Supabase Engine with Real-time Sync ─────

window.PizzaDB = {
  _ready: false,
  _initPromise: null,
  supabase: null,

  // Initialize & seed if database tables are empty
  async init() {
    if (this._ready) return;
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      // Supabase connection configuration
      const SUPABASE_URL = "https://lcvtrtywvlnfmhgorbba.supabase.co";
      const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjdnRydHl3dmxuZm1oZ29yYmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzcyODUsImV4cCI6MjA5NTA1MzI4NX0.hwtShoCyopiBqKZY2P3QyP5H3cY_29_a_e3HZNQCN7c";

      if (!window.supabase) {
        console.error('[PizzaDB] ❌ Supabase CDN script is not loaded!');
        return;
      }

      // Initialize Supabase Client
      this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('[PizzaDB] ⚡ Supabase client instantiated successfully');

      // Attempt to seed data if database tables are empty
      try {
        await this._seedDatabaseIfNeeded();
      } catch (err) {
        console.warn('[PizzaDB] Seeding database failed or tables are locked:', err);
      }

      // Clean up any legacy seeded fake orders
      try {
        await this._cleanupFakeOrders();
      } catch (err) {
        console.warn('[PizzaDB] Cleanup skipped:', err);
      }

      // Establish Postgres Realtime database subscription
      this._setupRealtimeListeners();

      this._ready = true;
      console.log('[PizzaDB] ✅ Supabase database sync system fully operational');
    })();

    return this._initPromise;
  },

  // Remove legacy hardcoded seed orders that were injected by older code
  async _cleanupFakeOrders() {
    const fakeIds = ['#OR-8849', '#OR-8848'];
    const { error } = await this.supabase
      .from('orders')
      .delete()
      .in('order_id', fakeIds);
    if (error) {
      console.warn('[PizzaDB] Could not clean fake orders:', error);
    } else {
      console.log('[PizzaDB] 🧹 Cleaned up legacy seed orders');
    }
  },

  // ── Database Seeding Helper ──────────────────────────────────────────

  async _seedDatabaseIfNeeded() {
    // 1. Seed Menu
    const { count: menuCount, error: menuErr } = await this.supabase
      .from('menu')
      .select('*', { count: 'exact', head: true });
    
    if (!menuErr && menuCount === 0) {
      console.log('[PizzaDB] 🔄 Seeding menu...');
      const menuToSeed = SEED_MENU.map(({ id, ...item }) => item);
      const { error: seedErr } = await this.supabase.from('menu').insert(menuToSeed);
      if (seedErr) console.error('[PizzaDB] Menu seeding error:', seedErr);
      else console.log('[PizzaDB] Seeded menu successfully');
    }

    // 2. Seed Reviews
    const { count: reviewsCount, error: reviewsErr } = await this.supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true });
    
    if (!reviewsErr && reviewsCount === 0) {
      console.log('[PizzaDB] 🔄 Seeding reviews...');
      const reviewsToSeed = SEED_REVIEWS.map(({ id, ...item }) => item);
      const { error: seedErr } = await this.supabase.from('reviews').insert(reviewsToSeed);
      if (seedErr) console.error('[PizzaDB] Reviews seeding error:', seedErr);
      else console.log('[PizzaDB] Seeded reviews successfully');
    }

    // 3. Seed Inventory
    const { count: invCount, error: invErr } = await this.supabase
      .from('inventory')
      .select('*', { count: 'exact', head: true });
      
    if (!invErr && invCount === 0) {
      console.log('[PizzaDB] 🔄 Seeding inventory...');
      const invToSeed = [
        { item_name: 'Dough', stock: 100 },
        { item_name: 'Cheese', stock: 100 },
        { item_name: 'Sauce', stock: 100 },
        { item_name: 'Pepperoni', stock: 100 },
        { item_name: 'Mushrooms', stock: 100 },
        { item_name: 'Onions', stock: 100 },
        { item_name: 'Olives', stock: 100 },
        { item_name: 'Basil', stock: 100 },
        { item_name: 'Tomatoes', stock: 100 },
        { item_name: 'Jalapenos', stock: 100 }
      ];
      const { error: seedErr } = await this.supabase.from('inventory').insert(invToSeed);
      if (seedErr) console.error('[PizzaDB] Inventory seeding error:', seedErr);
      else console.log('[PizzaDB] Seeded inventory successfully');
    }
  },

  // ── Realtime Postgres Channel Subscription ───────────────────────────

  _setupRealtimeListeners() {
    this.supabase
      .channel('public-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu' },
        (payload) => {
          console.log('[PizzaDB] 🔔 Postgres changes caught: menu', payload);
          this.triggerSync('menu');
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews' },
        (payload) => {
          console.log('[PizzaDB] 🔔 Postgres changes caught: reviews', payload);
          this.triggerSync('reviews');
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('[PizzaDB] 🔔 Postgres changes caught: orders', payload);
          this.triggerSync('orders');
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory' },
        (payload) => {
          console.log('[PizzaDB] 🔔 Postgres changes caught: inventory', payload);
          this.triggerSync('inventory');
        }
      )
      .subscribe((status) => {
        console.log('[PizzaDB] 📡 Supabase Postgres realtime status:', status);
      });
  },

  // ── Menu Operations ──────────────────────────────────────────────────

  async getMenu() {
    await this.init();
    const { data, error } = await this.supabase
      .from('menu')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('[PizzaDB] Error fetching menu:', error);
      return [];
    }

    return data.map(item => ({
      id: parseInt(item.id),
      name: item.name,
      price: parseFloat(item.price),
      category: item.category,
      description: item.description,
      image: item.image,
      tags: Array.isArray(item.tags) ? item.tags : []
    }));
  },

  async saveMenu(menu) {
    await this.init();
    const menuToSave = menu.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
      description: item.description,
      image: item.image,
      tags: item.tags || []
    }));

    const { error } = await this.supabase
      .from('menu')
      .upsert(menuToSave);

    if (error) {
      console.error('[PizzaDB] Error saving menu bulk:', error);
      throw error;
    }
    this.triggerSync('menu');
  },

  async addMenuItem(item) {
    await this.init();
    const { data, error } = await this.supabase
      .from('menu')
      .insert([{
        name: item.name,
        price: item.price,
        category: item.category,
        description: item.description,
        image: item.image,
        tags: item.tags || []
      }])
      .select();

    if (error) {
      console.error('[PizzaDB] Error adding menu item:', error);
      throw error;
    }
    
    this.triggerSync('menu');
    return data[0];
  },

  async deleteMenuItem(id) {
    await this.init();
    const { error } = await this.supabase
      .from('menu')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[PizzaDB] Error deleting menu item:', error);
      throw error;
    }
    this.triggerSync('menu');
  },

  // ── Reviews Operations ───────────────────────────────────────────────

  async getReviews() {
    await this.init();
    const { data, error } = await this.supabase
      .from('reviews')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('[PizzaDB] Error fetching reviews:', error);
      return [];
    }

    return data.map(review => ({
      id: parseInt(review.id),
      name: review.name,
      rating: parseFloat(review.rating),
      text: review.text,
      date: review.date || 'Just now'
    }));
  },

  async addReview(review) {
    await this.init();
    const { data, error } = await this.supabase
      .from('reviews')
      .insert([{
        name: review.name,
        rating: review.rating,
        text: review.text,
        date: 'Just now'
      }])
      .select();

    if (error) {
      console.error('[PizzaDB] Error adding review:', error);
      throw error;
    }

    this.triggerSync('reviews');
    return data[0];
  },

  // ── Orders Operations ────────────────────────────────────────────────

  async getOrders() {
    await this.init();
    const { data, error } = await this.supabase
      .from('orders')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('[PizzaDB] Error fetching orders:', error);
      return [];
    }

    return data.map(row => ({
      id: row.order_id,
      customer: {
        name: row.customer_name,
        phone: row.customer_phone,
        address: row.customer_address
      },
      items: row.items || [],
      total: parseFloat(row.total),
      status: row.status,
      timestamp: row.created_at
    }));
  },

  async addOrder(order) {
    await this.init();

    // 1. Calculate required ingredients first to check stock
    const totalRequired = {};
    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        const qty = item.qty || 1;
        const deductions = {};
        
        const isCustom = item.id && typeof item.id === 'string' && item.id.includes('custom');
        if (isCustom) {
          deductions['Dough'] = 1;
          if (item.toppings && Array.isArray(item.toppings)) {
            item.toppings.forEach(topping => {
              if (['Pepperoni', 'Mushrooms', 'Onions', 'Olives', 'Basil', 'Tomatoes', 'Jalapenos', 'Cheese', 'Sauce'].includes(topping)) {
                deductions[topping] = 1;
              }
            });
          } else {
            const desc = item.description || '';
            if (desc.includes('Pepperoni')) deductions['Pepperoni'] = 1;
            if (desc.includes('Mushrooms')) deductions['Mushrooms'] = 1;
            if (desc.includes('Onions')) deductions['Onions'] = 1;
            if (desc.includes('Olives')) deductions['Olives'] = 1;
            if (desc.includes('Basil')) deductions['Basil'] = 1;
            if (desc.includes('Tomatoes')) deductions['Tomatoes'] = 1;
            if (desc.includes('Jalapenos')) deductions['Jalapenos'] = 1;
            if (desc.includes('Cheese')) deductions['Cheese'] = 1;
            if (desc.includes('Sauce')) deductions['Sauce'] = 1;
          }
        } else {
          const name = item.name || '';
          if (name.includes('Margherita')) {
            deductions['Dough'] = 1;
            deductions['Cheese'] = 1;
          } else if (name.includes('Pepperoni')) {
            deductions['Dough'] = 1;
            deductions['Cheese'] = 1;
            deductions['Pepperoni'] = 1;
          } else if (name.includes('Mushroom')) {
            deductions['Dough'] = 1;
            deductions['Cheese'] = 1;
            deductions['Mushrooms'] = 1;
            deductions['Onions'] = 1;
          } else if (name.includes('Supreme') || name.includes('Garden')) {
            deductions['Dough'] = 1;
            deductions['Cheese'] = 1;
            deductions['Onions'] = 1;
            deductions['Tomatoes'] = 1;
          } else if (name.includes('Seafood')) {
            deductions['Dough'] = 1;
            deductions['Cheese'] = 1;
          } else if (name.includes('Calzone')) {
            deductions['Dough'] = 1;
            deductions['Cheese'] = 1;
            deductions['Mushrooms'] = 1;
          } else {
            deductions['Dough'] = 1;
            deductions['Cheese'] = 1;
          }
        }
        
        for (const [ingredient, amount] of Object.entries(deductions)) {
          totalRequired[ingredient] = (totalRequired[ingredient] || 0) + (amount * qty);
        }
      }
    }

    // Check stock in database
    const ingredientNames = Object.keys(totalRequired);
    if (ingredientNames.length > 0) {
      const { data: invList, error: invError } = await this.supabase
        .from('inventory')
        .select('item_name, stock')
        .in('item_name', ingredientNames);

      if (invError) {
        console.error('[PizzaDB] Error checking stock:', invError);
        throw new Error('Database error checking inventory: ' + invError.message);
      }

      const stockMap = {};
      if (invList) {
        invList.forEach(row => {
          stockMap[row.item_name] = row.stock;
        });
      }

      const insufficient = [];
      for (const [ingredient, requiredQty] of Object.entries(totalRequired)) {
        const available = stockMap[ingredient] !== undefined ? stockMap[ingredient] : 0;
        if (available < requiredQty) {
          insufficient.push(`${ingredient} (needs ${requiredQty}, has ${available})`);
        }
      }

      if (insufficient.length > 0) {
        throw new Error('Insufficient stock for: ' + insufficient.join(', '));
      }

      // Deduct ingredients
      for (const [ingredient, requiredQty] of Object.entries(totalRequired)) {
        const available = stockMap[ingredient] !== undefined ? stockMap[ingredient] : 100;
        const newStock = Math.max(0, available - requiredQty);

        const { error: updateError } = await this.supabase
          .from('inventory')
          .update({ stock: newStock })
          .eq('item_name', ingredient);

        if (updateError) {
          console.error(`[PizzaDB] Error deducting stock for ${ingredient}:`, updateError);
          throw new Error(`Failed to deduct stock for ${ingredient}`);
        }
      }

      this.triggerSync('inventory');
    }

    // Now insert the order
    const orderId = `#OR-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = {
      order_id: orderId,
      customer_name: order.customer.name,
      customer_phone: order.customer.phone,
      customer_address: order.customer.address,
      items: order.items,
      total: order.total,
      status: order.status || 'Received'
    };

    const { data, error } = await this.supabase
      .from('orders')
      .insert([newOrder])
      .select();

    if (error) {
      console.error('[PizzaDB] Error adding order:', error);
      throw error;
    }

    const savedRow = data[0];
    this.triggerSync('orders');

    return {
      id: savedRow.order_id,
      customer: order.customer,
      items: order.items,
      total: order.total,
      status: savedRow.status,
      timestamp: savedRow.created_at
    };
  },

  async cancelOrder(orderId, isCustomer = false) {
    await this.init();
    
    // 1. Fetch order details to know the items and their ingredients
    const { data: orderData, error: orderErr } = await this.supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();
      
    if (orderErr) {
      console.error('[PizzaDB] Error fetching order for cancellation:', orderErr);
      throw orderErr;
    }
    
    if (!orderData) {
      throw new Error(`Order ${orderId} not found`);
    }
    
    // Check if the order is already cancelled to avoid double inventory return
    if (orderData.status === 'Cancelled') {
      return { status: 'Cancelled' };
    }

    // Customer cancellation constraint: only before Baking stage
    if (isCustomer && !['Received', 'Preparing'].includes(orderData.status)) {
      throw new Error('Cannot cancel order after it has entered baking stage');
    }
    
    const items = orderData.items || [];
    
    // 2. Update status to 'Cancelled' in Supabase
    const { error: updateErr } = await this.supabase
      .from('orders')
      .update({ status: 'Cancelled' })
      .eq('order_id', orderId);
      
    if (updateErr) {
      console.error('[PizzaDB] Error cancelling order:', updateErr);
      throw updateErr;
    }
    
    // 3. Return ingredients back to inventory
    const totalToRefund = {};
    for (const item of items) {
      const qty = item.qty || 1;
      const deductions = {};
      
      const isCustom = item.id && typeof item.id === 'string' && item.id.includes('custom');
      
      if (isCustom) {
        deductions['Dough'] = 1;
        
        // Handle array of toppings if present
        if (item.toppings && Array.isArray(item.toppings)) {
          item.toppings.forEach(topping => {
            if (['Pepperoni', 'Mushrooms', 'Onions', 'Olives', 'Basil', 'Tomatoes', 'Jalapenos', 'Cheese', 'Sauce'].includes(topping)) {
              deductions[topping] = 1;
            }
          });
        } else {
          // Fallback parsing from description
          const desc = item.description || '';
          if (desc.includes('Pepperoni')) deductions['Pepperoni'] = 1;
          if (desc.includes('Mushrooms')) deductions['Mushrooms'] = 1;
          if (desc.includes('Onions')) deductions['Onions'] = 1;
          if (desc.includes('Olives')) deductions['Olives'] = 1;
          if (desc.includes('Basil')) deductions['Basil'] = 1;
          if (desc.includes('Tomatoes')) deductions['Tomatoes'] = 1;
          if (desc.includes('Jalapenos')) deductions['Jalapenos'] = 1;
          if (desc.includes('Cheese')) deductions['Cheese'] = 1;
          if (desc.includes('Sauce')) deductions['Sauce'] = 1;
        }
      } else {
        const name = item.name || '';
        if (name.includes('Margherita')) {
          deductions['Dough'] = 1;
          deductions['Cheese'] = 1;
        } else if (name.includes('Pepperoni')) {
          deductions['Dough'] = 1;
          deductions['Cheese'] = 1;
          deductions['Pepperoni'] = 1;
        } else if (name.includes('Mushroom')) {
          deductions['Dough'] = 1;
          deductions['Cheese'] = 1;
          deductions['Mushrooms'] = 1;
          deductions['Onions'] = 1;
        } else if (name.includes('Supreme') || name.includes('Garden')) {
          deductions['Dough'] = 1;
          deductions['Cheese'] = 1;
          deductions['Onions'] = 1;
          deductions['Tomatoes'] = 1;
        } else if (name.includes('Seafood')) {
          deductions['Dough'] = 1;
          deductions['Cheese'] = 1;
        } else if (name.includes('Calzone')) {
          deductions['Dough'] = 1;
          deductions['Cheese'] = 1;
          deductions['Mushrooms'] = 1;
        } else {
          deductions['Dough'] = 1;
          deductions['Cheese'] = 1;
        }
      }
      
      for (const [ingredient, amount] of Object.entries(deductions)) {
        totalToRefund[ingredient] = (totalToRefund[ingredient] || 0) + (amount * qty);
      }
    }

    const ingredientNames = Object.keys(totalToRefund);
    if (ingredientNames.length > 0) {
      const { data: invList, error: invError } = await this.supabase
        .from('inventory')
        .select('item_name, stock')
        .in('item_name', ingredientNames);

      if (!invError && invList) {
        const stockMap = {};
        invList.forEach(row => {
          stockMap[row.item_name] = row.stock;
        });

        for (const [ingredient, refundQty] of Object.entries(totalToRefund)) {
          const available = stockMap[ingredient] !== undefined ? stockMap[ingredient] : 100;
          const newStock = available + refundQty;

          const { error: updateError } = await this.supabase
            .from('inventory')
            .update({ stock: newStock })
            .eq('item_name', ingredient);

          if (updateError) {
            console.error(`[PizzaDB] Error refilling stock for ${ingredient}:`, updateError);
          } else {
            console.log(`[PizzaDB] Returned ${refundQty} of ${ingredient}. New stock: ${newStock}`);
          }
        }
      }
      this.triggerSync('inventory');
    }
    
    this.triggerSync('orders');
    return { status: 'Cancelled' };
  },

  async updateOrderStatus(orderId, status) {
    await this.init();
    
    if (status === 'Cancelled') {
      return await this.cancelOrder(orderId);
    }

    const { error } = await this.supabase
      .from('orders')
      .update({ status: status })
      .eq('order_id', orderId);

    if (error) {
      console.error('[PizzaDB] Error updating order status:', error);
      throw error;
    }
    this.triggerSync('orders');
  },

  async deleteOrder(orderId) {
    await this.init();
    const { error } = await this.supabase
      .from('orders')
      .delete()
      .eq('order_id', orderId);

    if (error) {
      console.error('[PizzaDB] Error deleting order:', error);
      throw error;
    }
    this.triggerSync('orders');
  },

  async getInventory() {
    await this.init();
    const { data, error } = await this.supabase
      .from('inventory')
      .select('*')
      .order('item_name', { ascending: true });
      
    if (error) {
      console.error('[PizzaDB] Error fetching inventory:', error);
      return [];
    }
    return data;
  },

  async updateInventoryStock(itemName, newStock) {
    await this.init();
    const stockVal = Math.max(0, parseInt(newStock) || 0);
    const { error } = await this.supabase
      .from('inventory')
      .update({ stock: stockVal })
      .eq('item_name', itemName);

    if (error) {
      console.error(`[PizzaDB] Error updating inventory for ${itemName}:`, error);
      throw error;
    }
    
    this.triggerSync('inventory');
    return { item_name: itemName, stock: stockVal };
  },

  // ── Event Dispatch (same-tab sync) ──────────────────────────────────

  triggerSync(type) {
    window.dispatchEvent(new CustomEvent('pizza-db-sync', { detail: { type } }));
  }
};

// Kick-off initialization immediately
window.PizzaDB.init();
