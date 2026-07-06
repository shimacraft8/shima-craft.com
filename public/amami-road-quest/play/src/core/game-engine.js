import { clamp } from './route-engine.js';

export class GameEngine {
  constructor(route) {
    this.route = route;
    this.reset();
  }

  reset() {
    this.score = 0;
    this.progress = 0;
    this.completedCheckpoints = new Set();
    this.quizAnswered = false;
    this.quizCorrect = null;
    this.goalReached = false;
  }

  setProgress(progress) {
    this.progress = clamp(progress, 0, 1);
    const events = [];
    for (let i = 0; i < this.route.checkpoints.length; i += 1) {
      const checkpoint = this.route.checkpoints[i];
      if (this.progress >= checkpoint.progress && !this.completedCheckpoints.has(i)) {
        this.completedCheckpoints.add(i);
        this.score += checkpoint.points;
        events.push({ type: 'checkpoint', index: i, checkpoint });
      }
    }
    if (this.progress >= this.route.quiz.progress && !this.quizAnswered) {
      events.push({ type: 'quiz', quiz: this.route.quiz });
    }
    if (this.progress >= 1 && !this.goalReached) {
      this.goalReached = true;
      this.score += 300;
      events.push({ type: 'goal' });
    }
    return events;
  }

  answerQuiz(choiceIndex) {
    if (this.quizAnswered) return { accepted: false, correct: this.quizCorrect, points: 0 };
    this.quizAnswered = true;
    this.quizCorrect = choiceIndex === this.route.quiz.correct;
    const points = this.quizCorrect ? this.route.quiz.points : 0;
    this.score += points;
    return { accepted: true, correct: this.quizCorrect, points };
  }

  get accuracy() {
    if (!this.quizAnswered) return null;
    return this.quizCorrect ? 100 : 0;
  }

  get discoveries() {
    return this.completedCheckpoints.size;
  }

  snapshot() {
    return {
      routeId: this.route.id,
      score: this.score,
      progress: this.progress,
      discoveries: this.discoveries,
      quizAnswered: this.quizAnswered,
      quizCorrect: this.quizCorrect,
      goalReached: this.goalReached
    };
  }
}

export function getNextCheckpoint(route, progress) {
  return route.checkpoints.find((checkpoint) => checkpoint.progress > progress) ?? null;
}
