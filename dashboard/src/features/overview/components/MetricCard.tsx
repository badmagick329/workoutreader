import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type IconComponent = React.ComponentType<{ className?: string }>;

export function MetricCard({
  title,
  value,
  subtext,
  icon: Icon,
  colorClass,
}: {
  title: string;
  value: string | number;
  subtext: string;
  icon: IconComponent;
  colorClass: string;
}) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${colorClass}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-zinc-100">{value}</div>
        <p className="text-xs text-zinc-500 mt-1">{subtext}</p>
      </CardContent>
    </Card>
  );
}
