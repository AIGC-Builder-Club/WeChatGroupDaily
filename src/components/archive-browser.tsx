"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { ReportMeta } from "@/lib/archive";

import styles from "./archive-browser.module.css";

type ArchiveBrowserProps = {
  reports: ReportMeta[];
  people: string[];
  topics: string[];
};

export function ArchiveBrowser({ reports, people, topics }: ArchiveBrowserProps) {
  const [query, setQuery] = useState("");
  const [person, setPerson] = useState("");
  const [topic, setTopic] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesQuery =
        normalizedQuery.length === 0 || report.searchText.toLowerCase().includes(normalizedQuery);
      const matchesPerson =
        person.length === 0 ||
        report.highlights.some((highlight) => highlight.name === person) ||
        report.stories.some((story) => story.cast.includes(person));
      const matchesTopic =
        topic.length === 0 ||
        report.highlights.some((highlight) => highlight.tag === topic) ||
        report.stories.some((story) => story.topic === topic);

      return matchesQuery && matchesPerson && matchesTopic;
    });
  }, [normalizedQuery, person, reports, topic]);

  const resetFilters = () => {
    setQuery("");
    setPerson("");
    setTopic("");
  };

  return (
    <section className={styles.archive} aria-label="日报归档">
      <div className={styles.controls}>
        <label className={styles.search}>
          <span>搜索</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Token、Falcon、浏览器..."
            type="search"
          />
        </label>

        <label>
          <span>人物</span>
          <select value={person} onChange={(event) => setPerson(event.target.value)}>
            <option value="">全部人物</option>
            {people.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>主题</span>
          <select value={topic} onChange={(event) => setTopic(event.target.value)}>
            <option value="">全部主题</option>
            {topics.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <button
          className={styles.reset}
          disabled={!query && !person && !topic}
          onClick={resetFilters}
          type="button"
        >
          重置
        </button>
      </div>

      <div className={styles.resultBar}>
        <span>
          {filteredReports.length} / {reports.length} 篇
        </span>
        <span>按日期倒序</span>
      </div>

      {filteredReports.length > 0 ? (
        <div className={styles.grid}>
          {filteredReports.map((report) => (
            <article className={styles.card} key={report.slug}>
              <div className={styles.cardTop}>
                <div>
                  <p className={styles.date}>{report.dateLabel}</p>
                  <h2>
                    <Link href={`/reports/${report.slug}`}>{report.title}</Link>
                  </h2>
                </div>
                <span className={report.hasScreenshot ? styles.pngOk : styles.pngMissing}>
                  {report.hasScreenshot ? "PNG" : "HTML"}
                </span>
              </div>

              <p className={styles.lead}>{report.leadText}</p>

              <div className={styles.metaRow}>
                <span>{report.stats.messages?.toLocaleString("zh-CN") ?? "-"} 条消息</span>
                <span>{report.stories.length} 个故事</span>
                <span>{report.highlights.length} 位高光人物</span>
              </div>

              <div className={styles.tags}>
                {report.stories.slice(0, 4).map((story) => (
                  <span key={`${report.slug}-${story.no}`}>{story.topic ?? story.title}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <p>没有匹配的日报。</p>
          <button onClick={resetFilters} type="button">
            清空筛选
          </button>
        </div>
      )}
    </section>
  );
}
