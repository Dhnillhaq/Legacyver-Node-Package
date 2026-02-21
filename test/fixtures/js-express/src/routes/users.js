const express = require('express');
const { getUser, createUser, updateUser, deleteUser } = require('../utils/db');
const router = express.Router();

router.get('/:id', async (req, res) => {
  const user = await getUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

router.post('/', async (req, res) => {
  const { name, email, role } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Missing fields' });
  const user = await createUser({ name, email, role: role || 'user' });
  res.status(201).json(user);
});

router.put('/:id', async (req, res) => {
  const updated = await updateUser(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  await deleteUser(req.params.id);
  res.status(204).send();
});

module.exports = router;
