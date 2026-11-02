import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center text-muted">
      <div>
        <h2 className="mb-2 text-xl font-semibold">Không tìm thấy trang</h2>
        <Link to="/">Về trang chủ</Link>
      </div>
    </div>
  );
}
