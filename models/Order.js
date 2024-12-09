import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    name: String,
    image: String
  }],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    enum: ['USD', 'EUR', 'GBP', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD', 'LBP', 'EGP', 'IQD', 'ILS'],
    default: 'USD'
  },
  exchangeRate: {
    type: Number,
    required: true,
    default: 1
  },
  shippingAddress: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true,
      enum: ['JO', 'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'EG', 'IQ', 'LB', 'PS']
    }
  },
  customerInfo: {
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    mobile: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^\+[0-9]{1,4}[0-9]{9,10}$/.test(v);
        },
        message: 'Invalid mobile number format'
      }
    },
    secondaryMobile: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^\+[0-9]{1,4}[0-9]{9,10}$/.test(v);
        },
        message: 'Invalid secondary mobile number format'
      }
    }
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'cod'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Add index for orderNumber
orderSchema.index({ orderNumber: 1 }, { unique: true });

// Add index for user to optimize queries
orderSchema.index({ user: 1 });

// Add compound index for status and createdAt for filtered queries
orderSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Order', orderSchema);