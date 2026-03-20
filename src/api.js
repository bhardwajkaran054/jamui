import { fetchDb, updateDb } from './services/githubService';

/**
 * Switch between 'github-backend' and 'local-node-backend'
 */
export const BACKEND_MODE = 'github-backend'; // Use 'local-node-backend' for local testing
export const API_URL = BACKEND_MODE === 'github-backend' ? 'github-backend' : '/api';

export const apiFetch = async (endpoint, options = {}) => {
  // 1. Local Node.js Backend Implementation
  if (BACKEND_MODE === 'local-node-backend') {
    const url = `${API_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // 2. GitHub Repository Backend Implementation
  const db = await fetchDb();

  if (endpoint === '/products' && !options.method) {
    return db.products;
  }

  if (endpoint === '/categories' && !options.method) {
    return ['All', ...(db.categories || [])];
  }

  if (endpoint === '/categories' && options.method === 'POST') {
    const { name } = JSON.parse(options.body);
    if (!db.categories) db.categories = [];
    if (!db.categories.includes(name)) {
      db.categories.push(name);
      await updateDb(db);
    }
    return { success: true };
  }

  if (endpoint.startsWith('/categories/') && options.method === 'DELETE') {
    const name = decodeURIComponent(endpoint.split('/').pop());
    db.categories = (db.categories || []).filter(c => c !== name);
    // Also update products that had this category to 'Uncategorized' or similar? 
    // Or just leave them. Usually deleting a category means products in it become uncategorized.
    db.products.forEach(p => {
      if (p.category === name) p.category = 'Other';
    });
    await updateDb(db);
    return { success: true };
  }

  if (endpoint === '/products' && options.method === 'POST') {
    const product = JSON.parse(options.body);
    const index = db.products.findIndex(p => p.id === product.id);
    
    if (index !== -1) {
      const oldStock = db.products[index].stock || 0;
      if (oldStock !== product.stock) {
        if (!db.stockLogs) db.stockLogs = [];
        db.stockLogs.unshift({
          id: Date.now(),
          productId: product.id,
          productName: product.name,
          oldStock,
          newStock: product.stock,
          reason: 'Manual Admin Update',
          timestamp: new Date().toISOString()
        });
      }
      db.products[index] = { ...db.products[index], ...product };
    } else {
      const newId = Math.max(0, ...db.products.map(p => p.id)) + 1;
      db.products.push({ ...product, id: newId });
      
      if (!db.stockLogs) db.stockLogs = [];
      db.stockLogs.unshift({
        id: Date.now(),
        productId: newId,
        productName: product.name,
        oldStock: 0,
        newStock: product.stock,
        reason: 'New Product Added',
        timestamp: new Date().toISOString()
      });
    }

    // Auto-add category if it doesn't exist
    if (product.category && !db.categories.includes(product.category)) {
      db.categories.push(product.category);
    }
    
    await updateDb(db);
    return { success: true };
  }

  if (endpoint.startsWith('/products/') && options.method === 'DELETE') {
    const id = parseInt(endpoint.split('/').pop());
    const product = db.products.find(p => p.id === id);
    if (product) {
      if (!db.stockLogs) db.stockLogs = [];
      db.stockLogs.unshift({
        id: Date.now(),
        productId: id,
        productName: product.name,
        oldStock: product.stock || 0,
        newStock: 0,
        reason: 'Product Deleted',
        timestamp: new Date().toISOString()
      });
    }
    db.products = db.products.filter(p => p.id !== id);
    await updateDb(db);
    return { success: true };
  }

  if (endpoint === '/orders' && options.method === 'POST') {
    const { items, total, customer, promoCode, deliveryFee, id } = JSON.parse(options.body);
    const newOrder = {
      id: id || Date.now(),
      items,
      total,
      customer, // New: customer info
      promoCode, // New: promo code used
      deliveryFee, // New: delivery fee
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    db.orders.unshift(newOrder);
    // Note: Stock is now only deducted upon APPROVAL, as requested.
    
    await updateDb(db);
    return { success: true, order: newOrder };
  }

  if (endpoint === '/orders' && !options.method) {
    return db.orders;
  }

  if (endpoint.startsWith('/orders/') && options.method === 'PUT') {
    const id = parseInt(endpoint.split('/').pop());
    const { status, estimatedDelivery } = JSON.parse(options.body);
    const order = db.orders.find(o => o.id === id);
    if (order) {
      if (estimatedDelivery) order.estimatedDelivery = estimatedDelivery;
      // If status is being changed to 'completed' (approved)
      if (status === 'completed' && order.status !== 'completed') {
        // Deduct stock from inventory
        order.items.forEach(item => {
          const product = db.products.find(p => p.id === item.id);
          if (product) {
            const oldStock = product.stock || 0;
            product.stock = Math.max(0, oldStock - item.quantity);
            
            if (!db.stockLogs) db.stockLogs = [];
            db.stockLogs.unshift({
              id: Date.now() + Math.random(),
              productId: product.id,
              productName: product.name,
              oldStock,
              newStock: product.stock,
              reason: `Order Approved (#JM-${order.id.toString().slice(-6)})`,
              timestamp: new Date().toISOString()
            });
          }
        });
      }
      order.status = status;
      await updateDb(db);
    }
    return { success: true };
  }

  // New Endpoints for Features
  if (endpoint === '/promo-codes' && !options.method) {
    return db.promoCodes || [];
  }

  if (endpoint === '/promo-codes' && options.method === 'POST') {
    const code = JSON.parse(options.body);
    if (!db.promoCodes) db.promoCodes = [];
    const index = db.promoCodes.findIndex(c => c.code === code.code);
    if (index !== -1) {
      db.promoCodes[index] = code;
    } else {
      db.promoCodes.push(code);
    }
    await updateDb(db);
    return { success: true };
  }

  if (endpoint.startsWith('/promo-codes/') && options.method === 'DELETE') {
    const code = endpoint.split('/').pop();
    db.promoCodes = (db.promoCodes || []).filter(c => c.code !== code);
    await updateDb(db);
    return { success: true };
  }

  if (endpoint === '/notices' && !options.method) {
    return db.notices || { text: '', active: false };
  }

  if (endpoint === '/notices' && options.method === 'POST') {
    db.notices = JSON.parse(options.body);
    await updateDb(db);
    return { success: true };
  }

  if (endpoint === '/stock-logs' && !options.method) {
    return db.stockLogs || [];
  }

  if (endpoint === '/delivery-zones' && !options.method) {
    return db.deliveryZones || [];
  }

  if (endpoint === '/delivery-zones' && options.method === 'POST') {
    const zone = JSON.parse(options.body);
    if (!db.deliveryZones) db.deliveryZones = [];
    const index = db.deliveryZones.findIndex(z => z.name === zone.name);
    if (index !== -1) {
      db.deliveryZones[index] = zone;
    } else {
      db.deliveryZones.push(zone);
    }
    await updateDb(db);
    return { success: true };
  }

  if (endpoint.startsWith('/delivery-zones/') && options.method === 'DELETE') {
    const name = decodeURIComponent(endpoint.split('/').pop());
    db.deliveryZones = (db.deliveryZones || []).filter(z => z.name !== name);
    await updateDb(db);
    return { success: true };
  }

  if (endpoint === '/customers' && !options.method) {
    // Generate customer list from orders
    const customers = {};
    (db.orders || []).forEach(order => {
      if (order.customer && order.customer.phone) {
        const phone = order.customer.phone;
        if (!customers[phone]) {
          customers[phone] = {
            name: order.customer.name,
            phone: phone,
            totalSpent: 0,
            orderCount: 0,
            lastOrder: null,
            loyaltyPoints: 0
          };
        }
        if (order.status === 'completed') {
          customers[phone].totalSpent += order.total;
          customers[phone].loyaltyPoints += Math.floor(order.total / 100);
        }
        customers[phone].orderCount += 1;
        if (!customers[phone].lastOrder || new Date(order.timestamp) > new Date(customers[phone].lastOrder)) {
          customers[phone].lastOrder = order.timestamp;
        }
      }
    });
    return Object.values(customers);
  }

  if (endpoint.startsWith('/orders/') && options.method === 'DELETE') {
    const id = parseInt(endpoint.split('/').pop());
    db.orders = db.orders.filter(o => o.id !== id);
    await updateDb(db);
    return { success: true };
  }

  if (endpoint === '/login' && options.method === 'POST') {
    // GitHub backend doesn't support real login, it uses GitHub Token
    // We'll return success to allow the dashboard to open, where it will ask for the token
    return { success: true };
  }

  throw new Error(`Endpoint ${endpoint} not implemented in GitHub Backend`);
};
