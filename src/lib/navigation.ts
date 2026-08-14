export function isRouteActive(pathname: string, href: string): boolean {
  if (!pathname || !href) return false;

  // Exact matching for dashboard
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }

  // Exact matching for admin control root
  if (href === '/admin') {
    return pathname === '/admin';
  }

  // Matching for fuel rates under admin
  if (href === '/admin/fuel-rates') {
    return pathname.startsWith('/admin/fuel-rates');
  }

  // Vehicles matching (excluding maintenance)
  if (href === '/vehicles') {
    return pathname.startsWith('/vehicles') && !pathname.startsWith('/maintenance');
  }

  // Dedicated maintenance route
  if (href === '/maintenance') {
    return pathname.startsWith('/maintenance');
  }

  // Trip estimator / rides route
  if (href === '/estimator') {
    return pathname.startsWith('/estimator');
  }

  // Usage bills route
  if (href.startsWith('/invoices')) {
    return pathname.startsWith('/invoices');
  }

  return pathname === href;
}
