const express = require('express');
const morgan = require('morgan');
const path = require('path');
const businessRouter = require('./routes/businessRoutes');
const franchiseRouter = require('./routes/franchiseRoutes');
const formRouter = require('./routes/formRoutes');
const userRouter = require('./routes/userRoutes');
const cookieParser = require('cookie-parser')
const categoryRouter = require('./routes/categoryRoutes');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const HttpError = require('./utils/httpError');
const cors = require('cors');


dotenv.config({ path: '.env' });
const app = express();
const corsOptions = {
  origin: ['http://localhost:3000'],
  credentials: true,
  optionSuccessStatus: 200
}
app.use(cors(corsOptions));
connectDB();

app.use(express.json());
app.use(cookieParser())

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.get('/', (req, res) => {
  res.send(`Keephy api's running `);
});
app.use('/uploads/logo', express.static(path.join('uploads', 'logo')));
app.use('/api/v1/business', businessRouter);
app.use('/api/v1/franchise', franchiseRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/category', categoryRouter);
app.use('/api/v1/typeForm', formRouter);

app.use((req, res, next) => {
  return next(new HttpError('Could not find the route', 404))
})

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || 'An unknown error occurred!' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
