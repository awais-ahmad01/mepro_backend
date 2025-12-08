import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import mongoose from 'mongoose';
import merchantAuthRoutes from './routes/merchantAuthRoutes.js';
import merchantProfileRoutes from './routes/merchantProfileRoutes.js';


// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));


const app = express();

app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));



// Routes
app.use('/api/auth/merchant', merchantAuthRoutes);
app.use('/api/merchant/business', merchantProfileRoutes);



// Global fallback (404)
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    code: "NOT_FOUND",
    message: "Route not found",
  });
});


// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server started on http://localhost:${process.env.PORT}`);
});
