import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useParams, useLocation, type RouteObject } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Spinner } from '@/components/ui/Spinner';
import { useSettingsStore } from '@/stores/settingsStore';
import type { StoreLang } from '@/utils/seoPaths';

const Home = lazy(() => import('@/pages/Home'));
const Shop = lazy(() => import('@/pages/Shop'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
const Cart = lazy(() => import('@/pages/Cart'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const OrderConfirmation = lazy(() => import('@/pages/OrderConfirmation'));
const Wishlist = lazy(() => import('@/pages/Wishlist'));
const ReviewsPage = lazy(() => import('@/pages/ReviewsPage'));
const Labresults = lazy(() => import('@/pages/Labresults'));
const LabReportDetail = lazy(() => import('@/pages/LabReportDetail'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const Contact = lazy(() => import('@/pages/Contact'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const VerifyEmail = lazy(() => import('@/pages/VerifyEmail'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Terms = lazy(() => import('@/pages/Terms'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const Shipping = lazy(() => import('@/pages/Shipping'));

const AccountLayout = lazy(() => import('@/components/account/AccountLayout').then((m) => ({ default: m.AccountLayout })));
const AccountDashboard = lazy(() => import('@/pages/account/Dashboard'));
const AccountProfile = lazy(() => import('@/pages/account/Profile'));
const OrderHistory = lazy(() => import('@/pages/account/OrderHistory'));
const OrderDetail = lazy(() => import('@/pages/account/OrderDetail'));
const Addresses = lazy(() => import('@/pages/account/Addresses'));

const AdminLayout = lazy(() => import('@/components/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminOrders = lazy(() => import('@/pages/admin/Orders'));
const AdminProducts = lazy(() => import('@/pages/admin/Products'));
const AdminReviews = lazy(() => import('@/pages/admin/Reviews'));
const AdminCoupons = lazy(() => import('@/pages/admin/Coupons'));
const AdminBlog = lazy(() => import('@/pages/admin/Blog'));
const AdminUsers = lazy(() => import('@/pages/admin/Users'));
const AdminAnalytics = lazy(() => import('@/pages/admin/Analytics'));
const AdminSubscribers = lazy(() => import('@/pages/admin/Subscribers'));
const AdminContact = lazy(() => import('@/pages/admin/Contact'));
const AdminSettings = lazy(() => import('@/pages/admin/Settings'));
const AdminCategories = lazy(() => import('@/pages/admin/Categories'));
const AdminLabels = lazy(() => import('@/pages/admin/Labels'));
const AdminSEO = lazy(() => import('@/pages/admin/SEO'));

const BlogPage = lazy(() => import('@/pages/Blog'));
const BlogPostPage = lazy(() => import('@/pages/BlogPost'));

const NotFound = lazy(() => import('@/pages/NotFound'));

function withSuspense(node: React.ReactNode) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Spinner size={28} className="text-primary" />
        </div>
      }
    >
      {node}
    </Suspense>
  );
}

/**
 * Redirect legacy /nl|/en|/de path prefixes to ?lang= on the same host.
 */
function LegacyLangRedirect() {
  const { '*': rest } = useParams<{ '*': string }>();
  const location = useLocation();
  const prefix = location.pathname.split('/')[1] as StoreLang;
  const inner = rest ? `/${rest}` : '/';
  const params = new URLSearchParams(location.search.replace(/^\?/, ''));
  if (prefix === 'en' || prefix === 'de') {
    params.set('lang', prefix);
  } else if (prefix === 'nl') {
    params.delete('lang');
  }
  const qs = params.toString();
  const target = `${inner}${qs ? `?${qs}` : ''}${location.hash}`;
  return <Navigate to={target} replace />;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: withSuspense(<Home />) },
      { path: 'shop', element: withSuspense(<Shop />) },
      { path: 'shop/:categorySlug', element: withSuspense(<Shop />) },
      { path: 'shop/peptides/:category/:slug', element: withSuspense(<ProductDetail />) },
      { path: 'product/:slug', element: withSuspense(<ProductDetail />) },
      { path: ':slug', element: withSuspense(<ProductDetail />) },
      { path: 'cart', element: withSuspense(<Cart />) },
      { path: 'checkout', element: withSuspense(<Checkout />) },
      { path: 'order-confirmation', element: withSuspense(<OrderConfirmation />) },
      { path: 'wishlist', element: withSuspense(<Wishlist />) },
      { path: 'reviews', element: withSuspense(<ReviewsPage />) },
      { path: 'labresults/:slug', element: withSuspense(<LabReportDetail />) },
      { path: 'labresults', element: withSuspense(<Labresults />) },
      { path: 'faq', element: withSuspense(<FAQ />) },
      { path: 'contact', element: withSuspense(<Contact />) },
      { path: 'blog', element: withSuspense(<BlogPage />) },
      { path: 'blog/:slug', element: withSuspense(<BlogPostPage />) },
      { path: 'privacy', element: withSuspense(<Privacy />) },
      { path: 'terms', element: withSuspense(<Terms />) },
      { path: 'shipping', element: withSuspense(<Shipping />) },
      { path: 'login', element: withSuspense(<Login />) },
      { path: 'register', element: withSuspense(<Register />) },
      { path: 'verify-email', element: withSuspense(<VerifyEmail />) },
      { path: 'reset-password', element: withSuspense(<ResetPassword />) },
      {
        path: 'account',
        element: withSuspense(<AccountLayout />),
        children: [
          { index: true, element: withSuspense(<AccountDashboard />) },
          { path: 'profile', element: withSuspense(<AccountProfile />) },
          { path: 'orders', element: withSuspense(<OrderHistory />) },
          { path: 'orders/:id', element: withSuspense(<OrderDetail />) },
          { path: 'addresses', element: withSuspense(<Addresses />) },
        ],
      },
      {
        path: 'admin',
        element: withSuspense(<AdminLayout />),
        children: [
          { index: true, element: withSuspense(<AdminDashboard />) },
          { path: 'orders', element: withSuspense(<AdminOrders />) },
          { path: 'products', element: withSuspense(<AdminProducts />) },
          { path: 'reviews', element: withSuspense(<AdminReviews />) },
          { path: 'coupons', element: withSuspense(<AdminCoupons />) },
          { path: 'blog', element: withSuspense(<AdminBlog />) },
          { path: 'users', element: withSuspense(<AdminUsers />) },
          { path: 'analytics', element: withSuspense(<AdminAnalytics />) },
          { path: 'subscribers', element: withSuspense(<AdminSubscribers />) },
          { path: 'contact', element: withSuspense(<AdminContact />) },
          { path: 'settings', element: withSuspense(<AdminSettings />) },
          { path: 'categories', element: withSuspense(<AdminCategories />) },
          { path: 'labels', element: withSuspense(<AdminLabels />) },
          { path: 'seo/*', element: withSuspense(<AdminSEO />) },
        ],
      },
      { path: '*', element: withSuspense(<NotFound />) },
    ],
  },
  // Legacy path-prefix redirects: /nl/..., /en/..., /de/... -> query-param equivalents
  { path: '/nl/*', element: <LegacyLangRedirect /> },
  { path: '/en/*', element: <LegacyLangRedirect /> },
  { path: '/de/*', element: <LegacyLangRedirect /> },
] as RouteObject[]);

export default function App() {
  useEffect(() => {
    const load = () => useSettingsStore.getState().fetchSettings();
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(load, { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(load, 1000);
    return () => clearTimeout(id);
  }, []);

  return <RouterProvider router={router} />;
}
