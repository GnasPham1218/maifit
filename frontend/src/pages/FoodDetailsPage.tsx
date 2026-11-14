import { ArrowLeft, Bot, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../components/Button';
import { FoodDetailsView } from '../components/food/FoodDetailsView';
import { PREPARATION_LABELS } from '../constants/meal';
import NotFoundPage from './NotFoundPage';

// /foods/:id — a shareable page for one food. Tabs switch the id in the URL (replace: Back leaves the page
// instead of stepping through every tab).
export default function FoodDetailsPage() {
  const { id: param } = useParams();
  const navigate = useNavigate();
  const id = Number(param);
  if (!Number.isInteger(id) || id <= 0) return <NotFoundPage />;

  return (
    <div className="grid gap-5">
      <button type="button" onClick={() => navigate(-1)}
        className="inline-flex cursor-pointer items-center gap-1.5 justify-self-start rounded-full py-1 text-sm font-medium text-link transition-colors hover:text-ink">
        <ArrowLeft aria-hidden="true" className="size-4" /> Quay lại
      </button>
      <FoodDetailsView id={id} wide titleAs="h1" onSelect={(next) => navigate(`/foods/${next}`, { replace: true })}
        actions={(variant, details) => {
          const label = `${details.name} ${PREPARATION_LABELS[variant.preparation].toLowerCase()}`;
          return (
            <div className="flex flex-wrap gap-3">
              {/* The meals page opens its add dialog with this exact preparation already chosen */}
              <Button onClick={() => navigate('/meals', { state: { addFoodId: variant.id } })}>
                <Plus aria-hidden="true" className="size-4" /> Thêm vào bữa ăn
              </Button>
              {/* Prefilled, not sent: a question costs one of the day's chats, the user decides */}
              <Button variant="secondary"
                onClick={() => navigate('/chat/new', { state: { draft: `${label} có hợp với mục tiêu của mình không?` } })}>
                <Bot aria-hidden="true" className="size-4" /> Hỏi MBotFit về món này
              </Button>
            </div>
          );
        }} />
    </div>
  );
}
