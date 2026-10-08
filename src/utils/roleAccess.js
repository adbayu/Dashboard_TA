export function roleCanOpenPath(role, pathname) {
  const adminPath = pathname === '/admin' || pathname.startsWith('/admin/');
  const deviceDetailPath = /^\/iot\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(pathname);
  if (role === 'pengguna') return !adminPath;
  if (role === 'pengelola') {
    return adminPath || pathname === '/profil' || pathname === '/developer' || pathname === '/monitoring' || deviceDetailPath;
  }
  return true;
}

export function loginDestination(role, returnTo) {
  if (typeof returnTo === 'string' && /^\/d\/[A-Z0-9-]{3,32}$/.test(returnTo)) return returnTo;
  return role === 'pengelola' ? '/admin' : '/';
}
