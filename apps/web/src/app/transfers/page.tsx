import { TransfersPanel } from '@/features/koi/components/transfers-panel';

export default function TransfersPage() {
  return (
    <div className="stack">
      <section className="hero compact">
        <h1>Transfer Center</h1>
        <p>Request, accept, reject, and audit all ownership transfer flows.</p>
      </section>
      <TransfersPanel />
    </div>
  );
}
