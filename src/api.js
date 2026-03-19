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
      db.products[index] = { ...db.products[index], ...product };
    } else {
      const newId = Math.max(0, ...db.products.map(p => p.id)) + 1;
      db.products.push({ ...product, id: newId });
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
    db.products = db.products.filter(p => p.id !== id);
    await updateDb(db);
    return { success: true };
  }

  if (endpoint === '/orders' && options.method === 'POST') {
    const { items, total } = JSON.parse(options.body);
    const newOrder = {
      id: Date.now(),
      items,
      total,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    db.orders.unshift(newOrder);
    // Note: Stock is now only deducted upon APPROVAL, as requested.
    
    await updateDb(db);
    return { success: true };
  }

  if (endpoint === '/orders' && !options.method) {
    return db.orders;
  }

  if (endpoint.startsWith('/orders/') && options.method === 'PUT') {
    const id = parseInt(endpoint.split('/').pop());
    const { status } = JSON.parse(options.body);
    const order = db.orders.find(o => o.id === id);
    if (order) {
      // If status is being changed to 'completed' (approved)
      if (status === 'completed' && order.status !== 'completed') {
        // Deduct stock from inventory
        order.items.forEach(item => {
          const product = db.products.find(p => p.id === item.id);
          if (product) {
            product.stock = Math.max(0, (product.stock || 0) - item.quantity);
          }
        });
      }
      order.status = status;
      await updateDb(db);
    }
    return { success: true };
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
