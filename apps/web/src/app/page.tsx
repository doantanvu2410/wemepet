import { FeedList } from '@/features/feed/components/feed-list';

export default function HomePage() {
  return (
    <div className="stack">
      <section className="hero">
        <h1>Social Feed + Koi Registry</h1>
        <p>
          New architecture with production-safe transfer workflow, structured notifications, and modern feed
          performance.
        </p>
      </section>
      <FeedList />
    </div>
  );
}
