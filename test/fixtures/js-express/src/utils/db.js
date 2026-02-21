const users = new Map();
let nextId = 1;

function getUser(id) {
  return Promise.resolve(users.get(String(id)) || null);
}

function createUser(data) {
  const id = String(nextId++);
  const user = { id, ...data, createdAt: new Date().toISOString() };
  users.set(id, user);
  return Promise.resolve(user);
}

function updateUser(id, data) {
  const existing = users.get(String(id));
  if (!existing) return Promise.resolve(null);
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  users.set(String(id), updated);
  return Promise.resolve(updated);
}

function deleteUser(id) {
  users.delete(String(id));
  return Promise.resolve();
}

function calculateDiscount(price, qty) {
  let discount = 0;
  if (qty > 100) {
    discount = 0.15;
  } else if (qty > 50) {
    discount = 0.10;
  } else if (qty > 10) {
    discount = 0.05;
  }
  const total = price * qty * (1 - discount);
  return Math.round(total * 100) / 100;
}

module.exports = { getUser, createUser, updateUser, deleteUser, calculateDiscount };
