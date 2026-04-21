interface StepHeaderProps {
  step: number;
  totalSteps: number;
  title: string;
  description: string;
}

export function StepHeader({ step, totalSteps, title, description }: StepHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
          Step {step} of {totalSteps}
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground font-nunito">{title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex gap-2">
        {Array.from({ length: totalSteps }, (_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all ${
              index + 1 <= step ? 'w-12 bg-primary' : 'w-6 bg-border'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
