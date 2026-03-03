import { KoiList } from '@/features/koi/components/koi-list';

export default function KoiPage() {
  return (
    <div className="stack">
      <section className="hero compact">
        <h1>Koi Registry</h1>
        <p>Track approved koi profiles and owner identity with transfer-safe ownership records.</p>
      </section>
      <KoiList />
    </div>
  );
}
