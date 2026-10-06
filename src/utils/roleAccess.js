export function roleCanOpenPath(role, pathname) {
  const adminPath = pathname === '/admin' || pathname.startsWith('/admin/');
  if (role === 'pengguna') return !adminPath;
  if (role === 'pengelola') {
    return adminPath || pathname === '/profil' || pathname === '/developer' || pathname === '/monitoring';
  }
  return true;
}

export function loginDestination(role, returnTo) {
  if (typeof returnTo === 'string' && /^\/d\/[A-Z0-9-]{3,32}$/.test(returnTo)) return returnTo;
  return role === 'pengelola' ? '/admin' : '/';
}
