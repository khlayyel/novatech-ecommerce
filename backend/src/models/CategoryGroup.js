import mongoose from 'mongoose';

/**
 * Catégorie de premier niveau (regroupement de familles) avec son visuel.
 * `Category.group` référence ce nom.
 */
const categoryGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 60
    },
    imageUrl: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

export default mongoose.model('CategoryGroup', categoryGroupSchema);
