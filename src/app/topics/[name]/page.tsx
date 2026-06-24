import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArchiveCalendar } from "@/components/archive-calendar";
import { loadAllReports } from "@/lib/archive";
import { toArchiveCalendarEvents } from "@/lib/archive-calendar-events";
import { decodeRouteName, getTopicStaticParams } from "@/lib/report-static-params";

type TopicPageProps = {
  params: Promise<{
    name: string;
  }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getTopicStaticParams();
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { name } = await params;
  const decodedName = decodeRouteName(name);

  return {
    title: `${decodedName} · 群日报主题归档`,
    description: `奇奇怪怪养龙虾群日报中关于 ${decodedName} 的故事。`,
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { name } = await params;
  const decodedName = decodeRouteName(name);
  const reports = loadAllReports();
  const events = toArchiveCalendarEvents(reports);

  if (!events.some((event) => event.meta.topic === decodedName)) {
    notFound();
  }

  return (
    <ArchiveCalendar reports={reports} initialTopic={decodedName} />
  );
}
