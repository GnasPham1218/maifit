import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <div className="center">
      <div>
        <h2>Không tìm thấy trang</h2>
        <Link to="/">Về trang chủ</Link>
      </div>
    </div>
  );
}
