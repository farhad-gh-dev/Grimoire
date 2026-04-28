import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="card card-detail text-center">
      <h1 className="text-xl text-text-primary mb-2">Page not found</h1>
      <p className="text-sm text-text-muted mb-5">The page you tried to open does not exist.</p>
      <Link to="/prompts" className="btn-primary">Back to library</Link>
    </div>
  );
}
