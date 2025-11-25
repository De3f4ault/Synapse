import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

/**
 * 404 Not Found Page
 */

export function NotFoundPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary p-4">
        <div className="text-center space-y-6">
        <div className="space-y-2">
        <h1 className="text-9xl font-bold text-primary">404</h1>
        <h2 className="text-3xl font-semibold">Page Not Found</h2>
        <p className="text-muted-foreground">
        The page you're looking for doesn't exist or has been moved.
        </p>
        </div>

        <div className="flex items-center justify-center gap-4">
        <Button variant="outline" onClick={() => window.history.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Go Back
        </Button>

        <Link to="/dashboard">
        <Button>
        <Home className="mr-2 h-4 w-4" />
        Go Home
        </Button>
        </Link>
        </div>
        </div>
        </div>
    );
}
