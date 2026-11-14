import { Navigate, createBrowserRouter } from 'react-router';
import { GuestRoute } from './components/GuestRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';
import WorkoutLayout from './layouts/WorkoutLayout';
import ChatPage from './pages/ChatPage';
import FoodDetailsPage from './pages/FoodDetailsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import HomePage from './pages/HomePage';
import LeaderboardPage from './pages/LeaderboardPage';
import LoginPage from './pages/LoginPage';
import MealsPage from './pages/MealsPage';
import NotFoundPage from './pages/NotFoundPage';
import PremiumPage from './pages/PremiumPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import WorkoutPage from './pages/WorkoutPage';

export const router = createBrowserRouter([
  // Component gallery, development only: import.meta.env.DEV is false in a production build, so this
  // route and its lazily imported page are dropped from the bundle
  ...(import.meta.env.DEV
    ? [{ path: '/dev/ui', lazy: async () => ({ Component: (await import('./pages/DevUiPage')).default }) }]
    : []),
  {
    // Logged-in area
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: '/', element: <HomePage />, handle: { title: 'Trang chủ', greeting: true } },
          { path: '/meals', element: <MealsPage />, handle: { title: 'Ăn uống' } },
          { path: '/foods/:id', element: <FoodDetailsPage />, handle: { title: 'Chi tiết món', ownHeading: true } },
          {
            path: '/workout',
            element: <WorkoutLayout />,
            handle: { title: 'Tập luyện' },
            children: [
              { index: true, element: <WorkoutPage /> },
              { path: 'leaderboard', element: <LeaderboardPage /> },
            ],
          },
          // Old address (bookmarks, shared links) -> the leaderboard tab
          { path: '/leaderboard', element: <Navigate to="/workout/leaderboard" replace /> },
          { path: '/chat', element: <ChatPage />, handle: { title: 'MBotFit' } },
          { path: '/chat/:conversationId', element: <ChatPage />, handle: { title: 'MBotFit' } },
          // Not in the nav any more; reachable until step 9 moves the payment flow into the profile
          { path: '/premium', element: <PremiumPage />, handle: { title: 'Premium' } },
          { path: '/profile', element: <ProfilePage />, handle: { title: 'Hồ sơ' } },
        ],
      },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      {
        // Only for visitors who are NOT logged in
        element: <GuestRoute />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
        ],
      },
      // Opened from email links: work whether logged in or not
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
