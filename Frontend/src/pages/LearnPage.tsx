import { useState } from "react";
import { useSeoMeta } from "@unhead/react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Lock,
  Trophy,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useWallet } from "@/hooks/useWallet";
import { useToast } from "@/hooks/useToast";
import { LESSONS, type Lesson } from "@/lib/lessons";
import { cn } from "@/lib/utils";

interface LearnProgress {
  completed: string[]; // lesson ids
  earnedBtc: number;
}

const DEFAULT_PROGRESS: LearnProgress = { completed: [], earnedBtc: 0 };

export default function LearnPage() {
  useSeoMeta({
    title: "Learn — MiraBit",
    description: "Beginner-friendly Bitcoin lessons. Earn sats as you learn.",
  });

  const [progress] = useLocalStorage<LearnProgress>("mirabit:learn:v1", DEFAULT_PROGRESS);
  const [openLesson, setOpenLesson] = useState<Lesson | null>(null);

  if (openLesson) {
    return (
      <LessonView
        lesson={openLesson}
        onClose={() => setOpenLesson(null)}
        alreadyCompleted={progress.completed.includes(openLesson.id)}
      />
    );
  }

  const completedCount = progress.completed.length;
  const percent = Math.round((completedCount / LESSONS.length) * 100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Learn</h1>
        <p className="text-muted-foreground mt-1">
          Beginner-friendly lessons. Pass the quiz at the end and earn sats.
        </p>
      </div>

      {/* Progress hero */}
      <Card className="overflow-hidden">
        <div className="p-6 md:p-8 bg-gradient-to-br from-amber-100 via-orange-50 to-rose-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-rose-950/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <GraduationCap className="h-4 w-4" /> Your learning journey
              </div>
              <div className="mt-2 text-3xl md:text-4xl font-extrabold">
                {completedCount} / {LESSONS.length}{" "}
                <span className="text-muted-foreground font-medium text-lg">lessons</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Sats earned</div>
              <div className="mt-1 text-2xl font-bold text-primary">
                +{progress.earnedBtc.toFixed(8)} ₿
              </div>
            </div>
          </div>
          <Progress value={percent} className="mt-5 h-2.5" />
          {completedCount === LESSONS.length && (
            <div className="mt-4 flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium text-sm">
              <Trophy className="h-4 w-4" /> You've completed every lesson. Nice work! 🎉
            </div>
          )}
        </div>
      </Card>

      {/* Lesson list */}
      <div className="space-y-3">
        {LESSONS.map((lesson, i) => {
          const done = progress.completed.includes(lesson.id);
          const prevDone = i === 0 || progress.completed.includes(LESSONS[i - 1].id);
          const locked = !done && !prevDone;

          return (
            <button
              key={lesson.id}
              type="button"
              disabled={locked}
              onClick={() => setOpenLesson(lesson)}
              className={cn(
                "w-full text-left rounded-2xl border p-4 md:p-5 transition-all",
                done && "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/40",
                !done && !locked && "hover:border-primary hover:shadow-md bg-card",
                locked && "opacity-60 cursor-not-allowed bg-muted/30",
              )}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center text-2xl shrink-0",
                    done
                      ? "bg-emerald-500 text-white"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {done ? <CheckCircle2 className="h-6 w-6" /> : lesson.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{lesson.title}</h3>
                    {done && (
                      <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                        Completed
                      </Badge>
                    )}
                    {locked && (
                      <Badge variant="outline" className="text-muted-foreground gap-1">
                        <Lock className="h-3 w-3" /> Locked
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                    {lesson.summary}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{lesson.duration}</span>
                    <span className="flex items-center gap-1 text-primary font-medium">
                      <Sparkles className="h-3 w-3" />
                      Earn {lesson.rewardBtc.toFixed(8)} ₿
                    </span>
                  </div>
                </div>
                {!locked && (
                  <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Want to put what you learned into practice?{" "}
            <Link to="/app/savings" className="text-primary font-medium hover:underline">
              Start saving in BTC →
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function LessonView({
  lesson,
  onClose,
  alreadyCompleted,
}: {
  lesson: Lesson;
  onClose: () => void;
  alreadyCompleted: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { reward } = useWallet();
  const { toast } = useToast();
  const [progress, setProgress] = useLocalStorage<LearnProgress>(
    "mirabit:learn:v1",
    DEFAULT_PROGRESS,
  );

  const isCorrect = selected === lesson.answerIndex;

  const handleSubmit = () => {
    if (selected === null) return;
    setSubmitted(true);
    if (isCorrect && !alreadyCompleted) {
      reward(lesson.rewardBtc, `Lesson reward: ${lesson.title}`);
      setProgress((prev) => ({
        completed: prev.completed.includes(lesson.id)
          ? prev.completed
          : [...prev.completed, lesson.id],
        earnedBtc: prev.earnedBtc + lesson.rewardBtc,
      }));
      toast({
        title: "Correct! +sats earned",
        description: `Added ${lesson.rewardBtc.toFixed(8)} ₿ to your wallet.`,
      });
    }
  };

  const handleRetry = () => {
    setSelected(null);
    setSubmitted(false);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={onClose} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to lessons
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-3xl">
          {lesson.emoji}
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{lesson.title}</h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span>{lesson.duration}</span>
            <span className="flex items-center gap-1 text-primary font-medium">
              <Sparkles className="h-3 w-3" />
              Earn {lesson.rewardBtc.toFixed(8)} ₿
            </span>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 md:p-8 prose-content space-y-4">
          {lesson.content.map((p, i) => (
            <p key={i} className="text-base leading-relaxed">
              {p}
            </p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Quick check
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium mb-4">{lesson.question}</p>
          <div className="space-y-2">
            {lesson.options.map((option, i) => {
              const isThisCorrect = submitted && i === lesson.answerIndex;
              const isThisWrong = submitted && i === selected && !isCorrect;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={submitted}
                  onClick={() => setSelected(i)}
                  className={cn(
                    "w-full text-left rounded-xl border p-4 transition-all",
                    !submitted && selected === i && "border-primary bg-primary/5",
                    !submitted && selected !== i && "hover:border-primary/50",
                    isThisCorrect && "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
                    isThisWrong && "border-rose-500 bg-rose-50 dark:bg-rose-950/30",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{option}</span>
                    {isThisCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>

          {submitted && (
            <div
              className={cn(
                "mt-4 rounded-xl p-4 text-sm",
                isCorrect
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100"
                  : "bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100",
              )}
            >
              <div className="font-semibold mb-1">
                {isCorrect ? "✅ Correct!" : "❌ Not quite"}
              </div>
              <p>{lesson.explanation}</p>
            </div>
          )}

          <div className="mt-5 flex gap-2 justify-end">
            {submitted && !isCorrect && (
              <Button variant="outline" onClick={handleRetry}>
                Try again
              </Button>
            )}
            {!submitted ? (
              <Button onClick={handleSubmit} disabled={selected === null}>
                Submit answer
              </Button>
            ) : (
              <Button onClick={onClose}>
                {isCorrect ? "Continue" : "Back to lessons"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
