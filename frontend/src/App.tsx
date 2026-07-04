import { RouterProvider } from 'react-router-dom';
import { QueryProvider } from './shared/providers/query.provider';
import { router } from './routes';

export default function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  );
}