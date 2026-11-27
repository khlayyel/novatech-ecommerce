import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Utilisateur (bonus : authentification JWT pour lier le panier à un compte).
 * Le mot de passe est haché automatiquement avant enregistrement (bcrypt)
 * et jamais renvoyé par les requêtes de lecture (select: false).
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Le nom est requis'],
      trim: true,
      minlength: [2, 'Le nom doit contenir au moins 2 caractères'],
      maxlength: [80, 'Le nom ne peut pas dépasser 80 caractères']
    },
    email: {
      type: String,
      required: [true, "L'email est requis"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "L'adresse email n'est pas valide"]
    },
    password: {
      type: String,
      required: [true, 'Le mot de passe est requis'],
      minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères'],
      select: false
    }
  },
  { timestamps: true }
);

// Hachage du mot de passe uniquement s'il a été modifié.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);
