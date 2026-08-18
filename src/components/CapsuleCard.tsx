import Link from "next/link";
import Countdown from "@/components/Countdown";
import WeatherMemory from "@/components/WeatherMemory";
import WeatherCapsule from "@/components/WeatherCapsule";
import KeywordChips from "@/components/KeywordChips";
import { formatOpenAt, isCapsuleOpen, type CapsuleListItem } from "@/lib/capsules";
import { hasCapsuleLook } from "@/lib/capsule-mood";

type CapsuleCardProps = {
  capsule: CapsuleListItem;
  isMine?: boolean;
};

export default function CapsuleCard({ capsule, isMine }: CapsuleCardProps) {
  const opened = isCapsuleOpen(capsule.open_at);
  const custom = hasCapsuleLook({
    form: capsule.capsule_form,
    primary: capsule.capsule_primary,
  });

  return (
    <Link
      href={`/capsule/${capsule.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        className="relative aspect-[4/3] bg-slate-100"
        style={
          custom && capsule.capsule_secondary
            ? {
                background: `linear-gradient(180deg, ${capsule.capsule_secondary}, #f8fafc)`,
              }
            : undefined
        }
      >
        {custom ? (
          <div className="flex h-full items-end justify-center pb-3 pt-6">
            <WeatherCapsule
              size="card"
              form={capsule.capsule_form}
              primary={capsule.capsule_primary}
              secondary={capsule.capsule_secondary}
              accent={capsule.capsule_accent}
            />
          </div>
        ) : capsule.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capsule.thumbnail}
            alt=""
            className={`h-full w-full object-cover transition ${opened ? "" : "blur-sm"}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-slate-300">
            ✉️
          </div>
        )}
        <div className="absolute left-3 top-3">
          <Countdown key={capsule.open_at} openAt={capsule.open_at} compact />
        </div>
        {isMine ? (
          <span className="absolute right-3 top-3 rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-white">
            내 캡슐
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-800">{capsule.recipient}</h3>
          {capsule.imageCount > 0 ? (
            <span className="shrink-0 text-xs text-slate-400">
              📷 {capsule.imageCount}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-slate-500">
          {opened ? "열람일 도달" : "열람까지"} · {formatOpenAt(capsule.open_at)}
        </p>
        <WeatherMemory
          compact
          condition={capsule.weather_condition}
          temperature={capsule.weather_temp}
          humidity={capsule.weather_humidity}
        />
        <KeywordChips
          align="start"
          keywords={capsule.keywords}
          accent={capsule.capsule_accent}
        />
      </div>
    </Link>
  );
}
