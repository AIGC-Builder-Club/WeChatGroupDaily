import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import type { ReportAvatar, ReportHighlight } from "@/lib/archive";
import { getReportBySlug } from "@/lib/archive";
import { encodeRouteName, getReportStaticParams } from "@/lib/report-static-params";

import styles from "./page.module.css";

type ReportPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getReportStaticParams();
}

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { slug } = await params;
  const report = getReportBySlug(slug);

  if (!report) {
    return {
      title: "日报不存在",
    };
  }

  return {
    title: `${report.dateLabel} · ${report.title}`,
    description: report.leadText,
  };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { slug } = await params;
  const report = getReportBySlug(slug);

  if (!report) {
    notFound();
  }

  const screenshotHref = report.screenshotFilename
    ? `/archive/png/${encodeURIComponent(report.screenshotFilename)}`
    : undefined;

  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="日报导航">
        <Link href="/">← 返回日历</Link>
        {screenshotHref ? (
          <a download href={screenshotHref}>
            下载 PNG
          </a>
        ) : (
          <span>无 PNG 附件</span>
        )}
      </nav>

      <article className={styles.paper}>
        <header className={styles.masthead}>
          <div>
            <div className={styles.mastheadName}>{report.masthead.name}</div>
            {report.masthead.sub ? (
              <div className={styles.mastheadSub}>{report.masthead.sub}</div>
            ) : null}
          </div>
          <div className={styles.mastheadRight}>
            {report.masthead.issue ? <div>{report.masthead.issue}</div> : null}
            {report.masthead.date ? <p>{report.masthead.date}</p> : null}
          </div>
        </header>

        <section className={styles.lead}>
          <p className={styles.leadEyebrow}>{report.dateLabel}</p>
          <h1>{report.title}</h1>
          <p>{report.leadText}</p>
        </section>

        <div className={styles.sectionDivider}>Stories · 时间故事线</div>

        <section className={styles.storyTimeline} aria-label="故事列表">
          {report.stories.map((story) => (
            <article className={styles.story} id={story.anchorId} key={story.anchorId}>
              <div className={styles.storyMeta}>
                <span>{story.no}</span>
                {story.time ? <span>{story.time}</span> : null}
                {story.topic ? (
                  <Link href={`/topics/${encodeRouteName(story.topic)}`}>{story.topic}</Link>
                ) : null}
              </div>

              <h2>{story.title}</h2>

              <div className={styles.cast}>
                {story.participants.map((participant) => (
                  <Link
                    href={`/people/${encodeRouteName(participant.name)}`}
                    key={participant.name}
                  >
                    <AvatarBadge avatar={participant} />
                    <span>{participant.name}</span>
                  </Link>
                ))}
              </div>

              <p className={styles.storyText}>{story.summary}</p>

              {story.quotes.length > 0 ? (
                <div className={styles.storyQuotes}>
                  {story.quotes.map((quote) => (
                    <blockquote key={`${story.anchorId}-${quote.text}`}>
                      <p>{quote.text}</p>
                      {quote.attr ? <cite>{quote.attr}</cite> : null}
                    </blockquote>
                  ))}
                </div>
              ) : null}

              {story.output ? (
                <div className={styles.storyOutput}>
                  <span>Produced</span>
                  <strong>{story.output}</strong>
                </div>
              ) : null}
            </article>
          ))}
        </section>

        {report.highlights.length > 0 ? (
          <>
            <div className={styles.sectionDivider}>People · 高光人物</div>
            <section className={styles.highlights} aria-label="高光人物">
              {report.highlights.map((highlight) => (
                <HighlightCard highlight={highlight} key={`${highlight.name}-${highlight.tag}`} />
              ))}
            </section>
          </>
        ) : null}

        <footer className={styles.colophon}>
          <dl className={styles.colophonStats}>
            <Stat label="Messages" value={report.stats.messages?.toLocaleString("zh-CN")} />
            <Stat label="People" value={report.stats.people?.toLocaleString("zh-CN")} />
            <Stat label="Characters" value={report.stats.characters?.toLocaleString("zh-CN")} />
            <Stat label="Stories" value={report.stories.length.toLocaleString("zh-CN")} />
            <Stat label="Newcomer" value={report.stats.newcomers?.toLocaleString("zh-CN")} />
          </dl>

          {report.colophon.quote ? (
            <blockquote className={styles.colophonQuote}>
              <p>{report.colophon.quote}</p>
              {report.colophon.attr ? <cite>{report.colophon.attr}</cite> : null}
            </blockquote>
          ) : null}

          {report.colophon.meta ? <p className={styles.colophonMeta}>{report.colophon.meta}</p> : null}
        </footer>
      </article>
    </main>
  );
}

function HighlightCard({ highlight }: { highlight: ReportHighlight }) {
  return (
    <article className={styles.highlight}>
      <Link href={`/people/${encodeRouteName(highlight.name)}`}>
        <AvatarBadge avatar={highlight} />
        <strong>{highlight.name}</strong>
      </Link>
      {highlight.tag ? (
        <Link className={styles.highlightTag} href={`/topics/${encodeRouteName(highlight.tag)}`}>
          {highlight.tag}
        </Link>
      ) : null}
      {highlight.desc ? <p>{highlight.desc}</p> : null}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value ?? "-"}</dd>
    </div>
  );
}

function AvatarBadge({ avatar }: { avatar: Pick<ReportAvatar, "avatarInitials" | "avatarSrc"> }) {
  const style = avatar.avatarSrc ? { backgroundImage: `url(${avatar.avatarSrc})` } : undefined;

  return (
    <span
      className={avatar.avatarSrc ? styles.avatarImage : styles.avatarInitials}
      style={style}
    >
      {avatar.avatarSrc ? null : avatar.avatarInitials}
    </span>
  );
}
