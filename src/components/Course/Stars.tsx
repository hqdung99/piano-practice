import styles from './Course.module.css';

export function Stars({ count }: { count: number }) {
  return (
    <span className={styles.stars} aria-label={`${count} of 3 stars`}>
      {[1, 2, 3].map((s) => (
        <span key={s} className={s <= count ? styles.starOn : styles.starOff}>
          ★
        </span>
      ))}
    </span>
  );
}
