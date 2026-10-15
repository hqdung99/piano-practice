import { useEffect, useState } from 'react';
import type { DictationQuestion } from '../../../utils/earTraining/dictation';
import type { ModuleProps } from '../types';
import { TopBar } from '../TopBar';
import { AudiationQuestion } from './AudiationQuestion';
import { MatchQuestion } from './MatchQuestion';
import { MelodicQuestion } from './MelodicQuestion';
import { RhythmQuestion } from './RhythmQuestion';
import { TapQuestion } from './TapQuestion';
import { TwoVoiceQuestion } from './TwoVoiceQuestion';
import shell from '../EarTrainer.module.css';

interface DictationRunProps {
  title: string;
  questions: DictationQuestion[];
  module: ModuleProps;
  onFinish: (results: boolean[]) => void;
  onBack: () => void;
}

/** Steps through a round, one question screen at a time */
export function DictationRun({ title, questions, module, onFinish, onBack }: DictationRunProps) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const { stop } = module.player;

  // Leaving mid-sound shouldn't leave notes ringing
  useEffect(() => stop, [stop]);

  const question = questions[index];
  const isLast = index === questions.length - 1;

  const onChecked = (correct: boolean) => {
    // Each question counts once
    if (results.length > index) return;
    setResults((r) => [...r, correct]);
    module.onRecord('dictation', correct);
  };

  const onNext = () => {
    if (isLast) onFinish(results);
    else setIndex((i) => i + 1);
  };

  const shared = { module, onChecked, onNext, isLast };
  let body;
  switch (question.kind) {
    case 'melodic':
      body = <MelodicQuestion key={index} question={question} {...shared} />;
      break;
    case 'rhythm':
      body = <RhythmQuestion key={index} question={question} {...shared} />;
      break;
    case 'tap':
      body = <TapQuestion key={index} question={question} {...shared} />;
      break;
    case 'twoVoice':
      body = <TwoVoiceQuestion key={index} question={question} {...shared} />;
      break;
    case 'match':
      body = <MatchQuestion key={index} question={question} {...shared} />;
      break;
    case 'audiation':
      body = <AudiationQuestion key={index} question={question} {...shared} />;
      break;
  }

  return (
    <div className={shell.screen}>
      <TopBar title={title} onBack={onBack} progress={{ done: index + 1, total: questions.length }} />
      {body}
    </div>
  );
}
