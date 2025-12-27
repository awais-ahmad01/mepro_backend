import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import mongoose from 'mongoose';
import merchantAuthRoutes from './routes/merchantAuthRoutes.js';
import merchantProfileRoutes from './routes/merchantProfileRoutes.js';
import authRoutes from './routes/authRoutes.js';
import priceListRoutes from './routes/priceListRoutes.js';
import rewardRoutes from './routes/rewardRoutes.js';
import promotionRoutes from './routes/promotionRoutes.js';
import loyaltyProgramRoutes from './routes/loyaltyProgramRoutes.js';
import scratchCardRoutes from './routes/scratchCardRoutes.js';
import diamondPromotionRoutes from './routes/diamondPromotionRoutes.js';
import vipPricingRoutes from './routes/vipPricingRoutes.js';
import vipBenefitRoutes from './routes/vipBenefitRoutes.js';


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
// Merchant registration (signup) flow
app.use('/api/auth/merchant', merchantAuthRoutes);
// Global auth (login / forgot-password / reset-password) for all user types
app.use('/api/auth', authRoutes);
// Merchant price lists (categories + items)
app.use('/api/merchant/price-lists', priceListRoutes);
// Merchant rewards
app.use('/api/merchant/rewards', rewardRoutes);
// Merchant promotions
app.use('/api/merchant/promotions', promotionRoutes);
// Merchant loyalty programs
app.use('/api/merchant/loyalty-programs', loyaltyProgramRoutes);
// Merchant scratch cards
app.use('/api/merchant/scratch-cards', scratchCardRoutes);
// Merchant diamond promotions
app.use('/api/merchant/diamond-promotions', diamondPromotionRoutes);
// Merchant VIP programs (pricing + benefits)
app.use('/api/merchant/vip-pricing', vipPricingRoutes);
app.use('/api/merchant/vip-benefits', vipBenefitRoutes);
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
