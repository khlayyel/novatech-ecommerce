import mongoose from 'mongoose';

/**
 * Journal des actions d'administration (piste d'audit affichée dans
 * l'espace Sécurité). Chaque mutation sensible y laisse une trace :
 * acteur, action, cible, métadonnées et adresse IP.
 */
const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    actorEmail: { type: String, trim: true, default: '' },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: [80, "L'action ne peut pas dépasser 80 caractères"]
    },
    target: { type: String, trim: true, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

// Lecture chronologique du journal.
auditLogSchema.index({ createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
