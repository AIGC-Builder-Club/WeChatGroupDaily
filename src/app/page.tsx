import { ArchiveCalendar } from "@/components/archive-calendar";
import { loadAllReports } from "@/lib/archive";

export default function HomePage() {
  const reports = loadAllReports();

  return (
    <ArchiveCalendar reports={reports} />
  );
}
