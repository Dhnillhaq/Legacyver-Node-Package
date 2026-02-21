// Express app entry point
const express = require('express');
const userRoutes = require('./routes/users');
const authMiddleware = require('./middleware/auth');

const app = express();
app.use(express.json());
app.use('/api/users', authMiddleware, userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
