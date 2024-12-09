import mongoose from 'mongoose';

const backgroundSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Background name is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['color', 'gradient', 'pattern'],
    required: true
  },
  value: {
    type: String,
    required: [true, 'Background value is required']
  },
  isActive: {
    type: Boolean,
    default: false
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export default mongoose.model('Background', backgroundSchema);