import User from '../models/User.js';
import Cart from '../models/Cart.js';
import { signToken } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../middleware/error.js';

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role || 'customer'
});

/**
 * Rattache le panier invité (X-Cart-Id) au compte qui vient de se connecter :
 * fusion des quantités avec le panier existant de l'utilisateur,
 * puis suppression du panier invité. Implémente le bonus "lier le panier
 * à un utilisateur connecté" sans perdre le panier en cours.
 */
async function mergeGuestCart(userId, sessionId) {
  if (!sessionId) return;

  const guestCart = await Cart.findOne({ sessionId });
  if (!guestCart) return;

  const userCart = await Cart.findOne({ user: userId });

  if (!userCart) {
    guestCart.sessionId = undefined;
    guestCart.user = userId;
    await guestCart.save();
    return;
  }

  for (const guestItem of guestCart.items) {
    const existing = userCart.items.find((item) => item.product.equals(guestItem.product));
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + guestItem.quantity);
    } else {
      userCart.items.push({ product: guestItem.product, quantity: guestItem.quantity });
    }
  }
  await userCart.save();
  await guestCart.deleteOne();
}

/**
 * POST /api/auth/register { name, email, password }
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Nom, email et mot de passe sont requis');
  }
  if (String(password).length < 8) {
    throw new ApiError(400, 'Le mot de passe doit contenir au moins 8 caractères');
  }
  if (!/^\S+@\S+\.\S+$/.test(String(email))) {
    throw new ApiError(400, "L'adresse email n'est pas valide");
  }

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'Cet email est déjà utilisé');
  }

  const user = await User.create({ name, email, password });
  if (req.cartOwner?.sessionId) {
    await mergeGuestCart(user._id, req.cartOwner.sessionId);
  }

  res.status(201).json({ token: signToken(user._id), user: publicUser(user) });
});

/**
 * POST /api/auth/login { email, password }
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email et mot de passe sont requis');
  }

  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(String(password)))) {
    throw new ApiError(401, 'Identifiants incorrects');
  }

  if (req.cartOwner?.sessionId) {
    await mergeGuestCart(user._id, req.cartOwner.sessionId);
  }

  res.json({ token: signToken(user._id), user: publicUser(user) });
});

/**
 * GET /api/auth/me — profil de l'utilisateur connecté.
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(401, 'Utilisateur introuvable');

  res.json({ user: publicUser(user) });
});
