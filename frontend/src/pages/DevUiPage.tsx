import { Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '../components/Alert';
import { Avatar } from '../components/Avatar';
import { BigNumber } from '../components/BigNumber';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { FormField } from '../components/FormField';
import { MacroBars } from '../components/MacroBars';
import { MacroDonut } from '../components/MacroDonut';
import { Modal } from '../components/Modal';
import { SegmentedTabs } from '../components/SegmentedTabs';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

// Development only (route added when import.meta.env.DEV): every base component in one place,
// to check both themes and the animations before the pages use them. Sample numbers, not user data.
export default function DevUiPage() {
  const [eaten, setEaten] = useState(1240);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [prep, setPrep] = useState('BOILED');
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto grid max-w-5xl gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl font-bold">Component nền</h1>
        <ThemeSwitcher />
      </header>

      <Card title="Nút">
        <div className="flex flex-wrap gap-3">
          <Button><Save aria-hidden="true" className="size-4" />Lưu set</Button>
          <Button variant="secondary"><Plus aria-hidden="true" className="size-4" />Thêm món</Button>
          <Button variant="ghost">Xem chi tiết</Button>
          <Button variant="danger">Xoá</Button>
          <Button size="sm">Nhỏ</Button>
          <Button size="lg">Lớn</Button>
          <Button disabled>Đang tắt</Button>
        </div>
      </Card>

      <Card tone="hero" title="Khối nổi bật (hero)">
        <div className="flex flex-wrap items-center gap-8">
          <MacroDonut eatenKcal={eaten} targetKcal={2100} proteinG={86} carbG={148} fatG={38}
            label={`Đã nạp ${eaten} trên 2100 kcal`}>
            <BigNumber value={eaten} className="text-5xl leading-none" />
            <span className="text-sm text-hero-muted">/ 2.100 kcal</span>
          </MacroDonut>
          <div className="min-w-64 flex-1">
            <MacroBars onHero rows={[
              { key: 'protein', value: 86, target: 140 },
              { key: 'carb', value: 148, target: 260 },
              { key: 'fat', value: 38, target: 70 },
              { key: 'fiber', value: 18, target: 30 },
            ]} />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => setEaten((v) => v + 227)}>Thêm 227 kcal</Button>
          <Button variant="hero" onClick={() => setEaten(1240)}>Đặt lại</Button>
        </div>
      </Card>

      <Card title="Chip, tab, ảnh đại diện">
        <div className="grid gap-5">
          <div className="flex flex-wrap gap-2">
            {[['RAW', 'Sống'], ['BOILED', 'Luộc'], ['GRILLED', 'Nướng'], ['FRIED', 'Chiên']].map(([id, label]) => (
              <Chip key={id} selected={prep === id} onClick={() => setPrep(id)}>{label}</Chip>
            ))}
          </div>
          <SegmentedTabs label="Khoảng thời gian" value={period} onChange={setPeriod}
            items={[{ id: 'day', label: 'Hôm nay' }, { id: 'week', label: 'Tuần này' }, { id: 'month', label: 'Tháng này' }]} />
          <div className="flex flex-wrap items-end gap-6">
            <Avatar name="Sang" size={96} premium />
            <Avatar name="Sang" size={56} premium />
            <Avatar name="Sang" size={36} premium />
            <Avatar name="Hà" size={96} />
            <Avatar name="Hà" size={56} />
            <Avatar name="Hà" size={36} />
          </div>
        </div>
      </Card>

      <Card title="Ô nhập, thông báo, hộp thoại">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Số gram" name="dev-grams" defaultValue="150" inputMode="decimal" />
          <FormField label="Email" name="dev-email" type="email" error="Email không hợp lệ" />
        </div>
        <div className="mt-4 grid gap-2">
          <Alert type="info">Thông tin</Alert>
          <Alert type="success">Đã lưu</Alert>
          <Alert type="error">Có lỗi</Alert>
        </div>
        <Button className="mt-2" onClick={() => setOpen(true)}>Mở hộp thoại</Button>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Thêm món vào bữa trưa"
        footer={<Button className="w-full" onClick={() => setOpen(false)}>Thêm vào bữa trưa</Button>}>
        <div className="grid gap-4">
          <FormField label="Tìm món" name="dev-search" defaultValue="ức gà" />
          <p className="text-sm text-muted">Esc, nút Đóng hoặc bấm ra ngoài đều đóng. Tab chỉ đi trong hộp thoại.</p>
        </div>
      </Modal>
    </div>
  );
}
