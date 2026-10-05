export function stripQrActivationCodeFromAddressBar(location, history) {
  const url = new URL(location.href);
  if (!url.searchParams.has('c')) return false;

  url.searchParams.delete('c');
  const safeUrl = `${url.pathname}${url.search}${url.hash}`;
  history.replaceState(history.state, '', safeUrl);
  return true;
}
