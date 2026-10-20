export function mapSessionUser(user, existingUsers = []) {
  const email = (user?.email || '').trim().toLowerCase();
  const profile = existingUsers.find(candidate => (candidate.email || '').trim().toLowerCase() === email);
  const { password, ...metadata } = profile || {};
  void password;

  return {
    ...metadata,
    id: user.id,
    email,
    name: profile?.name?.trim() || email,
    role: user.role === 'admin' ? 'pengelola' : user.role === 'partner' ? 'mitra' : 'pengguna',
    status: 'aktif',
  };
}
