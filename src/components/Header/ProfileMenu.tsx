import { useState } from 'react';
import {
  DEFAULT_PROFILE_ID,
  MAX_PROFILES,
  addProfile,
  deleteProfile,
  loadProfiles,
  renameProfile,
  setActiveProfile,
} from '../../utils/profiles';
import styles from './Header.module.css';

/** Every saved store reads its profile when the page loads, so switching reloads */
function switchTo(id: string) {
  setActiveProfile(id);
  window.location.reload();
}

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [{ profiles, activeId }, setData] = useState(loadProfiles);
  const active = profiles.find((p) => p.id === activeId) ?? profiles[0];
  const refresh = () => setData(loadProfiles());

  const add = () => {
    const name = window.prompt('Name of the new learner:')?.trim();
    if (!name) return;
    const profile = addProfile(name);
    if (profile) switchTo(profile.id);
  };

  const rename = () => {
    const name = window.prompt('New name:', active.name)?.trim();
    if (!name) return;
    renameProfile(active.id, name);
    refresh();
  };

  const remove = () => {
    if (!window.confirm(`Delete ${active.name} and all of their progress?`)) return;
    deleteProfile(active.id);
    window.location.reload();
  };

  return (
    <div className={styles.profile}>
      <button className={styles.profileBtn} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={styles.avatar}>{active.name.slice(0, 1).toUpperCase()}</span>
        {active.name} ▾
      </button>
      {open && (
        <div className={styles.profileMenu}>
          <span className={styles.profileHeading}>Learners</span>
          {profiles.map((p) => (
            <button
              key={p.id}
              className={p.id === activeId ? styles.profileActive : ''}
              onClick={() => (p.id === activeId ? setOpen(false) : switchTo(p.id))}
            >
              <span className={styles.avatar}>{p.name.slice(0, 1).toUpperCase()}</span>
              {p.name}
            </button>
          ))}
          {profiles.length < MAX_PROFILES && <button onClick={add}>+ Add learner</button>}
          <div className={styles.profileActions}>
            <button onClick={rename}>Rename</button>
            {active.id !== DEFAULT_PROFILE_ID && <button onClick={remove}>Delete</button>}
          </div>
          <span className={styles.profileNote}>Each learner keeps their own course, ear-training and workout progress.</span>
        </div>
      )}
    </div>
  );
}
