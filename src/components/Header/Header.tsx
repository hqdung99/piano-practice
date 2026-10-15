import { ProfileMenu } from './ProfileMenu';
import styles from './Header.module.css';

interface HeaderProps {
  onOpenTrainer: () => void;
}

export function Header({ onOpenTrainer }: HeaderProps) {
  return (
    <header className={styles.header}>
      <ProfileMenu />
      <h1 className={styles.title}>Virtual Piano</h1>
      <p className={styles.subtitle}>
        Play with your mouse or keyboard &middot; 88 keys
      </p>
      <button className={styles.trainerBtn} onClick={onOpenTrainer}>
        Ear Trainer
      </button>
    </header>
  );
}
