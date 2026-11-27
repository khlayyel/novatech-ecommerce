import mongoose from 'mongoose';

/**
 * Média binaire (image) stocké en base pour survivre aux redéploiements.
 * Les données ne sont jamais renvoyées en JSON : uniquement via GET /api/media/:id.
 */
const mediaSchema = new mongoose.Schema(
  {
    filename: { type: String, trim: true, maxlength: 120, default: '' },
    mime: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 1 },
    data: { type: Buffer, required: true }
  },
  { timestamps: true }
);

mediaSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.data;
    return ret;
  }
});

export default mongoose.model('Media', mediaSchema);
