import { MotionConfig } from 'motion/react';
import { RouterProvider } from 'react-router/dom';
import { AuthProvider } from './providers/AuthProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { router } from './routes';

export default function App() {
  return (
    // reducedMotion "user": Motion follows the system setting (no movement for people who asked for less)
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
