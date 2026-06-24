import { getPeople, getTopics, loadAllReports } from "./archive";

export function getReportStaticParams(): Array<{ slug: string }> {
  return loadAllReports().map((report) => ({ slug: report.slug }));
}

export function encodeRouteName(name: string): string {
  return encodeURIComponent(name);
}

export function decodeRouteName(name: string): string {
  return decodeURIComponent(name);
}

export function getPeopleStaticParams(): Array<{ name: string }> {
  return getPeople(loadAllReports()).map((name) => ({ name: encodeRouteName(name) }));
}

export function getTopicStaticParams(): Array<{ name: string }> {
  return getTopics(loadAllReports()).map((name) => ({ name: encodeRouteName(name) }));
}
