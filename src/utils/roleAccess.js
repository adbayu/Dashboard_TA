export function roleCanOpenPath(role, pathname) {
  const adminPath = pathname === '/admin' || pathname.startsWith('/admin/');
  if (role === 'pengguna') return !adminPath;
  if (role === 'pengelola') {
    return adminPath || pathname === '/profil' || pathname === '/developer' || pathname === '/monitoring';
  }
  return true;
}
