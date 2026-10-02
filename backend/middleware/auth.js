/**
 * Authentication middleware.
 * The React app signs in with Supabase Auth and sends "Authorization: Bearer <access token>".
 * We verify the token with Supabase and attach:
 *   req.user = { id, email, isAnonymous }
 *   req.db   = Supabase service-role client (services filter by req.user.id)
 */
const { AppError } = require('./errorHandler');
const { admin, forUser } = require('../lib/supabase');

async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw new AppError('Please log in to continue.', 401);

  const { data, error } = await admin().auth.getUser(token);
  if (error || !data?.user) throw new AppError('Your session has expired. Please log in again.', 401);

  req.user = { id: data.user.id, email: data.user.email || '', isAnonymous: Boolean(data.user.is_anonymous), metadata: data.user.user_metadata || {} };
  req.accessToken = token;
  req.db = forUser();
  next();
}

module.exports = { protect };
