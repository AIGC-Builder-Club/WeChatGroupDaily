import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArchiveCalendar } from "@/components/archive-calendar";
import { loadAllReports } from "@/lib/archive";
import { toArchiveCalendarEvents } from "@/lib/archive-calendar-events";
import { decodeRouteName, getPeopleStaticParams } from "@/lib/report-static-params";

type PeoplePageProps = {
  params: Promise<{
    name: string;
  }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getPeopleStaticParams();
}

export async function generateMetadata({ params }: PeoplePageProps): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeRouteName(name);

  return {
    title: `${decodedName} · 群日报人物归档`,
    description: `奇奇怪怪养龙虾群日报中与 ${decodedName} 相关的故事。`,
  };
}

export default async function PeoplePage({ params }: PeoplePageProps) {
  const { name } = await params;
  const decodedName = decodeRouteName(name);
  const reports = loadAllReports();
  const events = toArchiveCalendarEvents(reports);

  if (!events.some((event) => event.meta.participants.some((participant) => participant.name === decodedName))) {
    notFound();
  }

  return (
    <ArchiveCalendar reports={reports} initialPerson={decodedName} />
  );
}
