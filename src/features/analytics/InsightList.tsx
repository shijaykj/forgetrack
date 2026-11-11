import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Insight } from '@/domain/insights';
import { Icon, type IconName } from '@/components/Icon';
import { cx } from '@/lib/util';

const ICON: Record<Insight['tone'], IconName> = { up: 'arrowUp', down: 'arrowDown', record: 'trophy', neutral: 'info' };

export function InsightList({ insights }: { insights: Insight[] }) {
  if (!insights.length) return <p className="muted">Insights appear once you've logged a few sessions.</p>;
  return (
    <ul className="insights">
      {insights.map((ins, i) => {
        const body = (
          <>
            <span className={cx('ins-icon', `ins-${ins.tone}`)}>
              <Icon name={ICON[ins.tone]} size={16} strokeWidth={2.2} />
            </span>
            <span className="ins-text">
              <span className="ins-title">{ins.title}</span>
              {ins.detail && <span className="ins-detail faint">{ins.detail}</span>}
            </span>
            {ins.exerciseId && <Icon name="chevronRight" size={16} className="faint" />}
          </>
        );
        return (
          <motion.li key={ins.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
            {ins.exerciseId ? (
              <Link to={`/exercises/${ins.exerciseId}`} className="ins">
                {body}
              </Link>
            ) : (
              <div className="ins">{body}</div>
            )}
          </motion.li>
        );
      })}
    </ul>
  );
}
